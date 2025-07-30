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
// Main Socket.IO Connection Handler
io.on('connection', socket => {
    socket.roomId = socket.project._id.toString();
    console.log(`User ${socket.user.email} connected to project ${socket.roomId}`);
    socket.join(socket.roomId);

    // ✅ CORRECTED: Listen for incoming messages from clients
    socket.on('project-message', async (data) => {
        const userMessageContent = data.message;
        const senderInfo = data.sender;
        const aiIsPresentInMessage = userMessageContent.includes('@ai');

        // 1. Immediately broadcast the user's message so the UI is responsive
        io.to(socket.roomId).emit('project-message', data);

        // 2. Then, try to save the message to the database
        try {
            await saveMessage(socket.roomId, senderInfo, userMessageContent);
        } catch (dbError) {
            console.error("ERROR saving user message to DB:", dbError);
            // The message is already sent to clients, so we just log the backend error.
        }

        // 3. If @ai is mentioned, process the AI response
        if (aiIsPresentInMessage) {
            try {
                const prompt = userMessageContent.replace('@ai', '').trim();
                const aiJsonResponseString = await generateResult(prompt);

                // Ensure the string is valid JSON before proceeding
                JSON.parse(aiJsonResponseString); 

                const aiMessageData = {
                    message: aiJsonResponseString,
                    sender: { _id: 'ai', email: 'AI Assistant' },
                    timestamp: new Date().toISOString()
                };
                
                // Immediately broadcast the AI's message
                io.to(socket.roomId).emit('project-message', aiMessageData);

                // Then, try to save the AI message
                await saveMessage(socket.roomId, aiMessageData.sender, aiMessageData.message);

            } catch (error) {
                console.error("Error during AI processing:", error);
                // Send a user-friendly error message back to the original sender
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