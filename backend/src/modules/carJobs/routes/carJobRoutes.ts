import { Router } from 'express';
import { authenticateToken } from '../../../shared/middleware/authenticate';
import * as carJobController from '../controllers/carJobController';

const router = Router();

router.use(authenticateToken);

router.get('/', carJobController.list);
router.get('/:id', carJobController.getById);
router.post('/', carJobController.create);
router.patch('/:id', carJobController.update);
router.delete('/:id', carJobController.remove);

export default router;
