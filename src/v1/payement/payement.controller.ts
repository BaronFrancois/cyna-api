import { Body, Controller, Post } from "@nestjs/common";
import { PayementService } from "./payement.service";

@Controller({ path: 'payement', version: '1' })
export class PayementController {
    constructor(private payementService: PayementService) {}

    /*
     * Endpoint principal : le frontend envoie le paymentMethodId Stripe + les infos commande.
     * Le backend gère tout (customer, carte, order, paiement).
     */
    @Post('checkout')
    async checkout(
        @Body('userId') userId: number,
        @Body('cartId') cartId: number,
        @Body('billingAddressId') billingAddressId: number,
        @Body('paymentMethodId') paymentMethodId: string, // pm_xxx de Stripe
        @Body('saveCard') saveCard: boolean,
    ) {
        return this.payementService.checkout(userId, cartId, billingAddressId, paymentMethodId, saveCard);
    }

    // Uniquement si 3D Secure requis (cas rare)
    @Post('confirm-3ds')
    async confirm3DS(@Body('paymentIntentId') paymentIntentId: string) {
        return this.payementService.confirmAfter3DS(paymentIntentId);
    }
}
