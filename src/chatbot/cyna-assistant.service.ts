import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { VitrineChatDto } from './dto/vitrine-chat.dto';

/** URL de la vitrine (même variable que CORS / liens e-mail : FRONTEND_URL). */
function getPublicVitrineUrl(): string {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
}

function getSystemPrompt(locale?: 'fr' | 'en'): string {
  const site = getPublicVitrineUrl();
  if (locale === 'en') {
    return `You are Cyna, a professional and helpful AI support assistant for a premium SaaS cybersecurity company.
Your tone is Apple-like: calm, concise, professional and reassuring.
You help users understand Cyna's offerings (EDR & Digital Workplace, 24/7 managed SOC, platform, CERT, pentest) as presented on this storefront.
Our public site URL for this deployment is: ${site}.
Critical rule: never send users to cyna-it.fr or any other external domain to browse offers, sign up, or get support for this app. When a link is useful, use only "${site}", or say "this website" / "our storefront".
Always reply in English. Keep answers short and well formatted.`;
  }
  return `Tu es Cyna, un assistant support IA professionnel et utile pour une entreprise de cybersécurité SaaS premium.
Ton ton est à la Apple : calme, concis, professionnel et rassurant.
Tu aides les utilisateurs à comprendre les offres Cyna (EDR & Digital Workplace, SOC managé 24/7, plateforme, CERT, pentest) telles qu'elles sont présentées sur cette vitrine.
L'URL publique de cette vitrine est : ${site}.
Règle impérative : ne renvoie jamais vers cyna-it.fr ni vers un autre domaine externe pour découvrir les offres, s'inscrire ou obtenir du support dans le cadre de cette application. Quand un lien est utile, utilise uniquement "${site}", ou parle de « ce site » / « notre vitrine ».
Réponds toujours en Français. Garde les réponses courtes et bien formatées.`;
}

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';

type GeminiHistoryPart = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

function buildGroqMessages(
  message: string,
  history: GeminiHistoryPart[],
  locale?: 'fr' | 'en',
) {
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] =
    [{ role: 'system', content: getSystemPrompt(locale).trim() }];

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
    const { message, history, locale } = dto;
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
        ? await this.chatWithGroq(message, history ?? [], locale)
        : await this.chatWithGemini(message, history ?? [], locale);
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
    locale?: 'fr' | 'en',
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
        messages: buildGroqMessages(message, history, locale),
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
    locale?: 'fr' | 'en',
  ): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY manquante');

    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: getSystemPrompt(locale),
      },
      history,
    });

    const result = await chat.sendMessage({ message });
    const text = result.text;
    if (!text) throw new Error('Réponse vide');
    return text;
  }
}
