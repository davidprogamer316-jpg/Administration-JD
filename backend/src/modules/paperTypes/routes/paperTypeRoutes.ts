import { Router } from 'express';
import { authenticateToken } from '../../../shared/middleware/authenticate.js';
import * as paperTypeController from '../controllers/paperTypeController.js';

const router = Router();

router.use(authenticateToken);

router.get('/', paperTypeController.list);
router.post('/', paperTypeController.create);
router.patch('/:id', paperTypeController.update);
router.patch('/:id/toggle-active', paperTypeController.toggleActive);

export default router;
