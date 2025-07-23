import { io } from 'socket.io-client';

let socketInstance = null; // Global instance for the Socket.IO client
let currentProjectIdTracker = null; // Keep track of the projectId the current socketInstance is connected to

/**
 * Gets or creates the Socket.IO instance. Ensures only one socket is active for the given project ID.
 * It also updates a React state callback to reflect the connection status.
 * @param {string} newProjectId - The ID of the project to connect to.
 * @param {function} setConnectedStatusCallback - React setState function to update connection status.
 * @returns {Socket} The Socket.IO instance.
 */
export const getSocket = (newProjectId, setConnectedStatusCallback) => {
    const updateStatus = (status) => {
        if (setConnectedStatusCallback) {
            if (status === true) {
                setTimeout(() => { // Keep the delay for setting TRUE status
                    setConnectedStatusCallback(true);
                }, 250);
            } else {
                setConnectedStatusCallback(false);
            }
        }
    };

    // --- Aggressive Debugging Logs for getSocket decision ---
    console.groupCollapsed(`%cSocket: getSocket called for project %c${newProjectId}`, 'color: cyan;', 'color: yellow; font-weight: bold;');
    console.log("Current socketInstance:", socketInstance);
    if (socketInstance) {
        console.log("  .connected:", socketInstance.connected);
        console.log("  .id:", socketInstance.id);
        console.log("  .handshake:", socketInstance.handshake);
        console.log("  .handshake.query.projectId:", socketInstance.handshake?.query?.projectId);
        console.log("  Global currentProjectIdTracker:", currentProjectIdTracker);
    }
    console.groupEnd();
    // --- End Aggressive Debugging Logs ---

    // --- CRITICAL DECLARATION: isCurrentlyConnectedAndCorrect is defined here ---
    const isCurrentlyConnectedAndCorrect = (
        socketInstance &&
        socketInstance.connected &&
        currentProjectIdTracker === newProjectId // Rely on our stable internal tracker
    );

    if (isCurrentlyConnectedAndCorrect) {
        console.log(`%cSocket: Reusing active connection for project: ${newProjectId} (matched by tracker)`, 'color: green; font-weight: bold;');
        updateStatus(true);
        return socketInstance;
    }

    // --- Decision point for disconnect/clear and create new ---
    let reasonForNewConnection = "";
    if (!socketInstance) {
        reasonForNewConnection = "No existing socketInstance.";
    } else if (!socketInstance.connected) {
        reasonForNewConnection = `Existing socket is disconnected. Reason: ${socketInstance.io?.engine?.closeReason || 'unknown'}.`;
    } else if (currentProjectIdTracker !== newProjectId) {
        reasonForNewConnection = `Existing socket connected to WRONG project. (Current Tracker: ${currentProjectIdTracker}, New: ${newProjectId})`;
    } else {
        reasonForNewConnection = "Unknown internal state leading to new connection.";
    }

    console.log(`%cSocket: Proceeding to create NEW connection. Reason: ${reasonForNewConnection}`, 'color: orange; font-weight: bold;');

    if (socketInstance) {
        console.log(`Socket: Disconnecting/clearing existing socket (was serving: ${currentProjectIdTracker}).`);
        socketInstance.disconnect();
        socketInstance = null;
        updateStatus(false);
    }

    console.log(`Socket: Initializing NEW socket instance for project: ${newProjectId}`);
    const authToken = localStorage.getItem('token');
    if (!authToken) {
        console.warn("Socket: No authentication token found for new socket connection.");
        updateStatus(false);
    }

    updateStatus(false);

    socketInstance = io(import.meta.env.VITE_API_URL, {
        query: { projectId: newProjectId },
        withCredentials: true,
        auth: { token: authToken }
    });

    socketInstance.on('connect', () => {
        console.log(`%cSocket: NEW Connection ESTABLISHED with ID: ${socketInstance.id} to project: ${newProjectId}`, 'color: green; font-weight: bold;');
        updateStatus(true);
        currentProjectIdTracker = newProjectId;
    });

    socketInstance.on('disconnect', (reason) => {
        console.log(`%cSocket: Connection DISCONNECTED. Reason: ${reason} from project: ${currentProjectIdTracker}`, 'color: red; font-weight: bold;');
        updateStatus(false);
        currentProjectIdTracker = null;
    });

    socketInstance.on('connect_error', (err) => {
        console.error(`%cSocket: NEW Connection ERROR for project ${newProjectId}:`, 'color: red; font-weight: bold;', err.message);
        updateStatus(false);
        currentProjectIdTracker = null;
        if (err.message.includes('Authentication error')) {
            console.warn('Socket: Authentication failed. User might need to log in again.');
        }
    });

    return socketInstance;
};

export const attachSocketListener = (socket, eventName, callback) => {
    if (!socket) {
        console.warn(`Socket: Cannot attach listener for "${eventName}". Socket instance is null.`);
        return () => {};
    }
    socket.on(eventName, callback);
    return () => {
        console.log(`Socket: Detaching listener for event: ${eventName}`);
        socket.off(eventName, callback);
    };
};

export const sendSocketMessage = (socket, eventName, data) => {
    if (socket && socket.connected) {
        socket.emit(eventName, data);
    } else {
        console.error("Socket: Not connected. Cannot send message. Please wait for connection.");
    }
};

export const disconnectSocket = () => {
    if (socketInstance) {
        console.log("Socket: Explicitly disconnecting global socket instance.");
        socketInstance.disconnect();
        socketInstance = null;
        currentProjectIdTracker = null;
    }
};