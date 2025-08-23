import { io } from 'socket.io-client';

// Create a socket connection tracker to prevent multiple connections
const socketConnections = {};

export const getSocket = (projectId, setIsConnected = null) => {
    if (!projectId) {
        console.error('Project ID is required to create socket connection');
        return null;
    }
    
    // If connection exists for this project, reuse it
    if (socketConnections[projectId]) {
        console.log(`Socket: Reusing active connection for project: ${projectId}`);
        return socketConnections[projectId];
    }
    
    console.log(`Socket: Creating new connection for project ${projectId}`);
    
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('Authentication token missing');
        return null;
    }
    
    // Create new connection
    const socket = io('http://localhost:3000', {
        auth: {
            token
        },
        query: {
            projectId
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
        withCredentials: true
    });
    
    // Store connection in tracker
    socketConnections[projectId] = socket;
    
    // Add event handlers
    socket.on('connect', () => {
        console.log(`Socket connected for project: ${projectId}`);
        if (setIsConnected) setIsConnected(true);
    });
    
    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        if (setIsConnected) setIsConnected(false);
    });
    
    socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (setIsConnected) setIsConnected(false);
    });
    
    return socket;
};

export const attachSocketListener = (socket, event, callback) => {
    if (!socket) {
        console.error('Cannot attach listener - socket is null');
        return () => {};
    }
    
    socket.on(event, callback);
    
    return () => {
        socket.off(event, callback);
    };
};

export const sendSocketMessage = (socket, event, data) => {
    if (!socket || !socket.connected) {
        console.error('Cannot send message - socket is null or not connected');
        return false;
    }
    
    socket.emit(event, data);
    return true;
};

export const closeSocket = (projectId) => {
    if (socketConnections[projectId]) {
        socketConnections[projectId].disconnect();
        delete socketConnections[projectId];
        console.log(`Socket connection closed for project: ${projectId}`);
    }
};