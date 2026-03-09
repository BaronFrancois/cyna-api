import prisma from '../../prisma';
import bcrypt from 'bcrypt';

export const resetPasswordService = async (
  email: string,
  code: string,
  newPassword: string
): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) throw new Error('Utilisateur introuvable.');
  if (user.resetPasswordCode !== code) throw new Error('Code de réinitialisation invalide.');
  if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
    throw new Error('Le code de réinitialisation a expiré.');
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { email },
    data: {
      password: hashedPassword,
      resetPasswordCode: null,
      resetPasswordExpires: null,
    },
  });
};