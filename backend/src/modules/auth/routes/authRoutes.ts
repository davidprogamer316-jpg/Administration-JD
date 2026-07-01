import { Router } from 'express';
import { authenticateToken } from '../../../shared/middleware/authenticate.js';
import * as authController from '../controllers/authController.js';

const router = Router();

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.getMe);
router.post('/unlock', authenticateToken, authController.unlock);
router.post('/change-password', authenticateToken, authController.changePassword);

export default router;
