import { Injectable } from "@nestjs/common";
import { env } from "process";
import { PrismaService } from "src/prisma/prisma.service";
import Stripe from "stripe";

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
    private client: Stripe;

    constructor(private prismaService: PrismaService) {
        this.client = new Stripe(env.STRIPE_SECRET);
    }

    // ─── OUTILS INTERNES ─────────────────────────────────────────────────────

    private async createOrTake(userId: number): Promise<string> {
        const user = await this.prismaService.user.findUnique({ where: { id: userId } });

        if (user.stripeCustomerId) {
            // Vérifie que le customer existe toujours dans le compte Stripe courant.
            // S'il a été créé sur un autre compte (reset, changement de clés), on le recrée.
            try {
                const existing = await this.client.customers.retrieve(user.stripeCustomerId);
                if (existing && !(existing as Stripe.DeletedCustomer).deleted) {
                    return user.stripeCustomerId;
                }
            } catch {
                // "No such customer" ou réseau : on tombe sur la création ci-dessous.
            }
        }

        const customer = await this.client.customers.create({
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
        });

        await this.prismaService.user.update({
            where: { id: userId },
            data: { stripeCustomerId: customer.id },
        });

        return customer.id;
    }

    // ─── ENDPOINT PRINCIPAL ───────────────────────────────────────────────────

    /*
     * Le frontend fait UNE action Stripe (créer le paymentMethod) puis appelle cet endpoint.
     * Le backend s'occupe de tout : customer, sauvegarde carte, order, paiement.
     *
     * Retourne :
     *   { success: true, orderId }                          → paiement direct OK
     *   { requiresAction: true, clientSecret, orderId }     → 3D Secure requis
     */
    async checkout(
        userId: number,
        cartId: number,
        billingAddressId: number,
        stripePaymentMethodId: string,
        saveCard: boolean = true,
    ) {
        // 1. Customer Stripe
        const stripeCustomerId = await this.createOrTake(userId);

        // 2. Attacher la PM au customer et sauvegarder en base
        await this.client.paymentMethods.attach(stripePaymentMethodId, { customer: stripeCustomerId });
        const pm = await this.client.paymentMethods.retrieve(stripePaymentMethodId);

        if (saveCard) {
            const alreadySaved = await this.prismaService.paymentMethod.findFirst({
                where: { userId, providerToken: stripePaymentMethodId },
            });

            if (!alreadySaved) {
                const hasDefault = await this.prismaService.paymentMethod.count({ where: { userId, isDefault: true } });
                const card = pm.card;

                await this.prismaService.paymentMethod.create({
                    data: {
                        userId,
                        providerToken: stripePaymentMethodId,
                        cardHolderName: pm.billing_details.name ?? '',
                        last4Digits: card.last4,
                        cardBrand: card.brand,
                        expMonth: card.exp_month,
                        expYear: card.exp_year,
                        isDefault: hasDefault === 0,
                    },
                });
            }
        }

        // 3. Récupérer l'ID de la PaymentMethod en base pour la FK de l'Order
        const dbPaymentMethod = await this.prismaService.paymentMethod.findFirst({
            where: { userId, providerToken: stripePaymentMethodId },
        });

        // 4. Créer l'Order + OrderItems
        const cartItems = await this.prismaService.cartItem.findMany({
            where: { cartId },
            include: { product: true, subscriptionPlan: true },
        });

        if (cartItems.length === 0) throw new Error('Panier vide');

        const subtotal = cartItems.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0);
        const taxAmount = Math.round(subtotal * 0.2 * 100) / 100;
        const totalAmount = subtotal + taxAmount;

        const order = await this.prismaService.order.create({
            data: {
                userId,
                billingAddressId,
                paymentMethodId: dbPaymentMethod.id,
                orderNumber: `ORD-${Date.now()}`,
                subtotal,
                taxAmount,
                totalAmount,
                paymentProvider: 'stripe',
                items: {
                    create: cartItems.map(item => ({
                        productId: item.productId,
                        subscriptionPlanId: item.subscriptionPlanId,
                        productName: item.product.name,
                        planLabel: item.subscriptionPlan.label,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: Number(item.unitPrice) * item.quantity,
                    })),
                },
            },
        });

        // 5. Créer et confirmer le PaymentIntent
        const paymentIntent = await this.client.paymentIntents.create({
            amount: Math.round(totalAmount * 100), // en centimes
            currency: 'eur',
            customer: stripeCustomerId,
            payment_method: stripePaymentMethodId,
            confirm: true,
            automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
            metadata: { orderId: order.id },
        });

        // Sauvegarder le paymentIntentId sur l'Order
        await this.prismaService.order.update({
            where: { id: order.id },
            data: { paymentIntentId: paymentIntent.id },
        });

        // 6. Résultat
        if (paymentIntent.status === 'requires_action') {
            // 3D Secure requis → le frontend doit confirmer
            return { requiresAction: true, clientSecret: paymentIntent.client_secret, orderId: order.id };
        }

        return { success: true, orderId: order.id };
    }

    // Appelé par le frontend après validation 3D Secure
    async confirmAfter3DS(paymentIntentId: string) {
        const paymentIntent = await this.client.paymentIntents.retrieve(paymentIntentId);
        return { success: paymentIntent.status === 'succeeded' };
    }

    // ─── FLOW UNIFIÉ (CARTE + PAYPAL via PaymentElement) ───────────────────────
    /*
     * Crée un Order en statut PENDING et un PaymentIntent "ouvert" (sans paymentMethod).
     * Le frontend utilise ensuite <PaymentElement /> + stripe.confirmPayment() :
     *  - Carte bancaire : confirmation directe, pas de redirection
     *  - PayPal / 3DS   : redirection vers la page de retour (return_url)
     * Le webhook payment_intent.succeeded finalise la commande (Subscription + Invoice)
     * et sauvegarde la carte si saveCard = true.
     */
    async createIntent(
        userId: number,
        cartId: number,
        billingAddressId: number,
        saveCard: boolean = true,
    ) {
        const stripeCustomerId = await this.createOrTake(userId);

        // 1. Lecture du panier
        const cartItems = await this.prismaService.cartItem.findMany({
            where: { cartId },
            include: { product: true, subscriptionPlan: true },
        });
        if (cartItems.length === 0) throw new Error('Panier vide');

        // 2. Montants
        const subtotal = cartItems.reduce(
            (sum, item) => sum + Number(item.unitPrice) * item.quantity,
            0,
        );
        const taxAmount = Math.round(subtotal * 0.2 * 100) / 100;
        const totalAmount = subtotal + taxAmount;

        // 3. Order en PENDING (paymentMethodId nul — il sera renseigné par le webhook
        //    uniquement si le moyen de paiement final est une carte et que saveCard = true)
        const order = await this.prismaService.order.create({
            data: {
                userId,
                billingAddressId,
                orderNumber: `ORD-${Date.now()}`,
                subtotal,
                taxAmount,
                totalAmount,
                paymentProvider: 'stripe',
                items: {
                    create: cartItems.map((item) => ({
                        productId: item.productId,
                        subscriptionPlanId: item.subscriptionPlanId,
                        productName: item.product.name,
                        planLabel: item.subscriptionPlan.label,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: Number(item.unitPrice) * item.quantity,
                    })),
                },
            },
        });

        // 4. PaymentIntent "automatic methods" — Stripe expose CB, PayPal, etc.
        //    setup_future_usage permet à Stripe d'attacher la PM au customer (pour les
        //    cartes uniquement ; PayPal ignore cette option, ce qui ne pose pas de souci).
        const paymentIntent = await this.client.paymentIntents.create({
            amount: Math.round(totalAmount * 100),
            currency: 'eur',
            customer: stripeCustomerId,
            automatic_payment_methods: { enabled: true },
            setup_future_usage: saveCard ? 'off_session' : undefined,
            metadata: {
                orderId: String(order.id),
                saveCard: saveCard ? '1' : '0',
            },
        });

        await this.prismaService.order.update({
            where: { id: order.id },
            data: { paymentIntentId: paymentIntent.id },
        });

        return {
            clientSecret: paymentIntent.client_secret,
            orderId: order.id,
            amount: totalAmount,
        };
    }

    // ─── WEBHOOK STRIPE ───────────────────────────────────────────────────────

    async handleWebhook(rawBody: Buffer, signature: string) {
        let event: Stripe.Event;

        try {
            event = this.client.webhooks.constructEvent(
                rawBody,
                signature,
                env.STRIPE_WEBHOOK_SECRET,
            );
        } catch {
            throw new Error('Signature webhook invalide');
        }

        if (event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            const orderId = Number(paymentIntent.metadata?.orderId);
            if (!orderId) return { received: true };

            const order = await this.prismaService.order.findUnique({
                where: { id: orderId },
                include: { items: { include: { subscriptionPlan: true, subscription: true } } },
            });
            if (!order) return { received: true };

            // Idempotence : si la commande est déjà marquée PAID, on ignore (webhook rejoué)
            if (order.status === 'PAID') return { received: true };

            // 1. Sauvegarder la carte si demandé et si c'est bien une carte (PayPal est ignoré)
            const saveCard = paymentIntent.metadata?.saveCard === '1';
            let savedPaymentMethodId: number | undefined;

            if (saveCard && paymentIntent.payment_method) {
                try {
                    const pmId = typeof paymentIntent.payment_method === 'string'
                        ? paymentIntent.payment_method
                        : paymentIntent.payment_method.id;
                    const pm = await this.client.paymentMethods.retrieve(pmId);

                    if (pm.type === 'card' && pm.card) {
                        const exists = await this.prismaService.paymentMethod.findFirst({
                            where: { userId: order.userId, providerToken: pmId },
                        });
                        if (!exists) {
                            const hasDefault = await this.prismaService.paymentMethod.count({
                                where: { userId: order.userId, isDefault: true },
                            });
                            const created = await this.prismaService.paymentMethod.create({
                                data: {
                                    userId: order.userId,
                                    providerToken: pmId,
                                    cardHolderName: pm.billing_details?.name ?? '',
                                    last4Digits: pm.card.last4,
                                    cardBrand: pm.card.brand,
                                    expMonth: pm.card.exp_month,
                                    expYear: pm.card.exp_year,
                                    isDefault: hasDefault === 0,
                                },
                            });
                            savedPaymentMethodId = created.id;
                        } else {
                            savedPaymentMethodId = exists.id;
                        }
                    }
                } catch (err) {
                    console.warn('[webhook] Sauvegarde carte échouée:', err);
                }
            }

            // 2. Marquer la commande comme payée (+ lier la PM si sauvegardée)
            await this.prismaService.order.update({
                where: { id: orderId },
                data: {
                    status: 'PAID',
                    paidAt: new Date(),
                    ...(savedPaymentMethodId ? { paymentMethodId: savedPaymentMethodId } : {}),
                },
            });

            // 3. Créer les abonnements (uniquement ceux qui n'existent pas déjà)
            for (const item of order.items) {
                if (item.subscription) continue; // abonnement déjà créé (idempotence)
                const plan = item.subscriptionPlan;
                const startDate = new Date();
                const endDate = new Date(startDate);

                if (plan.billingCycle === 'YEARLY') {
                    endDate.setFullYear(endDate.getFullYear() + 1);
                } else {
                    endDate.setMonth(endDate.getMonth() + 1);
                }

                await this.prismaService.subscription.create({
                    data: {
                        userId: order.userId,
                        orderItemId: item.id,
                        productId: item.productId,
                        subscriptionPlanId: item.subscriptionPlanId,
                        status: 'ACTIVE',
                        startDate,
                        endDate,
                        nextRenewalDate: endDate,
                        autoRenew: true,
                    },
                });
            }

            // 4. Créer la facture si pas déjà présente
            const existingInvoice = await this.prismaService.invoice.findFirst({
                where: { orderId: order.id },
            });
            if (!existingInvoice) {
                await this.prismaService.invoice.create({
                    data: {
                        orderId: order.id,
                        userId: order.userId,
                        invoiceNumber: `INV-${Date.now()}`,
                        amount: order.totalAmount,
                        issuedAt: new Date(),
                    },
                });
            }
        }

        return { received: true };
    }
}
