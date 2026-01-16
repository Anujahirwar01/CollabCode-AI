import Message from '../models/Message.model.js'; 
import messageModel from '../models/Message.model.js';
import Project from '../models/project.model.js'; 

export const saveMessage = async (projectId, sender, messageContent) => {
    try {
        const newMessage = new Message({
            projectId,
            sender,
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


export const getMessagesByProjectId = async (req, res) => {
    try {
        const { projectId } = req.params;
        const messages = await messageModel.find({ project: projectId })
            .populate('sender', 'email')
            .sort({ timestamp: 1 });

        res.status(200).json({ messages });
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ message: "Server error while fetching messages." });
    }
};