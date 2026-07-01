import { Router } from 'express';
import { authenticateToken } from '../../../shared/middleware/authenticate';
import * as accountingController from '../controllers/accountingController';
import * as dashboardController from '../controllers/dashboardController';
import * as exportController from '../controllers/exportController';

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
router.patch('/:id/recalculate', accountingController.recalculate);

export default router;
