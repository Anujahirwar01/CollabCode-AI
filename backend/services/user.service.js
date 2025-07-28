import userModel from '../models/user.model.js';



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