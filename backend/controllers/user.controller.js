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

        const token = await user.generateAuthToken();

        delete user._doc.password; 

        res.status(201).json({ user, token });
    } catch (error) {
        res.status(400).send(error.message);
    }
}

export const loginUserController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({errors: "Invalid credintials"});
        }
        const isMatch = await user.isValidPasssword(password);
        if (!isMatch) {
            return res.status(401).json({errors: "Invalid credintials"});
        }
        const token = await user.generateAuthToken();

        delete user._doc.password; // remove password from user object

        res.status(200).json({ user, token });
    } catch (error) {
        res.status(400).send(error.message);
    }
}

export const profileController = async (req, res) => {
    console.log(req.user);
    res.status(200).json({
        user: req.user
    });
}

export const logoutController = async (req, res) => {
    try {
        const token = req.cookies.token || req.headers.authorization.split(" ")[1];

        await redisClient.set(token, 'logout', 'EX', 60 * 60 * 24 ); // 1 days
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        res.status(400).send(error.message);
    }
}

// export const getAllUsersController = async (req, res) => {
//     try {
//         const users = await userModel.find({}, '-password'); // Exclude password field
//         res.status(200).json({ users });
//     } catch (error) {
//         res.status(400).send(error.message);
//     }
// }

export const getAllUsersController = async (req, res) => {
    // const userId = req.params.id;

    // if (!userId) {
    //     return res.status(400).json({ error: 'User ID is required' });
    // }

    try {

        const LoggedInUser = await userModel.findOne({email: req.user.email}); // Exclude password field
        const allUsers = await userService.getAllusers({
            userId: LoggedInUser._id
        });
        return res.status(200).json({
            users: allUsers
        });
    }
    catch (error) {
        res.status(400).send(error.message);
    }
}