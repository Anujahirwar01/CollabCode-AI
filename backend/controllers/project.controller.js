import * as projectService from '../services/project.service.js';
import { validationResult } from 'express-validator';
import projectModel from '../models/project.model.js';
import { getProjectByIds } from '../services/project.service.js';


function trimFileTreeKeys(tree) {
    if (!tree || typeof tree !== 'object') return tree;

    return Object.keys(tree).reduce((acc, key) => {
        const trimmedKey = key.trim(); // Trim the current key
        acc[trimmedKey] = trimFileTreeKeys(tree[key]); // Recurse for the nested object
        return acc;
    }, {});
}

export const createProject = async (req, res) => {
    try {
        const { name } = req.body;
        const userId = req.user.userId;

        console.log("Request body:", req.body);
        console.log("User from middleware:", req.user);

        if (!name) {
            return res.status(400).json({ message: 'Project name is required' });
        }

        // Create project with explicit owner field
        const project = await projectModel.create({
            name,
            users: [userId],
            owner: userId,  // Explicitly set owner field
            fileTree: {}
        });

        return res.status(201).json({ project });
    } catch (err) {
        console.error("Create project error:", err);
        return res.status(400).json({ message: err.message });
    }
};

// Find and replace the getProjects function with this implementation
export const getProjects = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Find ALL projects where this user is included in the users array
        const projects = await projectModel.find({
            users: { $in: [userId] }
        });

        // Populate separately with error handling
        try {
            await Promise.all(projects.map(project =>
                project.populate('users', 'email')
            ));
        } catch (popError) {
            console.error("Error populating users:", popError);
            // Continue without population
        }

        // Return the projects (even if populate failed)
        return res.status(200).json({ projects: projects || [] });
    } catch (err) {
        console.error("Error fetching projects:", err);
        return res.status(400).json({ error: err.message });
    }
};


export const addUserToProject = async (req, res) => {
    try {
        const { projectId, users } = req.body;

        const updatedProject = await projectService.addUsersToProject({
            projectId,
            users
        });

        res.json({ success: true, project: updatedProject });
    } catch (error) {
        console.error('Error adding users to project:', error);
        res.status(500).json({ message: 'Failed to add users to project' });
    }
};




export const getProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.userId;

        if (!projectId) {
            return res.status(400).json({ message: 'Project ID is required' });
        }

        // Only return project if user is a collaborator
        const project = await projectModel.findOne({
            _id: projectId,
            users: { $in: [userId] }
        }).populate('users', 'email')
            .populate('owner', 'email');

        if (!project) {
            return res.status(404).json({ message: 'Project not found or access denied' });
        }

        return res.status(200).json({ project });
    } catch (err) {
        console.error("Error getting project:", err);
        return res.status(500).json({ message: err.message });
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
        await projectService.deleteProject({
            projectId: id,
            userId: req.user.userId
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