"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcrypt = require("bcrypt");
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    const adminEmail = 'admin@cyna.fr';
    const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
        const hashed = await bcrypt.hash('Admin1234!', 10);
        const admin = await prisma.user.create({
            data: { firstName: 'Admin', lastName: 'Cyna', email: adminEmail, passwordHash: hashed, role: client_1.Role.ADMIN },
        });
        console.log(`✓ Admin créé : ${admin.email}`);
    }
    else {
        console.log(`✓ Admin déjà existant : ${adminEmail}`);
    }
    const categories = [
        {
            name: 'EDR',
            slug: 'edr',
            description: 'Endpoint Detection & Response',
            displayOrder: 0,
            imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80',
        },
        {
            name: 'XDR',
            slug: 'xdr',
            description: 'Extended Detection & Response',
            displayOrder: 1,
            imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
        },
        {
            name: 'SOC',
            slug: 'soc',
            description: 'Security Operations Center',
            displayOrder: 2,
            imageUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=600&q=80',
        },
        {
            name: 'Cloud',
            slug: 'cloud',
            description: 'Cloud Security',
            displayOrder: 3,
            imageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
        },
        {
            name: 'Network',
            slug: 'network',
            description: 'Network Security',
            displayOrder: 4,
            imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a5802146f?auto=format&fit=crop&w=600&q=80',
        },
    ];
    const categoryMap = {};
    for (const cat of categories) {
        const c = await prisma.category.upsert({
            where: { slug: cat.slug },
            update: {
                imageUrl: cat.imageUrl,
                displayOrder: cat.displayOrder,
                description: cat.description,
            },
            create: cat,
        });
        categoryMap[cat.slug] = c.id;
        console.log(`✓ Catégorie : ${c.name}`);
    }
    const carouselSlides = [
        {
            imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a5802146f?auto=format&fit=crop&w=1200&q=80',
            title: 'Nouvelle gamme cyber 2026',
            subtitle: 'Découvrez nos offres pour sécuriser votre entreprise avec une approche XDR intégrée.',
            linkUrl: '/catalog',
            displayOrder: 0,
        },
        {
            imageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=1200&q=80',
            title: 'SOC managé 24/7',
            subtitle: 'Nos experts veillent sur votre système d’information jour et nuit.',
            linkUrl: '/product/cyna-soc-managed',
            displayOrder: 1,
        },
        {
            imageUrl: 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?auto=format&fit=crop&w=1200&q=80',
            title: 'Audit et pentest',
            subtitle: 'Évaluez votre résilience avant qu’un acteur malveillant ne le fasse à votre place.',
            linkUrl: '/support#contact',
            displayOrder: 2,
        },
    ];
    for (const slide of carouselSlides) {
        const existing = await prisma.carouselItem.findFirst({
            where: { displayOrder: slide.displayOrder },
        });
        if (existing) {
            await prisma.carouselItem.update({
                where: { id: existing.id },
                data: slide,
            });
        }
        else {
            await prisma.carouselItem.create({ data: { ...slide, isActive: true } });
        }
    }
    console.log('✓ Carrousel accueil');
    await prisma.homeTextBlock.upsert({
        where: { identifier: 'home_intro' },
        update: {
            content: JSON.stringify({
                title: 'Votre partenaire de confiance en cybersécurité',
                body: "Bienvenue chez Cyna. Nous vous proposons une suite complète d'outils et de services pour protéger vos infrastructures. De la sécurisation de vos endpoints avec notre EDR jusqu'à un pilotage consolidé de votre SOC, nous avons la solution adaptée à vos besoins. Découvrez nos offres et gardez un temps d'avance sur les menaces.",
            }),
        },
        create: {
            identifier: 'home_intro',
            content: JSON.stringify({
                title: 'Votre partenaire de confiance en cybersécurité',
                body: "Bienvenue chez Cyna. Nous vous proposons une suite complète d'outils et de services pour protéger vos infrastructures. De la sécurisation de vos endpoints avec notre EDR jusqu'à un pilotage consolidé de votre SOC, nous avons la solution adaptée à vos besoins. Découvrez nos offres et gardez un temps d'avance sur les menaces.",
            }),
        },
    });
    console.log('✓ Bloc texte accueil (home_intro)');
    const products = [
        {
            slug: 'cyna-edr-pro',
            name: 'Cyna EDR Pro',
            shortDescription: 'Détection et réponse avancées pour les terminaux.',
            basePrice: 19.99,
            categorySlug: 'edr',
            plans: [
                { label: 'Mensuel', billingCycle: 'MONTHLY', price: 19.99 },
                { label: 'Annuel', billingCycle: 'YEARLY', price: 199.99 },
            ],
        },
        {
            slug: 'cyna-xdr-max',
            name: 'Cyna XDR Max',
            shortDescription: 'Détection unifiée inter-couches.',
            basePrice: 49.99,
            categorySlug: 'xdr',
            plans: [
                { label: 'Mensuel', billingCycle: 'MONTHLY', price: 49.99 },
                { label: 'Annuel', billingCycle: 'YEARLY', price: 499.99 },
            ],
        },
        {
            slug: 'cyna-soc-managed',
            name: 'SOC Managé',
            shortDescription: 'Service de surveillance expert 24/7.',
            basePrice: 999.00,
            categorySlug: 'soc',
            plans: [
                { label: 'Mensuel', billingCycle: 'MONTHLY', price: 999.00 },
                { label: 'Annuel', billingCycle: 'YEARLY', price: 9990.00 },
            ],
        },
        {
            slug: 'cyna-cloud-shield',
            name: 'Cloud Shield',
            shortDescription: 'Sécurisez votre environnement multi-cloud.',
            basePrice: 29.99,
            categorySlug: 'cloud',
            plans: [
                { label: 'Mensuel', billingCycle: 'MONTHLY', price: 29.99 },
                { label: 'Annuel', billingCycle: 'YEARLY', price: 299.99 },
            ],
        },
        {
            slug: 'cyna-net-sentry',
            name: 'Net Sentry',
            shortDescription: 'Analyse du trafic réseau nouvelle génération.',
            basePrice: 349.00,
            categorySlug: 'network',
            plans: [
                { label: 'Annuel', billingCycle: 'YEARLY', price: 349.00 },
                { label: 'Mensuel', billingCycle: 'MONTHLY', price: 39.99 },
            ],
        },
    ];
    for (const p of products) {
        const product = await prisma.product.upsert({
            where: { slug: p.slug },
            update: {},
            create: {
                slug: p.slug,
                name: p.name,
                shortDescription: p.shortDescription,
                basePrice: p.basePrice,
                categoryId: categoryMap[p.categorySlug],
                isAvailable: true,
            },
        });
        for (const plan of p.plans) {
            await prisma.subscriptionPlan.upsert({
                where: { id: (await prisma.subscriptionPlan.findFirst({ where: { productId: product.id, billingCycle: plan.billingCycle } }))?.id ?? 0 },
                update: {},
                create: {
                    productId: product.id,
                    label: plan.label,
                    billingCycle: plan.billingCycle,
                    price: plan.price,
                    isActive: true,
                },
            });
        }
        console.log(`✓ Produit : ${product.name}`);
    }
    await prisma.product.updateMany({
        where: { slug: { in: ['cyna-edr-pro', 'cyna-xdr-max', 'cyna-soc-managed'] } },
        data: { isFeatured: true, priorityOrder: 0 },
    });
    await prisma.product.updateMany({
        where: {
            slug: { notIn: ['cyna-edr-pro', 'cyna-xdr-max', 'cyna-soc-managed'] },
        },
        data: { isFeatured: false },
    });
    console.log('✓ Produits vedettes (EDR, XDR, SOC)');
    const imageBySlug = {
        'cyna-edr-pro': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
        'cyna-xdr-max': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
        'cyna-soc-managed': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
        'cyna-cloud-shield': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80',
        'cyna-net-sentry': 'https://images.unsplash.com/photo-1544197150-b99a5802146f?auto=format&fit=crop&w=800&q=80',
    };
    for (const [slug, imageUrl] of Object.entries(imageBySlug)) {
        const p = await prisma.product.findUnique({ where: { slug } });
        if (!p)
            continue;
        const count = await prisma.productImage.count({ where: { productId: p.id } });
        if (count === 0) {
            await prisma.productImage.create({
                data: { productId: p.id, imageUrl, displayOrder: 0, altText: p.name },
            });
        }
    }
    console.log('✓ Images produits');
    console.log('\n✅ Seed terminé.');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map