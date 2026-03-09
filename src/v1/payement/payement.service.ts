import { Injectable } from "@nestjs/common";

@Injectable()
export class PayementService {
    /* 
        Cycle de paiement
        Etape 1: Crée ou récupére customer
        Etape 2: Sauvgarder une méthode de paiment si accepte
        Etape 3: Crée un Ordre de base et le remplir
        Etape 4: Crée et confirmer le PayementIntent
        Etape 5: WebHook Stripe ( important sinon aucun paiement fonctionnel )
        Etape 6: Crée l'abonnement et la facture
    */
}