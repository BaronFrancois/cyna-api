import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // ─── Admin ───────────────────────────────────────────────────────────────
  const adminEmail = 'admin@cyna.fr';
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    const hashed = await bcrypt.hash('Admin1234!', 10);
    const admin = await prisma.user.create({
      data: { firstName: 'Admin', lastName: 'Cyna', email: adminEmail, passwordHash: hashed, role: Role.ADMIN },
    });
    console.log(`✓ Admin créé : ${admin.email}`);
  } else {
    console.log(`✓ Admin déjà existant : ${adminEmail}`);
  }

  // ─── Catégories ──────────────────────────────────────────────────────────
  const categories = [
    { name: 'EDR', slug: 'edr', description: 'Endpoint Detection & Response' },
    { name: 'XDR', slug: 'xdr', description: 'Extended Detection & Response' },
    { name: 'SOC', slug: 'soc', description: 'Security Operations Center' },
    { name: 'Cloud', slug: 'cloud', description: 'Cloud Security' },
    { name: 'Network', slug: 'network', description: 'Network Security' },
  ];

  const categoryMap: Record<string, number> = {};
  for (const cat of categories) {
    const c = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    categoryMap[cat.slug] = c.id;
    console.log(`✓ Catégorie : ${c.name}`);
  }

  // ─── Produits + Plans ────────────────────────────────────────────────────
  const products = [
    {
      slug: 'cyna-edr-pro',
      name: 'Cyna EDR Pro',
      shortDescription: 'Détection et réponse avancées pour les terminaux.',
      basePrice: 19.99,
      categorySlug: 'edr',
      plans: [
        { label: 'Mensuel', billingCycle: 'MONTHLY' as const, price: 19.99 },
        { label: 'Annuel', billingCycle: 'YEARLY' as const, price: 199.99 },
      ],
    },
    {
      slug: 'cyna-xdr-max',
      name: 'Cyna XDR Max',
      shortDescription: 'Détection unifiée inter-couches.',
      basePrice: 49.99,
      categorySlug: 'xdr',
      plans: [
        { label: 'Mensuel', billingCycle: 'MONTHLY' as const, price: 49.99 },
        { label: 'Annuel', billingCycle: 'YEARLY' as const, price: 499.99 },
      ],
    },
    {
      slug: 'cyna-soc-managed',
      name: 'SOC Managé',
      shortDescription: 'Service de surveillance expert 24/7.',
      basePrice: 999.00,
      categorySlug: 'soc',
      plans: [
        { label: 'Mensuel', billingCycle: 'MONTHLY' as const, price: 999.00 },
        { label: 'Annuel', billingCycle: 'YEARLY' as const, price: 9990.00 },
      ],
    },
    {
      slug: 'cyna-cloud-shield',
      name: 'Cloud Shield',
      shortDescription: 'Sécurisez votre environnement multi-cloud.',
      basePrice: 29.99,
      categorySlug: 'cloud',
      plans: [
        { label: 'Mensuel', billingCycle: 'MONTHLY' as const, price: 29.99 },
        { label: 'Annuel', billingCycle: 'YEARLY' as const, price: 299.99 },
      ],
    },
    {
      slug: 'cyna-net-sentry',
      name: 'Net Sentry',
      shortDescription: 'Analyse du trafic réseau nouvelle génération.',
      basePrice: 349.00,
      categorySlug: 'network',
      plans: [
        { label: 'Annuel', billingCycle: 'YEARLY' as const, price: 349.00 },
        { label: 'Mensuel', billingCycle: 'MONTHLY' as const, price: 39.99 },
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

  console.log('\n✅ Seed terminé.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
