// backend/controllers/message.controller.js
import Message from '../models/Message.model.js'; // Adjust path if necessary
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
        const { projectId } = req.params; // Get projectId from the URL parameter

        // Optional: Basic authorization check if needed (e.g., is user part of this project?)
        // const project = await Project.findById(projectId);
        // if (!project || !project.users.includes(req.user._id)) { // req.user comes from authUser middleware
        //     return res.status(403).json({ message: "Access denied to project messages." });
        // }

        const messages = await Message.find({ projectId })
                                     .sort({ timestamp: 1 }) // Sort by oldest to newest
                                     .lean(); // Return plain JavaScript objects for faster reads

        res.status(200).json({ messages });
    } catch (error) {
        console.error('Error fetching messages by project ID:', error);
        res.status(500).json({ message: 'Failed to retrieve messages' });
    }
};