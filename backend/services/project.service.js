import mongoose from "mongoose";
import projectModel from "../models/project.model.js";


export const createProject = async ({
    name,
    userId
}) => {
    if(!name) {
        throw new Error('Name is required');
    }
    if(!userId) {
        throw new Error('User ID is required');
    }
    let project;
    try {
        project = await projectModel.create({
            name,
            users: [userId]
        });
    } catch (err) {
        if(err.code === 11000) {
            throw new Error('Project name must be unique');
        }
        throw err;
    }
    
}

export const getAllProjects= async ({userId}) => {
    if(!userId) {
        throw new Error(' ID  required');
    }
    const projects = await projectModel.find({
        users: userId
    }).populate('users', 'name email');
    return projects;
}

export const addUserToProject = async ({projectId, users,userId}) => {
    if(!projectId){
        throw new Error('Project ID is required');
    }

    if(!mongoose.isValidObjectId(projectId)){
        throw new Error('Invalid Project ID');
    }

    if(!users){
        throw new Error('Users are required');
    }
    if(!Array.isArray(users) || users.some(userId => !mongoose.Types.ObjectId.isValid(userId))) {
        throw new Error("Invalid userId(s) in users array")
    }
    if(!userId) {
        throw new Error('User ID is required');
    }
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error("Invalid userId")
    }

    const project = await projectModel.findOne({
        _id: projectId,
        users: userId
    })
    if(!project) {
        throw new Error('Project not found or user is not part of the project');
    }
    const updatedProject = await projectModel.findOneAndUpdate({
        _id: projectId
    }, {
        $addToSet: {
            users: {
                $each: users
            }
        }
    }, {
        new: true
    })
    return updatedProject;
}

