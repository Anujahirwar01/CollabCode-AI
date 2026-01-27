import { Router } from 'express';
import * as aiController from '../controllers/ai.controller.js';
import * as authMiddleware from '../middleware/auth.middleware.js';
const router = Router();

router.get('/get-result', aiController.getResult);

// New AI assistance routes
router.post('/code-help', authMiddleware.authUser, aiController.getCodeHelp);
router.post('/debug', authMiddleware.authUser, aiController.debugCode);
router.post('/optimize', authMiddleware.authUser, aiController.optimizeCode);

export default router;