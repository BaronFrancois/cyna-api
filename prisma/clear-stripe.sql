-- Nettoie les références Stripe liées à l'ancien compte
-- À exécuter UNE FOIS après un changement de compte Stripe.

-- 1. Supprime les moyens de paiement sauvegardés (tokens invalides)
DELETE FROM payment_methods;

-- 2. Vide les customers Stripe sur les users (seront recréés à la volée)
UPDATE users SET "stripeCustomerId" = NULL WHERE "stripeCustomerId" IS NOT NULL;
