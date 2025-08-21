import jwt from "jsonwebtoken";
import redisClient from "../services/redis.service.js";
import User from "../models/user.model.js";

export const authUser = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).send({ error: 'Unauthorized User: No token provided' });
        }

        const isBlackListed = await redisClient.get(token);

        if (isBlackListed) {
            res.cookie('token', '');
            return res.status(401).send({ error: 'Unauthorized User: Token is blacklisted' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find the user from database using the email from token
        const user = await User.findOne({ email: decoded.email });
        if (!user) {
            return res.status(401).send({ error: 'Unauthorized User: User not found' });
        }

        // Set req.user with userId
        req.user = { 
            userId: user._id.toString(),
            email: user.email 
        };
        
        console.log('Auth middleware - Set req.user:', req.user); // Debug log
        
        next();
    } catch (error) {
        console.log(error);
        res.status(401).send({ error: 'Unauthorized User: Invalid token' });
    }
};