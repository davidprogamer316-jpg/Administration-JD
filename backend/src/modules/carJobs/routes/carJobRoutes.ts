import { Router } from 'express';
import { authenticateToken } from '../../../shared/middleware/authenticate.js';
import * as carJobController from '../controllers/carJobController.js';

const router = Router();

router.use(authenticateToken);

router.get('/', carJobController.list);
router.get('/:id', carJobController.getById);
router.post('/', carJobController.create);
router.patch('/:id', carJobController.update);
router.delete('/:id', carJobController.remove);

export default router;
