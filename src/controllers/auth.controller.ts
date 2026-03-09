import { loginUser, registerUser, forgotPasswordService, resetPasswordService } from '../services/auth.service';

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    res.status(400).json({ message: 'Email, code et nouveau mot de passe sont requis.' });
    return;
  }

  try {
    await resetPasswordService(email, code, newPassword);
    res.status(200).json({ message: 'Mot de passe réinitialisé avec succès.' });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};