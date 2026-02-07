import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { UserContext } from '../context/user.context';
import { useNavigate, useParams } from 'react-router-dom';
import axios from '../config/axios';
import { getSocket, attachSocketListener, sendSocketMessage } from '../config/socket';
import Markdown from 'markdown-to-jsx';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { getWebContainer } from '../config/webcontainer';
import {
    Plus, Users, X, Send, Play, File as FileIcon, Folder as FolderIcon,
    MessageSquare, Code, Monitor, ChevronRight, User as UserIcon, FileText,
    Zap, Globe, Palette, Database, Calculator
} from 'lucide-react';
import WriteAiMessage from '../components/WriteAiMessage';
import FileTreeItem from '../components/FileTreeItem';
import SyntaxHighlightedCode from '../components/SyntaxHighlightedCode';
import CodeEditor from '../components/CodeEditor';

// --- HELPER FUNCTIONS ---

function ensureRequiredFiles(tree) {
    const updatedTree = { ...tree };


    if (!updatedTree['package.json']) {
        console.log("Adding default package.json");
        updatedTree['package.json'] = {
            file: {
                contents: JSON.stringify({
                    name: "webcontainer-project",
                    version: "1.0.0",
                    description: "WebContainer Project",
                    scripts: {
                        start: "npx serve ."
                    },
                    dependencies: {}
                }, null, 2)
            }
        };
    }

    if (!updatedTree['index.html']) {
        console.log("Adding default index.html");
        updatedTree['index.html'] = {
            file: {
                contents: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebContainer Project</title>
</head>
<body>
    <h1>WebContainer Project</h1>
    <p>Edit files to start building your project!</p>
</body>
</html>`
            }
        };
    }

    return updatedTree;
}
function trimFileTreeKeys(tree) {
    if (!tree || typeof tree !== 'object') return tree;
    return Object.keys(tree).reduce((acc, key) => {
        const trimmedKey = key.trim();
        acc[trimmedKey] = trimFileTreeKeys(tree[key]);
        return acc;
    }, {});
}


function transformToNested(flatTree) {
    if (!flatTree || typeof flatTree !== 'object') {
        return {};
    }

    const nestedTree = {};

    // Process all entries
    Object.entries(flatTree).forEach(([path, content]) => {
        const normalizedPath = path.replace(/^\/+/, '').replace(/\/+$/, ''); // Remove leading/trailing slashes

        if (!normalizedPath) return; // Skip empty paths

        const parts = normalizedPath.split('/').filter(Boolean);
        if (parts.length === 0) return;

        // Check if this entry represents a directory
        const isDirectory = content && typeof content === 'object' && content.directory;

        // Navigate/create directory structure
        let current = nestedTree;

        if (isDirectory) {
            // Create all parts as directories
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = { directory: {} };
                }
                current = current[part].directory;
            }
        } else {
            // Create parent directories and then add the file
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = { directory: {} };
                } else if (!current[part].directory) {
                    current[part] = { ...current[part], directory: {} };
                }
                current = current[part].directory;
            }

            // Add the file
            const fileName = parts[parts.length - 1];
            if (typeof content === 'string') {
                current[fileName] = { file: { contents: content } };
            } else if (content && typeof content === 'object' && content.file) {
                current[fileName] = content;
            } else {
                current[fileName] = {
                    file: {
                        contents: typeof content === 'object' ?
                            JSON.stringify(content, null, 2) : String(content || '')
                    }
                };
            }
        }
    });

    return nestedTree;
}

// Convert nested tree back to flat for backend storage
function transformToFlat(nestedTree, basePath = '') {
    const flatTree = {};

    const traverse = (node, currentPath) => {
        Object.entries(node).forEach(([key, value]) => {
            const fullPath = currentPath ? `${currentPath}/${key}` : key;

            if (value && value.file) {
                flatTree[fullPath] = value.file.contents;
            } else if (value && value.directory) {
                // Add directory entry
                flatTree[fullPath + '/'] = { directory: {} };
                // Traverse children
                traverse(value.directory, fullPath);
            }
        });
    };

    traverse(nestedTree, basePath);
    return flatTree;
}

function validateFileTree(nestedTree) {
    if (!nestedTree || typeof nestedTree !== 'object') {
        console.error("Invalid file tree structure:", nestedTree);
        return false;
    }

    // Check if there are any files/directories
    if (Object.keys(nestedTree).length === 0) {
        console.warn("Empty file tree");
        return true; // Empty is okay, we'll add default files
    }

    // Validate each top-level entry
    for (const [key, value] of Object.entries(nestedTree)) {
        if (!value || typeof value !== 'object') {
            console.error(`Invalid entry for ${key}:`, value);
            return false;
        }

        // Check if it has valid file or directory structure
        if (value.file) {
            if (!('contents' in value.file)) {
                console.error(`Missing contents in file ${key}`);
                return false;
            }
        } else if (value.directory) {
            if (typeof value.directory !== 'object') {
                console.error(`Invalid directory structure for ${key}`);
                return false;
            }
        } else {
            console.error(`Entry ${key} is neither file nor directory:`, value);
            return false;
        }
    }

    return true;
}

async function applyFileChangesToWebContainer(container, fileTree) {
    console.log("Applying file changes to WebContainer:", fileTree);

    // First, collect all explicit directory entries
    const directories = new Set();

    // Process each path to identify directories
    for (const path in fileTree) {
        try {
            const item = fileTree[path];
            const parts = path.split('/').filter(Boolean);

            if (parts.length === 0) continue;

            // Add parent directories
            if (parts.length > 1) {
                let currentPath = '';
                for (let i = 0; i < parts.length - 1; i++) {
                    currentPath += '/' + parts[i];
                    directories.add(currentPath);
                }
            }

            // Handle explicit directory entries
            if (path.endsWith('/') ||
                (typeof item === 'object' && item.directory) ||
                (typeof item === 'object' && Object.keys(item).length === 0)) {

                // If path ends with /, remove the trailing slash
                const dirPath = path.endsWith('/') ? path.slice(0, -1) : path;
                directories.add(dirPath);
            }
        } catch (err) {
            console.error(`Error processing path ${path}:`, err);
        }
    }

    // Create all directories first
    for (const dir of directories) {
        try {
            console.log(`Creating directory: ${dir}`);
            await container.fs.mkdir(dir, { recursive: true })
                .catch(err => {
                    if (!err.message?.includes('already exists')) {
                        console.error(`Error creating directory ${dir}:`, err);
                    }
                });
        } catch (err) {
            console.error(`Error creating directory ${dir}:`, err);
        }
    }


    for (const path in fileTree) {
        try {
            const item = fileTree[path];

            // Skip directory entries
            if (path.endsWith('/') ||
                (typeof item === 'object' && item.directory) ||
                (typeof item === 'object' && Object.keys(item).length === 0)) {
                continue;
            }

            // Handle file content
            if (typeof item === 'string' || (item.file && item.file.contents)) {
                const content = typeof item === 'string' ? item : item.file.contents;
                console.log(`Writing file: ${path} with ${content.length} characters`);
                await container.fs.writeFile(path, content);
            }
        } catch (err) {
            console.error(`Error writing file ${path}:`, err);
        }
    }
}

function deepMerge(target, source) {
    const output = { ...target };
    if (target && typeof target === 'object' && source && typeof source === 'object') {
        Object.keys(source).forEach(key => {
            if (source[key] && typeof source[key] === 'object' && key in target && target[key] && typeof target[key] === 'object') {
                output[key] = deepMerge(target[key], source[key]);
            } else {
                output[key] = source[key];
            }
        });
    }
    return output;
}



// --- MAIN PROJECT COMPONENT ---
const Project = () => {
    const navigate = useNavigate();
    const { user } = useContext(UserContext);
    const { projectId } = useParams();

    // State
    const [project, setProject] = useState(null);
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [fileTree, setFileTree] = useState({});
    const [nestedFileTree, setNestedFileTree] = useState({});
    const [openFiles, setOpenFiles] = useState(new Map());
    const [currentFilePath, setCurrentFilePath] = useState(null);
    const [webContainer, setWebContainer] = useState(null);
    const [iframeUrl, setIframeUrl] = useState(null);
    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [isProjectLoading, setIsProjectLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [forceUpdate, setForceUpdate] = useState(0);
    const [isCreateFileModalOpen, setIsCreateFileModalOpen] = useState(false);
    const [newFileName, setNewFileName] = useState('');
    const [isCreatingFile, setIsCreatingFile] = useState(false);

    // Refs
    const messageBoxRef = useRef(null);
    const webContainerInitRef = useRef(false);

    // Callbacks
    const handleUserClick = useCallback((id) => {
        setSelectedUserIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    }, []);

    const addCollaborators = useCallback(() => {
        if (!projectId) return;
        setIsLoading(true);

        axios.put("/projects/add-user", { projectId: projectId, users: Array.from(selectedUserIds) })
            .then(res => {
                setIsModalOpen(false);
                if (res.data.project) {

                    axios.get(`/projects/get-project/${projectId}`)
                        .then(projectRes => {
                            setProject(projectRes.data.project);

                            if (isSidePanelOpen) {
                                setIsSidePanelOpen(false);
                                setTimeout(() => setIsSidePanelOpen(true), 100);
                            }
                        })
                        .catch(err => console.error("Error fetching updated project:", err))
                        .finally(() => setIsLoading(false));
                }
            })
            .catch(err => {
                console.error("Error adding collaborators:", err);
                setIsLoading(false);
            });
    }, [projectId, selectedUserIds, isSidePanelOpen]);

    useEffect(() => {
        if (!projectId) {
            navigate('/');
            return;
        }

        const fetchInitialData = async () => {
            setIsProjectLoading(true);
            try {
                const cachedMessages = localStorage.getItem(`project_messages_${projectId}`);
                if (cachedMessages) {
                    try {
                        setMessages(JSON.parse(cachedMessages));
                    } catch (e) {
                        console.error("Failed to parse cached messages");
                    }
                }

                const [projRes, msgRes, usersRes] = await Promise.all([
                    axios.get(`/projects/get-project/${projectId}`),
                    axios.get(`/messages/${projectId}`),
                    axios.get('/users/all')
                ]);
                const initialFlatTree = trimFileTreeKeys(projRes.data.project.fileTree || {});
                setProject(projRes.data.project);
                setFileTree(initialFlatTree);

                // Transform to nested structure for display
                const nested = transformToNested(initialFlatTree);
                setNestedFileTree(nested);
                console.log('Initial nested tree:', nested);

                if (msgRes.data.messages && msgRes.data.messages.length > 0) {
                    setMessages(msgRes.data.messages);
                    // Cache messages for future refreshes
                    localStorage.setItem(`project_messages_${projectId}`, JSON.stringify(msgRes.data.messages));
                }

                setUsers(usersRes.data.users);
            } catch (err) {
                console.error("Error fetching initial data:", err);
                if (err.response?.status === 401 || err.response?.status === 404) {
                    navigate('/home');
                }
            } finally {
                setIsProjectLoading(false);
            }
        };
        fetchInitialData();
    }, [projectId, navigate]);


    useEffect(() => {
        if (isProjectLoading) return;

        const socket = getSocket(projectId, setIsSocketConnected);



        const handleNewMessage = (data) => {
            setMessages(prev => [...prev, data]);

            // Update local storage with new message
            try {
                const cachedMsgs = JSON.parse(localStorage.getItem(`project_messages_${projectId}`) || '[]');
                cachedMsgs.push(data);
                localStorage.setItem(`project_messages_${projectId}`, JSON.stringify(cachedMsgs));
            } catch (e) {
                console.error("Failed to update message cache:", e);
            }

            if (data.sender?._id === 'ai' && data.message && data.message.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(data.message);
                    if (parsed.fileTree && Object.keys(parsed.fileTree).length > 0) {
                        console.log("AI suggested file tree changes:", parsed.fileTree);

                        try {


                            const processedTree = {};


                            Object.entries(parsed.fileTree).forEach(([path, content]) => {
                                const normalizedPath = path.replace(/^\/+|\/+$/g, '');
                                processedTree[normalizedPath] = content;
                                if (normalizedPath.includes('/')) {
                                    const parts = normalizedPath.split('/');
                                    let currentPath = '';
                                    for (let i = 0; i < parts.length - 1; i++) {
                                        currentPath = currentPath
                                            ? `${currentPath}/${parts[i]}`
                                            : parts[i];
                                        if (!processedTree[currentPath]) {
                                            processedTree[currentPath] = { directory: {} };
                                            console.log(`Created directory entry: ${currentPath}`);
                                        }
                                    }
                                }
                            });

                            console.log("Processed tree with explicit directories:", processedTree);

                            setFileTree(prevTree => {
                                const mergedTree = { ...prevTree };

                                Object.entries(processedTree).forEach(([path, content]) => {
                                    mergedTree[path] = content;
                                });

                                // Update nested tree for display
                                const newNestedTree = transformToNested(mergedTree);
                                setNestedFileTree(newNestedTree);

                                if (webContainer) {
                                    applyFileChangesToWebContainer(webContainer, processedTree);
                                }

                                return mergedTree;
                            });

                            setTimeout(() => {
                                setForceUpdate(prev => prev + 1);
                            }, 100);
                        } catch (err) {
                            console.error("Error processing AI file tree:", err);
                        }
                    }
                } catch (e) {
                    console.error("AI message was not a processable JSON object:", e);
                }
            }
        };

        const unsubscribe = attachSocketListener(socket, 'project-message', handleNewMessage);

        if (!webContainerInitRef.current && Object.keys(fileTree).length >= 0) {
            webContainerInitRef.current = true;
            getWebContainer()
                .then(container => {
                    console.log("WebContainer instance created successfully");
                    setWebContainer(container);

                    try {
                        let initialNestedTree = transformToNested(fileTree);
                        console.log("Initial file tree transformed:", Object.keys(initialNestedTree));

                        initialNestedTree = ensureRequiredFiles(initialNestedTree);

                        console.log("Mounting file system with:", Object.keys(initialNestedTree));
                        container.mount(initialNestedTree);

                        container.on('server-ready', (port, url) => {
                            console.log("WebContainer server ready on port:", port);
                            setIframeUrl(url);
                        });
                    } catch (error) {
                        console.error("WebContainer mount error:", error);
                        webContainerInitRef.current = false;
                    }
                })
                .catch(error => {
                    console.error("WebContainer failed to initialize:", error);
                    webContainerInitRef.current = false;
                });
        }

        return () => unsubscribe();
    }, [projectId, isProjectLoading, fileTree, webContainer]);

    const handleFileSelect = useCallback((path, content) => {
        setCurrentFilePath(path);
        setOpenFiles(prev => new Map(prev).set(path, content));
    }, []);

    const handleCodeChange = (path, newContent) => setOpenFiles(prev => new Map(prev).set(path, newContent));

    const handleSaveFile = (path) => {
        const content = openFiles.get(path);
        if (content === undefined || !projectId) return;
        const updateTree = (tree, pathParts, newContent) => {
            const part = pathParts.shift();
            if (!part || !tree[part]) return;
            if (pathParts.length === 0) { if (tree[part].file) tree[part].file.contents = newContent; }
            else { if (tree[part].directory) updateTree(tree[part].directory, pathParts, newContent); }
        };
        const newFileTree = JSON.parse(JSON.stringify(fileTree));
        updateTree(newFileTree, path.split('/').slice(1), content);
        setFileTree(newFileTree);
        axios.put('/projects/update-file-tree', { projectId: projectId, fileTree: newFileTree });
    };

    // Create project from template function
    const createProjectTemplate = useCallback(async (templateType) => {
        let templateMessage = '';

        switch (templateType) {
            case 'html-website':
                templateMessage = 'Create a simple HTML website with index.html, style.css, and script.js files. Include a homepage with navigation, header, and footer.';
                break;
            case 'react-app':
                templateMessage = 'Create a React application with package.json, src/App.js, src/index.js, and src/App.css. Include a simple counter component.';
                break;
            case 'express-api':
                templateMessage = 'Create an Express.js API with package.json, server.js, and routes folder. Include basic REST endpoints and middleware.';
                break;
            case 'calculator':
                templateMessage = 'Create a web-based calculator with HTML, CSS, and JavaScript. Include all basic math operations with a clean UI.';
                break;
            case 'portfolio':
                templateMessage = 'Create a personal portfolio website with sections for about, projects, skills, and contact. Use modern HTML, CSS, and JavaScript.';
                break;
            default:
                templateMessage = `Create a ${templateType} project with appropriate file structure and basic functionality.`;
        }

        if (!projectId || !isSocketConnected) return;

        const payload = {
            projectId,
            message: templateMessage,
            sender: { _id: user._id, email: user.email }
        };

        sendSocketMessage(getSocket(projectId), 'project-message', payload);
    }, [projectId, user, isSocketConnected]);

    const sendMessage = useCallback(() => {
        console.log("Attempting to send message. Checking conditions:", {
            isMessageEmpty: !message.trim(),
            isProjectIdMissing: !projectId,
            isSocketDisconnected: !isSocketConnected,
        });

        if (!message.trim() || !projectId || !isSocketConnected) return;

        const payload = { projectId, message, sender: { _id: user._id, email: user.email } };
        sendSocketMessage(getSocket(projectId), 'project-message', payload);

        // Also save to local storage cache
        const newMsg = { ...payload, timestamp: new Date().toISOString(), _id: Date.now().toString() };
        const cachedMsgs = JSON.parse(localStorage.getItem(`project_messages_${projectId}`) || '[]');
        cachedMsgs.push(newMsg);
        localStorage.setItem(`project_messages_${projectId}`, JSON.stringify(cachedMsgs));

        setMessage("");
    }, [message, projectId, user, isSocketConnected]);

    // Create new file function
    const createNewFile = useCallback(async (fileName, content = '', template = null) => {
        if (!fileName.trim() || !projectId) return;

        setIsCreatingFile(true);
        try {
            let fileContent = content;
            const normalizedPath = fileName.startsWith('/') ? fileName.slice(1) : fileName;

            // Check if this should be a folder
            const isFolder = fileName.endsWith('/') || fileName.endsWith('\\') ||
                (!fileName.includes('.') && fileName.includes('/'));

            // Handle folder creation
            if (isFolder) {
                const folderPath = normalizedPath.replace(/[\/\\]+$/, ''); // Remove trailing slashes

                console.log('Creating folder:', folderPath);

                // Update fileTree (flat structure for backend)
                const newFileTree = { ...fileTree };
                newFileTree[folderPath] = { directory: {} };

                setFileTree(newFileTree);

                // Update nested tree for display
                const newNestedTree = transformToNested(newFileTree);
                setNestedFileTree(newNestedTree);

                // Update WebContainer
                if (webContainer) {
                    try {
                        await webContainer.fs.mkdir(folderPath, { recursive: true });
                        console.log(`Created folder: ${folderPath}`);
                    } catch (err) {
                        console.error('Error creating folder in WebContainer:', err);
                    }
                }

                // Update backend
                try {
                    await axios.put('/projects/update-file-tree', {
                        projectId: projectId,
                        fileTree: newFileTree
                    });
                } catch (err) {
                    console.error('Error updating file tree on backend:', err);
                }

                setIsCreateFileModalOpen(false);
                setNewFileName('');
                setForceUpdate(prev => prev + 1);
                setIsCreatingFile(false);
                return;
            }

            if (template) {
                switch (template) {
                    case 'html':
                        fileContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Project</title>
</head>
<body>
    <h1>Hello World!</h1>
    <p>Welcome to my project!</p>
</body>
</html>`;
                        break;
                    case 'javascript':
                        fileContent = `// Welcome to your new JavaScript file
console.log('Hello, World!');

// Add your code here
function main() {
    // Your main code
}

main();`;
                        break;
                    case 'css':
                        fileContent = `/* Your CSS styles */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f0f0f0;
}

h1 {
    color: #333;
    text-align: center;
}`;
                        break;
                    case 'react':
                        fileContent = `import React, { useState } from 'react';

function MyComponent() {
    const [count, setCount] = useState(0);

    return (
        <div>
            <h1>Count: {count}</h1>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
}

export default MyComponent;`;
                        break;
                    case 'json':
                        fileContent = `{
    "name": "my-project",
    "version": "1.0.0",
    "description": "A new project",
    "main": "index.js",
    "scripts": {
        "start": "node index.js"
    }
}`;
                        break;
                }
            }

            // Update fileTree (flat structure for backend)
            const newFileTree = { ...fileTree };
            newFileTree[normalizedPath] = fileContent;

            // Create directories if needed in flat structure
            const pathParts = normalizedPath.split('/');
            if (pathParts.length > 1) {
                let currentPath = '';
                for (let i = 0; i < pathParts.length - 1; i++) {
                    currentPath = currentPath ? `${currentPath}/${pathParts[i]}` : pathParts[i];
                    if (!newFileTree[currentPath]) {
                        newFileTree[currentPath + '/'] = { directory: {} };
                    }
                }
            }

            setFileTree(newFileTree);

            // Update nested tree for display
            const newNestedTree = transformToNested(newFileTree);
            setNestedFileTree(newNestedTree);

            // Update WebContainer
            if (webContainer) {
                try {
                    if (pathParts.length > 1) {
                        const dirPath = pathParts.slice(0, -1).join('/');
                        await webContainer.fs.mkdir(dirPath, { recursive: true });
                    }
                    await webContainer.fs.writeFile(normalizedPath, fileContent);
                    console.log(`Created file: ${normalizedPath}`);
                } catch (err) {
                    console.error('Error creating file in WebContainer:', err);
                }
            }

            // Update backend
            try {
                await axios.put('/projects/update-file-tree', {
                    projectId: projectId,
                    fileTree: newFileTree
                });
            } catch (err) {
                console.error('Error updating file tree on backend:', err);
            }

            // Open the new file
            setOpenFiles(prev => new Map(prev).set(normalizedPath, fileContent));
            setCurrentFilePath(normalizedPath);

            setIsCreateFileModalOpen(false);
            setNewFileName('');
            setForceUpdate(prev => prev + 1);
        } catch (err) {
            console.error('Error creating new file:', err);
        } finally {
            setIsCreatingFile(false);
        }
    }, [fileTree, projectId, webContainer]);

    const runProject = useCallback(async () => {
        if (!webContainer) {
            console.error("WebContainer not initialized");
            return;
        }

        try {
            console.log("Starting project...");

            let packageJsonExists = false;
            try {
                await webContainer.fs.readFile('package.json');
                packageJsonExists = true;
            } catch (err) {
                console.log("Creating minimal package.json");
                await webContainer.fs.writeFile('package.json', JSON.stringify({
                    name: "webcontainer-project",
                    version: "1.0.0",
                    scripts: { start: "npx serve ." },
                }, null, 2));
            }

            try {
                await webContainer.fs.readFile('index.html');
            } catch (err) {
                console.log("Creating minimal index.html");
                await webContainer.fs.writeFile('index.html', `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Project</title>
                </head>
                <body>
                    <h1>WebContainer Project</h1>
                    <p>Edit files to start building your project!</p>
                </body>
                </html>
            `);
            }

            console.log("Installing dependencies...");
            const installProcess = await webContainer.spawn('npm', ['install']);
            const installExitCode = await installProcess.exit;

            if (installExitCode !== 0) {
                console.warn("npm install exited with code:", installExitCode);
            }

            console.log("Starting server...");
            await webContainer.spawn('npm', ['start']);
        } catch (error) {
            console.error("Error running project:", error);
        }
    }, [webContainer]);

    useEffect(() => { messageBoxRef.current?.scroll({ top: messageBoxRef.current.scrollHeight, behavior: 'smooth' }) }, [messages]);

    if (isProjectLoading || !project) { return <div className="flex items-center justify-center h-screen">Loading Project...</div> }

    const currentFileContent = openFiles.get(currentFilePath);

    return (
        <div className='h-screen w-screen flex bg-slate-50 overflow-auto'>
            <section className="relative flex flex-col h-screen w-96 bg-white border-r">
                <header className='flex justify-between items-center p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0'>
                    <h2 className="font-semibold flex items-center gap-2"><MessageSquare size={18} /> Project Chat</h2>
                    <div className="flex items-center space-x-1">
                        <button onClick={() => setIsModalOpen(true)} className='p-2 hover:bg-white/20 rounded-lg'><Plus size={16} /></button>
                        <button onClick={() => setIsSidePanelOpen(true)} className='p-2 hover:bg-white/20 rounded-lg'><Users size={16} /></button>
                    </div>
                </header>
                <div ref={messageBoxRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={msg._id || index} className={`flex gap-3 items-end ${msg.sender._id === user._id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3 ${msg.sender._id === user._id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-slate-800 border'
                                }`}>
                                <div className={`font-bold text-xs mb-1 ${msg.sender._id === user._id ? 'text-blue-200' : 'text-slate-500'}`}>
                                    {msg.sender.email || 'AI Assistant'}
                                </div>
                                <WriteAiMessage rawMessage={msg.message} />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t bg-white"><div className="flex items-center gap-2"><input value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} disabled={!isSocketConnected} className='flex-grow p-3 border rounded-xl' placeholder='Type your message...' /><button onClick={sendMessage} disabled={!isSocketConnected} className='p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50'><Send size={16} /></button></div></div>
                <div className={`sidePanel w-full h-full flex flex-col bg-white absolute transition-transform duration-300 ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'} top-0 z-10`}><header className='flex justify-between items-center p-4 border-b'><h1 className='font-semibold text-lg'>Collaborators</h1><button onClick={() => setIsSidePanelOpen(false)} className='p-2 hover:bg-slate-100 rounded-lg'><X size={16} /></button></header><div className="users flex flex-col p-4 space-y-2 overflow-y-auto">{project.users?.map(u => (<div key={u._id} className="user p-3 flex gap-3 items-center rounded-xl"><div className='w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-semibold'>{(u.email?.charAt(0) || '?').toUpperCase()}</div><div><h1 className='font-semibold'>{u.email}</h1></div></div>))}</div></div>
            </section>

            <main className="flex-grow h-full flex">
                <div className="explorer h-full w-64 bg-slate-100 border-r flex flex-col">
                    <div className="p-4 border-b bg-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FolderIcon className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold">Files</h3>
                        </div>
                        <button
                            onClick={() => setIsCreateFileModalOpen(true)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Create new file"
                        >
                            <Plus className="w-4 h-4 text-slate-600" />
                        </button>
                    </div>
                    <div className="file-tree flex-grow overflow-y-auto p-2" key={forceUpdate}>
                        {Object.keys(nestedFileTree).length > 0 ? (
                            Object.entries(nestedFileTree).map(([name, item]) => (
                                <FileTreeItem
                                    key={`${name}-${forceUpdate}`}
                                    name={name}
                                    item={item}
                                    path={name}
                                    onFileSelect={handleFileSelect}
                                />
                            ))
                        ) : (
                            <div className="p-4 space-y-4">
                                <div className="text-center text-sm text-slate-500">
                                    <FolderIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                    <p className="font-medium">No files yet</p>
                                    <p className="text-xs">Start by creating files or using templates</p>
                                </div>

                                <div className="space-y-2">
                                    <button
                                        onClick={() => setIsCreateFileModalOpen(true)}
                                        className="w-full p-2 text-left text-sm hover:bg-white rounded-lg border-dashed border-2 border-slate-300 hover:border-blue-400 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Plus className="w-4 h-4 text-slate-400" />
                                            <span className="text-slate-600">Create new file</span>
                                        </div>
                                    </button>

                                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide px-2 pt-2">
                                        Quick Templates
                                    </div>

                                    <div className="grid grid-cols-1 gap-1">
                                        <button
                                            onClick={() => createProjectTemplate('html-website')}
                                            className="p-2 text-left text-xs hover:bg-white rounded-lg transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Globe className="w-3 h-3 text-orange-500" />
                                                <span>HTML Website</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => createProjectTemplate('react-app')}
                                            className="p-2 text-left text-xs hover:bg-white rounded-lg transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Zap className="w-3 h-3 text-blue-500" />
                                                <span>React App</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => createProjectTemplate('calculator')}
                                            className="p-2 text-left text-xs hover:bg-white rounded-lg transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Calculator className="w-3 h-3 text-green-500" />
                                                <span>Calculator</span>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => createProjectTemplate('portfolio')}
                                            className="p-2 text-left text-xs hover:bg-white rounded-lg transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Palette className="w-3 h-3 text-purple-500" />
                                                <span>Portfolio Site</span>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="code-area flex flex-col flex-grow h-full">
                    {/* File Tabs */}
                    {openFiles.size > 0 && (
                        <div className="flex bg-[#2d2d30] border-b border-[#3e3e42] overflow-x-auto">
                            {Array.from(openFiles.keys()).map(path => (
                                <div
                                    key={path}
                                    className={`flex items-center min-w-0 ${currentFilePath === path ? 'bg-[#1e1e1e] border-t-2 border-blue-500' : 'hover:bg-[#333333]'}`}
                                >
                                    <button
                                        onClick={() => setCurrentFilePath(path)}
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-white min-w-0"
                                    >
                                        <Code size={14} className="flex-shrink-0" />
                                        <span className="truncate">{path.split('/').pop()}</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            const newOpenFiles = new Map(openFiles);
                                            newOpenFiles.delete(path);
                                            setOpenFiles(newOpenFiles);
                                            if (currentFilePath === path) {
                                                const remaining = Array.from(newOpenFiles.keys());
                                                setCurrentFilePath(remaining.length > 0 ? remaining[0] : null);
                                            }
                                        }}
                                        className="px-2 py-2 text-gray-400 hover:text-white hover:bg-red-500/20"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <CodeEditor
                        currentFilePath={currentFilePath}
                        currentFileContent={openFiles.get(currentFilePath)}
                        onCodeChange={handleCodeChange}
                        onSaveFile={handleSaveFile}
                        webContainer={webContainer}
                        fileTree={fileTree}
                        onRunProject={runProject}
                        onFileTreeUpdate={(newFileTree) => {
                            console.log("AI suggested file tree changes:", newFileTree);
                            setFileTree(prevTree => {
                                const mergedTree = { ...prevTree, ...newFileTree };
                                if (webContainer) {
                                    applyFileChangesToWebContainer(webContainer, newFileTree);
                                }
                                setTimeout(() => setForceUpdate(prev => prev + 1), 100);
                                return mergedTree;
                            });
                        }}
                    />
                </div>

                {iframeUrl && (
                    <div className="w-1/3 h-full border-l bg-white flex flex-col">
                        <div className="p-3 border-b flex items-center gap-2">
                            <Monitor size={16} /> Preview
                        </div>
                        <iframe
                            src={iframeUrl}
                            className="w-full h-full"
                            title="WebContainer Preview"
                        ></iframe>
                    </div>
                )}
            </main>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <header className='flex justify-between items-center p-6 border-b'>
                            <h2 className='text-xl font-bold'>Add Collaborators</h2>
                            <button onClick={() => setIsModalOpen(false)} className='p-2 hover:bg-slate-100 rounded-lg'>
                                <X size={16} />
                            </button>
                        </header>
                        <div className="users-list p-6 max-h-96 overflow-auto">
                            <div className="space-y-2">
                                {users.filter(u => u._id !== user._id).map(u => (
                                    <div
                                        key={u._id}
                                        className={`user cursor-pointer p-3 flex gap-3 items-center border rounded-xl ${selectedUserIds.has(u._id) ? 'bg-blue-50 border-blue-200' : ''}`}
                                        onClick={() => handleUserClick(u._id)}
                                    >
                                        <div className='w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-semibold'>
                                            {(u.email?.charAt(0) || '?').toUpperCase()}
                                        </div>
                                        <div className="flex-grow">
                                            <h1 className='font-semibold'>{u.email}</h1>
                                        </div>
                                        {selectedUserIds.has(u._id) && (
                                            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                                <ChevronRight className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 border-t">
                            <button
                                onClick={addCollaborators}
                                disabled={selectedUserIds.size === 0}
                                className='w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold disabled:opacity-50'
                            >
                                Add {selectedUserIds.size} Collaborator{selectedUserIds.size !== 1 ? 's' : ''}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create File Modal */}
            {isCreateFileModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                        <header className='flex justify-between items-center p-6 border-b'>
                            <h2 className='text-xl font-bold'>Create New File or Folder</h2>
                            <button
                                onClick={() => {
                                    setIsCreateFileModalOpen(false);
                                    setNewFileName('');
                                }}
                                className='p-2 hover:bg-slate-100 rounded-lg'
                            >
                                <X size={16} />
                            </button>
                        </header>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={newFileName}
                                    onChange={(e) => setNewFileName(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && newFileName.trim()) {
                                            createNewFile(newFileName.trim());
                                        }
                                    }}
                                    placeholder="e.g. index.html, app.js, src/ (for folder)"
                                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    autoFocus
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    End with / to create a folder (e.g. "src/")
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        if (!newFileName.trim()) return;
                                        const folderName = newFileName.trim();
                                        // Ensure it's treated as a folder by adding trailing slash
                                        const folderPath = folderName.endsWith('/') ? folderName : folderName + '/';
                                        createNewFile(folderPath);
                                    }}
                                    className="flex-1 p-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <FolderIcon className="w-4 h-4 text-blue-500" />
                                        <span>Create Folder</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => {
                                        if (!newFileName.trim()) return;
                                        createNewFile(newFileName.trim());
                                    }}
                                    className="flex-1 p-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <FileText className="w-4 h-4 text-gray-500" />
                                        <span>Create File</span>
                                    </div>
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    File Templates
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => {
                                            setNewFileName('index.html');
                                            createNewFile('index.html', '', 'html');
                                        }}
                                        className="p-3 text-left border rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Globe className="w-4 h-4 text-orange-500" />
                                            <span className="font-medium text-sm">HTML</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Basic HTML template</p>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setNewFileName('script.js');
                                            createNewFile('script.js', '', 'javascript');
                                        }}
                                        className="p-3 text-left border rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Code className="w-4 h-4 text-yellow-500" />
                                            <span className="font-medium text-sm">JavaScript</span>
                                        </div>
                                        <p className="text-xs text-slate-500">JavaScript file</p>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setNewFileName('style.css');
                                            createNewFile('style.css', '', 'css');
                                        }}
                                        className="p-3 text-left border rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Palette className="w-4 h-4 text-blue-500" />
                                            <span className="font-medium text-sm">CSS</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Stylesheet</p>
                                    </button>

                                    <button
                                        onClick={() => {
                                            setNewFileName('package.json');
                                            createNewFile('package.json', '', 'json');
                                        }}
                                        className="p-3 text-left border rounded-lg hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <Database className="w-4 h-4 text-green-500" />
                                            <span className="font-medium text-sm">JSON</span>
                                        </div>
                                        <p className="text-xs text-slate-500">Data file</p>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t flex gap-3">
                            <button
                                onClick={() => {
                                    setIsCreateFileModalOpen(false);
                                    setNewFileName('');
                                }}
                                className='flex-1 px-4 py-2 border rounded-lg hover:bg-slate-50 font-medium'
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => newFileName.trim() && createNewFile(newFileName.trim())}
                                disabled={!newFileName.trim() || isCreatingFile}
                                className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50'
                            >
                                {isCreatingFile ? 'Creating...' : 'Create File'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Project;