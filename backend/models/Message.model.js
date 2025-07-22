// backend/models/Message.model.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project', // Ensure you have a Project model defined elsewhere
        required: true,
    },
    sender: { // Store essential sender info (e.g., ID, email)
        _id: { type: mongoose.Schema.Types.ObjectId, required: true },
        email: { type: String, required: true },
        // Add other sender fields if needed, e.g., name, profile picture
    },
    message: { // This will store the actual message content
        type: String, // Store it as a string (will be stringified JSON for AI, plain for user)
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
}, { timestamps: true }); // Add timestamps for createdAt/updatedAt

const Message = mongoose.model('Message', messageSchema);

export default Message;