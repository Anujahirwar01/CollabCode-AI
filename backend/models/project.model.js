import mongoose from 'mongoose';


const projectSchrema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
        lowercase:true,
        trim:true,
        unique:[true , 'project name must be unique']
    },
    users:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'user'
        }
    ]
})

const Project = mongoose.model('project', projectSchrema);
export default Project;