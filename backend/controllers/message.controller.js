// backend/controllers/message.controller.js
import Message from '../models/Message.model.js'; // Adjust path if necessary
import messageModel from '../models/Message.model.js';
import Project from '../models/project.model.js'; // Assuming you have a Project model

// Function to save a message to the database (called from WebSocket handler)
export const saveMessage = async (projectId, sender, messageContent) => {
    try {
        const newMessage = new Message({
            projectId,
            sender, // sender should be { _id: user._id, email: user.email }
            message: messageContent,
        });
        await newMessage.save();
        console.log('Message saved to DB:', newMessage._id);
        return newMessage;
    } catch (error) {
        console.error('Error saving message to DB:', error);
        throw new Error('Failed to save message');
    }
};

// Function to fetch messages for a project (for the new HTTP GET endpoint)
export const getMessagesByProjectId = async (req, res) => {
    try {
        const { projectId } = req.params;
        const messages = await messageModel.find({ project: projectId })
            .populate('sender', 'email') // Populate sender's email
            .sort({ timestamp: 1 });   // Sort by oldest first

        res.status(200).json({ messages });
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Server error while fetching messages." });
    }
};