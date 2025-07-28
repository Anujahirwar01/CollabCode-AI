import { Router } from 'express';
import { getMessagesByProjectId } from '../controllers/message.controller.js';
import { authUser } from '../middleware/auth.middleware.js';

const router = Router();

// This line creates the GET /messages/:projectId route
router.get('/:projectId', authUser, getMessagesByProjectId);

export default router;