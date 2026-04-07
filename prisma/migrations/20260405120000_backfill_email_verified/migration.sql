-- Comptes existants : accès conservé après introduction de la confirmation e-mail
UPDATE "users" SET "emailVerified" = true, "emailVerificationToken" = NULL;
