import { Router } from 'express';
import { authenticateToken } from '../../../shared/middleware/authenticate.js';
import * as accountingController from '../controllers/accountingController.js';
import * as dashboardController from '../controllers/dashboardController.js';
import * as exportController from '../controllers/exportController.js';

const router = Router();

router.use(authenticateToken);

router.get('/dashboard', dashboardController.getDashboard);
router.get('/export/excel', exportController.exportAccounting);
router.get('/export/car-jobs', exportController.exportCarJobs);
router.get('/', accountingController.list);
router.get('/:id', accountingController.getById);
router.post('/:id/expense-items', accountingController.addExpenseItem);
router.patch(
  '/:id/expense-items/:itemId',
  accountingController.updateExpenseItem
);
router.delete(
  '/:id/expense-items/:itemId',
  accountingController.removeExpenseItem
);
router.patch('/:id/close', accountingController.closePeriod);
router.post('/recalculate-all', accountingController.recalculateAll);
router.patch('/:id/recalculate', accountingController.recalculate);

export default router;
