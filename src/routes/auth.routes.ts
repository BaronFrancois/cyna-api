import express from 'express';
import { login, register, forgotPassword, resetPassword } from '../controllers/auth.controller';

const router = express.Router();

router.post('/reset-password', resetPassword);

export default router;