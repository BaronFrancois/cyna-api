export interface ChatbotRule {
  keywords: string[];
  response: string;
  escalate?: boolean;
}

export const CHATBOT_RULES: ChatbotRule[] = [
  // ─── Salutations ──────────────────────────────────────────────
  {
    keywords: ['bonjour', 'salut', 'hello', 'bonsoir', 'hey', 'hi', 'coucou'],
    response:
      'Bonjour ! Je suis l\'assistant virtuel de Cyna. Comment puis-je vous aider aujourd\'hui ?',
  },

  // ─── Tarifs / Prix ────────────────────────────────────────────
  {
    keywords: ['prix', 'tarif', 'tarification', 'coût', 'combien', 'abonnement', 'forfait', 'offre'],
    response:
      'Nos tarifs varient selon les produits et les plans souscrits (mensuel, annuel, par utilisateur...). Vous pouvez consulter l\'ensemble de notre catalogue sur notre site. Avez-vous un produit particulier en tête ?',
  },

  // ─── Commandes ────────────────────────────────────────────────
  {
    keywords: ['commande', 'suivi', 'livraison', 'achat', 'commander', 'panier'],
    response:
      'Pour suivre ou gérer votre commande, connectez-vous à votre espace client et rendez-vous dans la section "Mes commandes". Besoin d\'aide supplémentaire ?',
  },

  // ─── Abonnements ──────────────────────────────────────────────
  {
    keywords: ['abonnement', 'renouvellement', 'résiliation', 'résilier', 'annuler abonnement'],
    response:
      'Vous pouvez gérer vos abonnements directement depuis votre espace client > "Mes abonnements". La résiliation prend effet à la fin de la période en cours.',
  },

  // ─── Paiement ─────────────────────────────────────────────────
  {
    keywords: ['paiement', 'payer', 'facturation', 'facture', 'carte', 'virement', 'remboursement', 'rembourser'],
    response:
      'Pour toute question relative à un paiement ou un remboursement, notre équipe comptable peut vous aider. Souhaitez-vous être mis en contact avec un agent ?',
  },

  // ─── Problème technique ───────────────────────────────────────
  {
    keywords: ['problème', 'bug', 'erreur', 'panne', 'ne fonctionne pas', 'bloqué', 'impossible', 'dysfonctionnement'],
    response:
      'Je suis désolé d\'apprendre que vous rencontrez un problème technique. Pouvez-vous me décrire précisément ce qui se passe ? Je vais essayer de vous aider ou vous mettre en contact avec notre support.',
  },

  // ─── Mot de passe / Compte ────────────────────────────────────
  {
    keywords: ['mot de passe', 'connexion', 'compte', 'accès', 'identifiant', 'email', 'profil'],
    response:
      'Pour réinitialiser votre mot de passe, cliquez sur "Mot de passe oublié" sur la page de connexion. Si votre compte est bloqué, notre support peut vous débloquer rapidement.',
  },

  // ─── Produits / Services ──────────────────────────────────────
  {
    keywords: ['produit', 'service', 'logiciel', 'solution', 'fonctionnalité', 'caractéristique'],
    response:
      'Nous proposons une large gamme de solutions de cybersécurité. Consultez notre catalogue pour découvrir tous nos produits et leurs fonctionnalités. Y a-t-il une solution spécifique qui vous intéresse ?',
  },

  // ─── Délais / Livraison ───────────────────────────────────────
  {
    keywords: ['délai', 'quand', 'disponible', 'disponibilité', 'attente'],
    response:
      'L\'accès à nos services est généralement immédiat après validation du paiement. Si vous attendez toujours votre accès, vérifiez vos emails ou contactez notre support.',
  },

  // ─── Escalade vers agent ──────────────────────────────────────
  {
    keywords: ['agent', 'humain', 'personne', 'conseiller', 'support', 'assistance', 'aide', 'parler à'],
    response:
      'Je vous transfère vers un agent humain. Notre équipe vous contactera dans les plus brefs délais. Vous pouvez également nous joindre via le formulaire de contact.',
    escalate: true,
  },

  // ─── Au revoir ────────────────────────────────────────────────
  {
    keywords: ['au revoir', 'bye', 'à bientôt', 'merci', 'bonne journée', 'bonne soirée', 'ciao'],
    response:
      'Merci d\'avoir contacté le support Cyna. N\'hésitez pas à revenir si vous avez d\'autres questions. Bonne journée !',
  },
];

export const DEFAULT_RESPONSE =
  'Je n\'ai pas bien compris votre demande. Pouvez-vous reformuler ? Vous pouvez aussi demander à parler à un agent humain en tapant "agent".';

export function getAutoResponse(userMessage: string): { response: string; escalate: boolean } {
  const normalized = userMessage.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  for (const rule of CHATBOT_RULES) {
    const matched = rule.keywords.some((kw) => {
      const normalizedKw = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalized.includes(normalizedKw);
    });

    if (matched) {
      return { response: rule.response, escalate: rule.escalate ?? false };
    }
  }

  return { response: DEFAULT_RESPONSE, escalate: false };
}
