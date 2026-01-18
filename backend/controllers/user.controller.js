import userModel from '../models/user.model.js';
import * as userService from '../services/user.service.js';
import { validationResult } from 'express-validator';
import redisClient from '../services/redis.service.js';


export const createUserController = async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const user = await userService.createUser(req.body);

        const token = await user.generateJWT();

        delete user._doc.password;

        res.status(201).json({ user, token });
    } catch (error) {
        res.status(400).send(error.message);
    }
}

export const loginController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {

        const { email, password } = req.body;

        const user = await userModel.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                errors: 'Invalid credentials'
            })
        }

        const isMatch = await user.isValidPassword(password);

        if (!isMatch) {
            return res.status(401).json({
                errors: 'Invalid credentials'
            })
        }

        const token = await user.generateJWT();

        delete user._doc.password;

        res.status(200).json({ user, token });


    } catch (err) {

        console.log(err);

        res.status(400).send(err.message);
    }
}

export const profileController = async (req, res) => {
    try {
        const userId = req.user.userId;

        // Get user details without password
        const user = await userModel.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get user's projects
        const projects = await userService.getUserProjects(userId);

        res.status(200).json({
            user,
            projects,
            stats: {
                totalProjects: projects.length,
                joinDate: user.createdAt || user._id.getTimestamp()
            }
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const logoutController = async (req, res) => {
    try {
        // Handle both cookie and header token
        let token;
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        } else if (req.headers.authorization) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (token && redisClient.isConnected && redisClient.isConnected()) {
            // Add token to blacklist if Redis is available
            await redisClient.set(`blacklist_${token}`, 'logout', { ex: 60 * 60 * 24 });
        }

        // Clear cookie if it exists
        res.clearCookie('token');

        res.status(200).json({
            message: 'Logged out successfully'
        });
    } catch (err) {
        console.error('Logout error:', err);
        // Even if Redis fails, we can still clear the cookie and respond success
        res.clearCookie('token');
        res.status(200).json({
            message: 'Logged out successfully'
        });
    }
};

// ✅ CORRECTED VERSION of the function
export const getAllUsersController = async (req, res) => {
    try {
        // Call the service to get all users, no parameter is needed.
        const allUsers = await userService.getAllUsers();

        return res.status(200).json({
            users: allUsers
        });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Server error while fetching users' });
    }
};