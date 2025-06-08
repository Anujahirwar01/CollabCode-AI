import 'dotenv/config';// dotenv.config();
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import projectModel from './models/project.model.js'; // Assuming you have a project model
// import SocketIO from 'socket.io';
import {generateResult} from './services/ai.service.js'; // Assuming you have an AI service

import mongoose from 'mongoose';

import app from './app.js';

const port = process.env.PORT || 3000;

// const io = new Server(server, {
//     cors: {
//         origin: '*'
//     }
// });

const server = http.createServer(app);
const io = new Server(server,{
    cors: {
        origin: '*',
    }
});
io.use(async (socket, next) => {

    try {

        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[ 1 ];
        const projectId = socket.handshake.query.projectId;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error('Invalid projectId'));
        }


        socket.project = await projectModel.findById(projectId);


        if (!token) {
            return next(new Error('Authentication error'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return next(new Error('Authentication error'))
        }


        socket.user = decoded;

        next();

    } catch (error) {
        next(error)
    }

})
// const server = require('http').createServer(app);

io.on('connection',socket => {

    socket.roomId = socket.project._id.toString();

    console.log('New client connected');

    socket.join(socket.roomId);

    socket.on('project-message', async data => {
        const message = data.message;
        console.log(data)
        const aiIsPresentInmessage = message.includes('@ai');
        socket.broadcast.to(socket.roomId).emit('project-message',
            data
        )
        if(aiIsPresentInmessage) {
           const prompt = message.replace('@ai', '');
           const result = await generateResult(prompt);
           io.to(socket.roomId).emit('project-message', {
            message: result,
            sender: {
                _id: 'ai',
                email: 'AI'
            },
           })
            return;
        }
        
    })

     socket.on('disconnect', () => { 
        console.log('Client disconnected');
        socket.leave(socket.roomId);
    });
})
// server.listen(3000);

server.listen(port, () => {
    console.log(`Server is running  port ${port}`);
}
);  