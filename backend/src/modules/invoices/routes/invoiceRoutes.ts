import { Router } from 'express';
import { authenticateToken } from '../../../shared/middleware/authenticate.js';
import * as controller from '../controllers/invoiceController.js';

const router = Router();
router.use(authenticateToken);

router.get('/', controller.list);
router.get('/:id', controller.getById);
router.get('/:id/pdf', controller.downloadPdf);
router.post('/', controller.create);
router.delete('/:id', controller.remove);

export default router;
