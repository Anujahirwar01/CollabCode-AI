import projectModel from '../models/project.model.js';
import mongoose from 'mongoose';

export const createProject = async ({
    name, userId
}) => {
    if (!name) {
        throw new Error('Name is required')
    }
    if (!userId) {
        throw new Error('UserId is required')
    }

    let project;
    try {
        project = await projectModel.create({
            name,
            users: [userId]
        });
    } catch (error) {
        if (error.code === 11000) {
            throw new Error('Project name already exists');
        }
        throw error;
    }

    return project;
}

export const getAllProjectByUserId = async ({ userId }) => {
    if (!userId) {
        throw new Error('UserId is required')
    }

    const allUserProjects = await projectModel.find({
        users: userId
    })

    return allUserProjects
}

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
export const getProjectById = async ({ projectId }) => {
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