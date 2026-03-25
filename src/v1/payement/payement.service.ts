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

        if (user.stripeCustomerId) return user.stripeCustomerId;

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
                include: { items: { include: { subscriptionPlan: true } } },
            });
            if (!order) return { received: true };

            // Marquer la commande comme payée
            await this.prismaService.order.update({
                where: { id: orderId },
                data: { status: 'PAID', paidAt: new Date() },
            });

            // Créer les abonnements pour chaque ligne de commande
            for (const item of order.items) {
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

            // Créer la facture
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

        return { received: true };
    }
}
