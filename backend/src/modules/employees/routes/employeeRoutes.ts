import { Router } from 'express';
import { authenticateToken } from '../../../shared/middleware/authenticate.js';
import * as employeeController from '../controllers/employeeController.js';
import * as pdfController from '../controllers/pdfController.js';

const router = Router();

router.use(authenticateToken);

router.get('/', employeeController.list);
router.get('/:id/pdf', pdfController.downloadEmployeePdf);
router.get('/:id', employeeController.getById);
router.post('/', employeeController.create);
router.patch('/:id', employeeController.update);
router.patch('/:id/toggle-active', employeeController.toggleActive);
router.delete('/:id', employeeController.remove);

export default router;
