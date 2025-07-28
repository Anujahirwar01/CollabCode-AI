// backend/app.js
import express from 'express';
import morgan from 'morgan';
import connect from './db/db.js';
import userRoutes from './routes/user.routes.js';
import cookieParser from 'cookie-parser';
import projectRoutes from './routes/project.routes.js';
import cors from 'cors';
import aiRoutes from './routes/ai.routes.js';
import { getMessagesByProjectId } from './controllers/message.controller.js'; 
import messageRoutes from './routes/message.routes.js';
import { authUser } from './middleware/auth.middleware.js'; 

connect();
const app = express();

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/messages', messageRoutes);
app.use('/users', userRoutes);
app.use('/projects', projectRoutes);
app.use('/ai', aiRoutes);


app.get('/projects/:projectId/messages', authUser, getMessagesByProjectId); 

app.get('/', (req, res) => {
    res.send('Hello World!');
});

export default app;