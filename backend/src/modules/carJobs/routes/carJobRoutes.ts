import { Router } from 'express';
import { authenticateToken } from '../../../shared/middleware/authenticate.js';
import * as carJobController from '../controllers/carJobController.js';

const router = Router();

router.use(authenticateToken);

router.get('/', carJobController.list);
router.get('/grouped', carJobController.listGrouped);
router.get('/:id', carJobController.getById);
router.post('/', carJobController.create);
router.patch('/:id', carJobController.update);
router.patch('/:id/deactivate', carJobController.deactivate);

export default router;
