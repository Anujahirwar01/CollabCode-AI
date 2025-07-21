import { io } from 'socket.io-client';

let socket = null;

export const initializeSocket = (projectId) => {
    if (!socket || !socket.connected || socket.handshake.query.projectId !== projectId) {
        if (socket && socket.connected) {
            console.log("Disconnecting existing socket before new connection...");
            socket.disconnect();
        }

        const authToken = localStorage.getItem('token');

        socket = io(import.meta.env.VITE_BACKEND_URL, {
            query: { projectId },
            withCredentials: true,
            auth: {
                token: authToken
            }
        });

        socket.on('connect', () => {
            console.log('Socket connected:', socket.id);
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err.message);
            if (err.message.includes('Authentication error')) {
                console.warn('Authentication failed for WebSocket. User might need to log in again.');
            }
        });
    }
    return socket;
};

export const receiveMessage = (eventName, callback) => {
    if (socket) {
        socket.on(eventName, callback);
        return () => {
            socket.off(eventName, callback);
        };
    }
    return () => {};
};

export const sendMessage = (eventName, data) => {
    if (socket && socket.connected) {
        socket.emit(eventName, data);
    } else {
        console.error("Socket not connected. Cannot send message.");
    }
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};