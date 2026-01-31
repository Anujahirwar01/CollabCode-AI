import userModel from '../models/user.model.js';
import projectModel from '../models/project.model.js';



export const createUser = async ({
    email, password
}) => {

    if (!email || !password) {
        throw new Error('Email and password are required');
    }

    const hashedPassword = await userModel.hashPassword(password);

    const user = await userModel.create({
        email,
        password: hashedPassword
    });

    return user;

}

// import userModel from '../models/user.model.js';

// Add or replace this function in your service file
export const getAllUsers = async () => {
    // This function now correctly takes no arguments.
    // It finds all users and excludes the password field for security.
    const users = await userModel.find().select('-password');
    return users;
};

// Get user's projects for profile
export const getUserProjects = async (userId) => {
    try {
        const projects = await projectModel.find({
            users: { $in: [userId] }
        })
            .populate('users', 'email')
            .populate('owner', 'email')
            .select('name fileTree users owner createdAt updatedAt')
            .sort({ updatedAt: -1 });

        return projects;
    } catch (error) {
        console.error('Error fetching user projects:', error);
        throw error;
    }
};