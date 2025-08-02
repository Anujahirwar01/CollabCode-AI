import { Router } from 'express';
import { body } from 'express-validator';
import * as projectController from '../controllers/project.controller.js';
import { authUser } from '../middleware/auth.middleware.js';

const router = Router();


router.post('/create',
    authUser,
    body('name').trim().notEmpty().withMessage('Project name is required and cannot be empty.'),
    projectController.createProject
);

// ✅ RESTORED: This now correctly calls your controller to get all projects.
router.get('/all',
    authUser,
    projectController.getAllProject
);

router.put('/add-user',
    authUser,
    body('projectId').trim().notEmpty().isMongoId().withMessage('A valid Project ID is required'),
    body('users').isArray({ min: 1 }).withMessage('Users must be an array with at least one user ID'),
    body('users.*').isMongoId().withMessage('Each item in the users array must be a valid ID'),
    projectController.addUserToProject
);

router.get('/get-project/:projectId',
    authUser,
    projectController.getProjectById
);

router.put('/update-file-tree',
    authUser,
    body('projectId').trim().notEmpty().isMongoId().withMessage('A valid Project ID is required'),
    body('fileTree').isObject().withMessage('A valid fileTree object is required'),
    projectController.updateFileTree
);

router.delete('/delete/:id',
    authUser,
    projectController.deleteProject
);

export default router;