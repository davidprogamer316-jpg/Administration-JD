import { Router } from 'express';
import { authenticateToken } from '../../../shared/middleware/authenticate.js';
import quoteController from '../controllers/quoteController.js';

const quoteRoutes = Router();

quoteRoutes.use(authenticateToken);
quoteRoutes.use(quoteController);

export default quoteRoutes;
