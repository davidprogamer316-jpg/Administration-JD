import { Router } from 'express';
import { authenticateToken } from '../../../shared/middleware/authenticate.js';
import * as fixedExpenseController from '../controllers/fixedExpenseController.js';

const router = Router();

router.use(authenticateToken);

router.get('/', fixedExpenseController.list);
router.post('/', fixedExpenseController.create);
router.patch('/:id', fixedExpenseController.update);
router.delete('/:id', fixedExpenseController.remove);

export default router;
