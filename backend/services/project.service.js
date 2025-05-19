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
        throw new Error('User ID is required');
    }
    const projects = await projectModel.find({
        users: userId
    }).populate('users', 'name email');
    return projects;
}