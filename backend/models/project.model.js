import mongoose from 'mongoose';


const projectSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    fileTree: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true  // Keep this required
    },
    // other fields...
}, { timestamps: true });


const Project = mongoose.model('project', projectSchema)


export default Project;