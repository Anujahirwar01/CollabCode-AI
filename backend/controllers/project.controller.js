import * as projectService from '../services/project.service.js';
import { validationResult } from 'express-validator';

/**
 * Helper function to recursively trim all keys in the file tree object.
 * This prevents saving filenames with leading/trailing whitespace.
 */
function trimFileTreeKeys(tree) {
    if (!tree || typeof tree !== 'object') return tree;

    return Object.keys(tree).reduce((acc, key) => {
        const trimmedKey = key.trim(); // Trim the current key
        acc[trimmedKey] = trimFileTreeKeys(tree[key]); // Recurse for the nested object
        return acc;
    }, {});
}

/*
NOTE: All functions below assume your authentication middleware has been updated
to find the user and attach their ID to the request, like: req.userId = user._id;
This avoids repetitive database lookups in every controller function.
*/

export const createProject = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name } = req.body;
        // Assumes auth middleware provides req.userId
        const newProject = await projectService.createProject({ name, userId: req.userId });
        res.status(201).json(newProject);
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
};

export const getAllProject = async (req, res) => {
    try {
        // Assumes auth middleware provides req.userId
        const allUserProjects = await projectService.getAllProjectByUserId({ userId: req.userId });
        return res.status(200).json({ projects: allUserProjects });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
};

export const addUserToProject = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId, users } = req.body;
        // Assumes auth middleware provides req.userId for authorization in the service
        const project = await projectService.addUsersToProject({
            projectId,
            users,
            userId: req.userId
        });
        return res.status(200).json({ project });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
};

export const getProjectById = async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = await projectService.getProjectById({ projectId });
        return res.status(200).json({ project });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
};

export const updateFileTree = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { projectId, fileTree } = req.body;
        
        // ✅ **THE FIX**: Sanitize the fileTree object before passing it to the service.
        const sanitizedFileTree = trimFileTreeKeys(fileTree);

        const project = await projectService.updateFileTree({
            projectId,
            fileTree: sanitizedFileTree
        });

        return res.status(200).json({ project });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: err.message });
    }
};

export const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;
        // Assumes auth middleware provides req.userId
        await projectService.deleteProject({
            projectId: id,
            userId: req.userId
        });
        res.status(200).json({ message: 'Project deleted successfully' });
    } catch (err) {
        console.error(err);
        if (err.message === 'Project not found') {
            return res.status(404).json({ error: err.message });
        }
        if (err.message === 'User not authorized to delete this project') {
            return res.status(403).json({ error: err.message });
        }
        res.status(500).json({ error: 'Server error while deleting project' });
    }
};