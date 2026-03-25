import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@cyna.fr';
  const password = 'Admin1234!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ Admin déjà existant : ${email}`);
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  const admin = await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'Cyna',
      email,
      password: hashed,
      role: Role.ADMIN,
    },
  });

  console.log(`✓ Admin créé : ${admin.email} (id: ${admin.id})`);
  console.log(`  Email    : ${email}`);
  console.log(`  Password : ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
