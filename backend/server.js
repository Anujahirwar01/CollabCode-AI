// backend/server.js
import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './models/project.model.js';
import { generateResult } from './services/ai.service.js';
import { saveMessage } from './controllers/message.controller.js';

const port = process.env.PORT || 3000;
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',
        credentials: true
    }
});

// Socket.IO Authentication Middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];
        const projectId = socket.handshake.query.projectId;

        if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error('Invalid projectId'));
        }
        socket.project = await projectModel.findById(projectId);
        if (!socket.project) {
            return next(new Error('Project not found'));
        }
        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded;
        next();
    } catch (error) {
        console.error("Socket Auth Middleware Error:", error.message);
        next(new Error('Authentication failed.'));
    }
});

// Main Socket.IO Connection Handler
io.on('connection', socket => {
    socket.roomId = socket.project._id.toString();
    console.log(`User ${socket.user.email} connected to project ${socket.roomId}`);
    socket.join(socket.roomId);

    // Listen for incoming messages from clients
    socket.on('project-message', async (data) => {
        const userMessageContent = data.message;
        const senderInfo = data.sender;
        const aiIsPresentInMessage = userMessageContent.includes('@ai');

        // 1. Save and broadcast the user's message
        try {
            await saveMessage(socket.roomId, senderInfo, userMessageContent);
            io.to(socket.roomId).emit('project-message', data);
        } catch (dbError) {
            console.error("ERROR saving user message to DB:", dbError);
        }

        // 2. If @ai is mentioned, process the AI response
        // Inside socket.on('project-message', ...)
if (aiIsPresentInMessage) {
    try {
        const prompt = userMessageContent.replace('@ai', '').trim();
        const aiJsonResponseString = await generateResult(prompt);

        // ✅ Add a validation step
        try {
            JSON.parse(aiJsonResponseString); // This ensures the string is valid JSON
        } catch (parseError) {
            // If parsing fails, throw an error to be caught below
            throw new Error("AI returned malformed JSON."); 
        }

        const aiMessageData = {
            message: aiJsonResponseString,
            sender: { _id: 'ai', email: 'AI Assistant' },
            timestamp: new Date().toISOString()
        };

        await saveMessage(socket.roomId, aiMessageData.sender, aiMessageData.message);
        io.to(socket.roomId).emit('project-message', aiMessageData);

    } catch (error) {
        console.error("Error during AI processing:", error);
        // Send a clean, user-friendly error message
        socket.emit('project-message', {
            message: JSON.stringify({ text: `AI System Error: ${error.message}` }),
            sender: { _id: 'ai', email: 'AI System Error' }
        });
    }
}
    });

    socket.on('disconnect', () => {
        console.log(`User ${socket.user?.email || 'unknown'} disconnected from project ${socket.roomId || 'unknown'}`);
    });
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});