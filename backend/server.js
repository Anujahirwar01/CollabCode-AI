import 'dotenv/config';// dotenv.config();
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
// import SocketIO from 'socket.io';

import mongoose from 'mongoose';

import app from './app.js';

const port = process.env.PORT || 3000;

// const io = new Server(server, {
//     cors: {
//         origin: '*'
//     }
// });

const server = http.createServer(app);
const io = new Server(server);
io.use((socket, next) => {

    try {

        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[ 1 ];
        const projectId = socket.handshake.query.projectId;

        // if (!mongoose.Types.ObjectId.isValid(projectId)) {
        //     return next(new Error('Invalid projectId'));
        // }


        // socket.project = projectModel.findById(projectId);


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


    console.log('New client connected');

    socket.on('event', data => { /* - */ });
    socket.on('disconnect', () => { /* - */ });
})
// server.listen(3000);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}
);  