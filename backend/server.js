// backend/index.js (or server.js)
import 'dotenv/config';
import http from 'http';
import app from './app.js'; // Your Express app instance
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './models/project.model.js'; // Your Mongoose Project model
import { generateResult } from './services/ai.service.js'; // Your AI service
import { saveMessage } from './controllers/message.controller.js'; // Your message controller

const port = process.env.PORT || 3000;

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173', // Ensure this matches your frontend's exact origin
        credentials: true
    }
});

// Socket.IO Authentication Middleware
// This middleware runs BEFORE the 'connection' event. It authenticates the handshake.
io.use(async (socket, next) => {
    console.log("\n--- Socket.IO Middleware Started ---");
    console.log("Handshake Auth:", socket.handshake.auth);
    console.log("Handshake Query:", socket.handshake.query);

    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];
        const projectId = socket.handshake.query.projectId;

        // Log token and projectId for debugging
        console.log("Token received in middleware:", token ? `YES (starts with ${token.substring(0, 10)}...)` : "NO");
        console.log("ProjectId received in middleware:", projectId);

        if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
            console.error("Socket Auth Error: Invalid or missing projectId.", { projectId });
            return next(new Error('Invalid projectId'));
        }

        socket.project = await projectModel.findById(projectId);
        if (!socket.project) {
            console.error("Socket Auth Error: Project not found for ID.", { projectId });
            return next(new Error('Project not found'));
        }

        if (!token) {
            console.error("Socket Auth Error: No token provided.", { authHeader: socket.handshake.headers.authorization });
            return next(new Error('Authentication error: No token provided'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // The `if (!decoded)` check is redundant as `jwt.verify` throws an error if it fails.
        // If it reaches here, `decoded` is valid.
        
        socket.user = decoded; // Attach decoded user info to the socket instance

        console.log("Socket.IO middleware: Token decoded, user:", decoded.email, "for project:", socket.project.name);
        next(); // Allow connection
    } catch (error) {
        // --- CRITICAL ERROR LOG FOR AUTHENTICATION FAILURES ---
        console.error("\n!!! Backend Socket.IO Authentication Middleware Error !!!");
        console.error("Error Name:", error.name);
        console.error("Error Message:", error.message);
        console.error("Error Stack:", error.stack); // Full stack trace is invaluable
        console.error("--- End Socket.IO Middleware Error ---\n");

        if (error.name === 'TokenExpiredError') {
            return next(new Error('Authentication error: Token expired'));
        }
        if (error.name === 'JsonWebTokenError') {
            return next(new Error('Authentication error: Invalid token signature'));
        }
        // Generic error for any other unexpected issues during authentication
        next(new Error('Authentication failed due to server configuration. Please check backend logs.'));
    }
});

// Main Socket.IO Connection Handler
io.on('connection', socket => {
    // socket.roomId is now properly set from socket.project._id which comes from middleware
    socket.roomId = socket.project._id.toString();

    console.log(`User ${socket.user.email} connected to project ${socket.roomId}`);
    socket.join(socket.roomId); // Join the specific project room

    // Listen for incoming messages from clients
    socket.on('project-message', async (data) => {
        console.log("\nBackend: Received 'project-message' event from client.");
        console.log("Sender:", data.sender.email, "Message:", data.message);

        const userMessageContent = data.message;
        const senderInfo = data.sender;

        const aiIsPresentInMessage = userMessageContent.includes('@ai');

        // 1. Save the user's message to the database
        console.log("Backend: Attempting to save user message to DB...");
        try {
            await saveMessage(socket.roomId, senderInfo, userMessageContent);
            console.log("Backend: User message saved successfully.");
        } catch (dbError) {
            console.error("Backend: ERROR saving user message to DB:", dbError);
            // Don't call next() here; it's an event handler. Log and potentially inform client.
            socket.emit('project-message', { // Send error message back to the sender
                message: JSON.stringify({ text: `Failed to save your message. (${dbError.message})` }),
                sender: { _id: 'ai', email: 'AI System' },
                timestamp: new Date().toISOString()
            });
        }

        // 2. Broadcast the user's message to all clients in the same project room (including sender)
        io.to(socket.roomId).emit('project-message', data);
        console.log("Backend: User message broadcasted to room.");


        // 3. If AI is mentioned, process and send AI response
        if (aiIsPresentInMessage) {
            console.log("\nBackend: @ai detected. Starting AI processing flow...");
            const prompt = userMessageContent.replace('@ai', '').trim();

            try {
                console.log("Backend: Calling generateResult service with prompt:", prompt);
                const aiRawResult = await generateResult(prompt); // This is where your AI API call happens
                console.log("Backend: generateResult service returned a result.");

                // Format the AI message for consistency with frontend WriteAiMessage component
                const aiMessagePayload = {
                    text: aiRawResult,
                    fileTree: {} // Initialize fileTree; populate if your AI generates file changes
                };
                const stringifiedAiMessage = JSON.stringify(aiMessagePayload);

                const aiMessageData = {
                    message: stringifiedAiMessage, // Message content as stringified JSON
                    sender: {
                        _id: 'ai', // Special ID for AI
                        email: 'AI Assistant' // Consistent name for UI
                    },
                    timestamp: new Date().toISOString() // Current timestamp
                };

                // 4. Save the AI's response to the database
                console.log("Backend: Attempting to save AI message to DB...");
                await saveMessage(socket.roomId, aiMessageData.sender, aiMessageData.message);
                console.log("Backend: AI message saved successfully.");

                // 5. Emit the AI's response to all clients in the room
                io.to(socket.roomId).emit('project-message', aiMessageData);
                console.log("Backend: AI message broadcasted to room.");

            } catch (aiError) {
                // --- CRITICAL ERROR LOG FOR AI PROCESSING FAILURES ---
                console.error("\n!!! Backend: CRITICAL ERROR during AI generation or processing !!!");
                console.error("Error Name:", aiError.name);
                console.error("Error Message:", aiError.message);
                console.error("Error Stack:", aiError.stack); // Full stack trace is essential for debugging AI errors
                console.error("--- End AI Processing Error ---\n");

                // Emit an error message back to the client directly via the sender's socket
                socket.emit('project-message', { // Emitting to 'socket' sends only to the sender
                    message: JSON.stringify({ text: `AI System Error: Failed to generate response. (${aiError.message}). Please try again later or contact support.` }),
                    sender: { _id: 'ai', email: 'AI System' },
                    timestamp: new Date().toISOString()
                });
            }
        }
        console.log("Backend: 'project-message' handler finished.");
    });

    // Handle socket disconnection
    socket.on('disconnect', () => {
        console.log(`User ${socket.user?.email || 'unknown'} disconnected from project ${socket.roomId || 'unknown'}`);
        // Socket.IO automatically handles leaving rooms on disconnect
    });
});

// Start the HTTP server (which Socket.IO is attached to)
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});