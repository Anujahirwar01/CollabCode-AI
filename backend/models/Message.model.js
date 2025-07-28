import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    // ✅ CORRECTED: Field name changed to 'project' to match your controller's query
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
    },
    // ✅ CORRECTED: 'sender' is now a direct reference to the User model
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // This allows .populate() to fetch the user's details
        required: true
    },
    message: {
        type: String,
        required: true,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

const Message = mongoose.model('Message', messageSchema);

export default Message;