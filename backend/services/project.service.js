import projectModel from '../models/project.model.js';
import mongoose from 'mongoose';

export const createProject = async (req, res) => {
    try {
        const { name } = req.body;

        // Get userId from req.user (added by auth middleware)
        const userId = req.user?.userId;

        console.log("Create project request:", { name, userId, user: req.user });

        if (!name) {
            return res.status(400).json({ message: 'Project name is required' });
        }

        if (!userId) {
            return res.status(400).json({ message: 'User authentication required' });
        }

        // Create project with explicit owner field
        const project = await projectModel.create({
            name,
            users: [userId],
            owner: userId,  // Set owner field explicitly
            fileTree: {}
        });

        return res.status(201).json({ project });
    } catch (err) {
        console.error("Create project error:", err);
        return res.status(400).json({ message: err.message });
    }
};

// Add to project.service.js
export const addUsersToProject = async ({ projectId, users }) => {
    try {
        const project = await projectModel.findByIdAndUpdate(
            projectId,
            { $addToSet: { users: { $each: users } } },
            { new: true }
        ).populate('users', 'email')
            .populate('owner', 'email');

        if (!project) {
            throw new Error('Project not found');
        }

        return project;
    } catch (error) {
        console.error('Error adding users to project:', error);
        throw error;
    }
};

// Fix the getProjectById function to use projectModel instead of Project
export const getProjectByIds = async ({ projectId }) => {
    try {
        const project = await projectModel.findById(projectId) // <-- Fixed!
            .populate('users', 'email _id')
            .populate('owner', 'email _id');

        if (!project) {
            throw new Error('Project not found');
        }

        return project;
    } catch (error) {
        console.error('Error fetching project:', error);
        throw error;
    }
};

// Add the missing getProjectById function that the controller expects
export const getProjectById = async ({ projectId }) => {
    try {
        const project = await projectModel.findById(projectId)
            .populate('users', 'email _id')
            .populate('owner', 'email _id');

        if (!project) {
            throw new Error('Project not found');
        }

        return project;
    } catch (error) {
        console.error('Error fetching project:', error);
        throw error;
    }
};

export const updateFileTree = async ({ projectId, fileTree }) => {
    if (!projectId) {
        throw new Error("projectId is required")
    }
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId")
    }
    if (!fileTree) {
        throw new Error("fileTree is required")
    }
    const project = await projectModel.findOneAndUpdate({
        _id: projectId
    }, {
        fileTree
    }, {
        new: true
    })

    return project;
}

export const deleteProject = async ({ projectId, userId }) => {
    if (!projectId) {
        throw new Error("projectId is required");
    }
    if (!userId) {
        throw new Error("userId is required");
    }

    const project = await projectModel.findById(projectId);

    if (!project) {
        throw new Error('Project not found');
    }

    // ✅ FIX: Check if the user is in the project's user list
    if (!project.users.includes(userId)) {
        throw new Error('User not authorized to delete this project');
    }

    await projectModel.findByIdAndDelete(projectId);

    return;
};