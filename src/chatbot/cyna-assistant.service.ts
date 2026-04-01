import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { VitrineChatDto } from './dto/vitrine-chat.dto';

const CYNA_SYSTEM = `Tu es Cyna, un assistant support IA professionnel et utile pour une entreprise de cybersécurité SaaS premium.
Ton ton est à la Apple : calme, concis, professionnel et rassurant.
Tu aides les utilisateurs à comprendre les offres Cyna (EDR & Digital Workplace, SOC managé 24/7, plateforme, CERT, pentest) alignées sur cyna-it.fr.
Réponds toujours en Français. Garde les réponses courtes et bien formatées.`;

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

type GeminiHistoryPart = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

function buildGroqMessages(message: string, history: GeminiHistoryPart[]) {
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] =
    [{ role: 'system', content: CYNA_SYSTEM.trim() }];

  for (const h of history ?? []) {
    const text = h.parts?.[0]?.text?.trim();
    if (!text) continue;
    if (h.role === 'user') {
      messages.push({ role: 'user', content: text });
    } else if (h.role === 'model') {
      messages.push({ role: 'assistant', content: text });
    }
  }

  messages.push({ role: 'user', content: message });
  return messages;
}

@Injectable()
export class CynaAssistantService {
  private readonly logger = new Logger(CynaAssistantService.name);

  async reply(dto: VitrineChatDto): Promise<{ text: string }> {
    const { message, history } = dto;
    if (!message?.trim()) {
      throw new BadRequestException('Message requis.');
    }

    const hasGroq = Boolean(process.env.GROQ_API_KEY);
    const hasGemini = Boolean(process.env.GEMINI_API_KEY);

    if (!hasGroq && !hasGemini) {
      throw new InternalServerErrorException(
        'Aucune clé API configurée (GROQ_API_KEY ou GEMINI_API_KEY).',
      );
    }

    try {
      const text = hasGroq
        ? await this.chatWithGroq(message, history ?? [])
        : await this.chatWithGemini(message, history ?? []);
      return { text };
    } catch (err) {
      this.logger.error('Assistant LLM', err);
      throw new InternalServerErrorException(
        "J'ai du mal à me connecter au serveur sécurisé pour le moment. Veuillez réessayer plus tard.",
      );
    }
  }

  private async chatWithGroq(
    message: string,
    history: GeminiHistoryPart[],
  ): Promise<string> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY manquante');

    const model = process.env.GROQ_MODEL?.trim() || 'llama-3.1-8b-instant';

    const res = await fetch(GROQ_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: buildGroqMessages(message, history),
        temperature: 0.35,
        max_tokens: 1024,
      }),
    });

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };

    if (!res.ok) {
      this.logger.error(`Groq API ${res.status}`, data);
      throw new Error(data.error?.message || 'Groq error');
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error('Réponse vide');
    return text;
  }

  private async chatWithGemini(
    message: string,
    history: GeminiHistoryPart[],
  ): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY manquante');

    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: CYNA_SYSTEM,
      },
      history,
    });

    const result = await chat.sendMessage({ message });
    const text = result.text;
    if (!text) throw new Error('Réponse vide');
    return text;
  }
}
