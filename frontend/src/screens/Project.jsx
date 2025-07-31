import React, { useState, useEffect, useContext, useRef, useCallback, memo } from 'react';
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
    MessageSquare, Code, Monitor, ChevronRight, User as UserIcon
} from 'lucide-react';

// --- HELPER FUNCTIONS ---
function trimFileTreeKeys(tree) {
    if (!tree || typeof tree !== 'object') return tree;
    return Object.keys(tree).reduce((acc, key) => {
        const trimmedKey = key.trim();
        acc[trimmedKey] = trimFileTreeKeys(tree[key]);
        return acc;
    }, {});
}

function transformToNested(flatTree) {
    const nestedTree = {};
    for (const path in flatTree) {
        const parts = path.split('/');
        let currentLevel = nestedTree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i < parts.length - 1) { // It's a directory
                if (!currentLevel[part]) {
                    currentLevel[part] = { directory: {} };
                }
                currentLevel = currentLevel[part].directory;
            } else { // It's the file
                currentLevel[part] = flatTree[path];
            }
        }
    }
    return nestedTree;
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

// --- HELPER COMPONENTS ---
const FileTreeItem = memo(({ name, item, path, onFileSelect }) => { /* ... (user's implementation) */ });
const SyntaxHighlightedCode = memo(({ language, code }) => { /* ... (user's implementation) */ });
const WriteAiMessage = memo(({ rawMessage }) => { /* ... (user's implementation) */ });

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
        axios.put("/projects/add-user", { projectId: projectId, users: Array.from(selectedUserIds) })
            .then(res => {
                setIsModalOpen(false);
                if (res.data.project) {
                    setProject(res.data.project);
                }
            })
            .catch(err => console.error("Error adding collaborators:", err));
    }, [projectId, selectedUserIds]);

    // Data fetching useEffect
    useEffect(() => {
        if (!projectId) { 
            navigate('/home'); 
            return; 
        }

        const fetchInitialData = async () => {
            setIsProjectLoading(true);
            try {
                const [projRes, msgRes, usersRes] = await Promise.all([
                    axios.get(`/projects/get-project/${projectId}`),
                    axios.get(`/messages/${projectId}`),
                    axios.get('/users/all')
                ]);
                const initialFlatTree = trimFileTreeKeys(projRes.data.project.fileTree || {});
                setProject(projRes.data.project);
                setFileTree(initialFlatTree);
                setMessages(msgRes.data.messages);
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

    // WebContainer and Sockets useEffect
    useEffect(() => {
        if (isProjectLoading) return;

        const socket = getSocket(projectId, setIsSocketConnected);

        const handleNewMessage = (data) => {
            setMessages(prev => [...prev, data]);
            if (data.sender?._id === 'ai' && data.message && data.message.trim().startsWith('{')) {
                try {
                    const parsed = JSON.parse(data.message);
                    if (parsed.fileTree && Object.keys(parsed.fileTree).length > 0) {
                        const flatTreeFromAI = trimFileTreeKeys(parsed.fileTree);
                        const nestedTreeForMount = transformToNested(flatTreeFromAI);
                        setFileTree(prevTree => deepMerge(prevTree, flatTreeFromAI));
                        webContainer?.mount(nestedTreeForMount);
                    }
                } catch (e) {
                    console.error("AI message was not a processable JSON object:", e);
                }
            }
        };

        const unsubscribe = attachSocketListener(socket, 'project-message', handleNewMessage);

        if (!webContainerInitRef.current && Object.keys(fileTree).length > 0) {
            webContainerInitRef.current = true;
            getWebContainer().then(container => {
                setWebContainer(container);
                const initialNestedTree = transformToNested(fileTree);
                container.mount(initialNestedTree);
                container.on('server-ready', (port, url) => setIframeUrl(url));
            }).catch(error => {
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
    
    // ✅ DEBUGGING VERSION of sendMessage
    const sendMessage = useCallback(() => {
        // This log will tell us exactly which condition is failing
        console.log("Attempting to send message. Checking conditions:", {
            isMessageEmpty: !message.trim(),
            isProjectIdMissing: !projectId,
            isSocketDisconnected: !isSocketConnected,
        });

        if (!message.trim() || !projectId || !isSocketConnected) return;

        const payload = { projectId, message, sender: { _id: user._id, email: user.email }};
        sendSocketMessage(getSocket(projectId), 'project-message', payload);
        setMessage("");
    }, [message, projectId, user, isSocketConnected]);

    const runProject = useCallback(async () => {
        if (!webContainer || !fileTree["package.json"]) return;
        const installProcess = await webContainer.spawn("npm", ["install"]);
        await installProcess.exit;
        await webContainer.spawn("npm", ["start"]);
    }, [webContainer, fileTree]);
    
    useEffect(() => { messageBoxRef.current?.scroll({ top: messageBoxRef.current.scrollHeight, behavior: 'smooth' }) }, [messages]);

    if (isProjectLoading || !project) { return <div className="flex items-center justify-center h-screen">Loading Project...</div> }

    const currentFileContent = openFiles.get(currentFilePath);

    return (
        <div className='h-screen w-screen flex bg-slate-50 overflow-hidden'>
            <section className="relative flex flex-col h-screen w-96 bg-white border-r">
                <header className='flex justify-between items-center p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0'>
                    <h2 className="font-semibold flex items-center gap-2"><MessageSquare size={18}/> Project Chat</h2>
                    <div className="flex items-center space-x-1">
                        <button onClick={() => setIsModalOpen(true)} className='p-2 hover:bg-white/20 rounded-lg'><Plus size={16} /></button>
                        <button onClick={() => setIsSidePanelOpen(true)} className='p-2 hover:bg-white/20 rounded-lg'><Users size={16} /></button>
                    </div>
                </header>
                <div ref={messageBoxRef} className="flex-grow p-4 space-y-4 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={msg._id || index} className={`flex gap-3 items-end ${msg.sender._id === user._id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] rounded-2xl p-3 ${
                                msg.sender._id === user._id 
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
                <div className="p-4 border-t bg-white"><div className="flex items-center gap-2"><input value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} disabled={!isSocketConnected} className='flex-grow p-3 border rounded-xl' placeholder='Type your message...'/><button onClick={sendMessage} disabled={!isSocketConnected} className='p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50'><Send size={16} /></button></div></div>
                <div className={`sidePanel w-full h-full flex flex-col bg-white absolute transition-transform duration-300 ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'} top-0 z-10`}><header className='flex justify-between items-center p-4 border-b'><h1 className='font-semibold text-lg'>Collaborators</h1><button onClick={() => setIsSidePanelOpen(false)} className='p-2 hover:bg-slate-100 rounded-lg'><X size={16} /></button></header><div className="users flex flex-col p-4 space-y-2 overflow-y-auto">{project.users?.map(u => (<div key={u._id} className="user p-3 flex gap-3 items-center rounded-xl"><div className='w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-semibold'>{(u.email?.charAt(0) || '?').toUpperCase()}</div><div><h1 className='font-semibold'>{u.email}</h1></div></div>))}</div></div>
            </section>
            
            <main className="flex-grow h-full flex">
                <div className="explorer h-full w-64 bg-slate-100 border-r flex flex-col">
                    <div className="p-4 border-b bg-white flex items-center gap-2"><FolderIcon className="w-5 h-5 text-blue-600" /><h3 className="font-semibold">Files</h3></div>
                    <div className="file-tree flex-grow overflow-y-auto p-2">
                        {Object.keys(fileTree).length > 0 ? (
                            Object.entries(fileTree).map(([name, item]) => (
                                <FileTreeItem key={name} name={name} item={item} path={`/${name}`} onFileSelect={handleFileSelect}/>
                            ))
                        ) : (
                            <div className="p-4 text-center text-sm text-slate-500">
                                <p>No files in this project.</p>
                                <p className="mt-2">Ask the AI to create some!</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="code-editor flex flex-col flex-grow h-full">
                    <div className="flex justify-between items-center bg-white border-b p-2"><div className="flex">{Array.from(openFiles.keys()).map(path => (<button key={path} onClick={() => setCurrentFilePath(path)} className={`px-4 py-2 flex items-center gap-2 rounded-lg text-sm ${currentFilePath === path ? 'bg-blue-100 text-blue-700' : 'hover:bg-slate-100'}`}><Code size={14}/> {path.split('/').pop()}</button>))}</div><button onClick={runProject} disabled={!webContainer} className='flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50'><Play size={14} /> Run</button></div>
                    <div className="flex-grow bg-[#282c34] text-white overflow-hidden relative">{currentFilePath && currentFileContent !== undefined ? (<><textarea value={currentFileContent} onChange={(e) => handleCodeChange(currentFilePath, e.target.value)} onBlur={() => handleSaveFile(currentFilePath)} className="w-full h-full p-4 bg-transparent border-none outline-none resize-none font-mono text-sm" style={{ color: 'transparent', caretColor: 'white' }} /><div className="absolute top-0 left-0 w-full h-full p-4 pointer-events-none overflow-auto" aria-hidden="true"><SyntaxHighlightedCode language="javascript" code={currentFileContent} /></div></>) : (<div className="flex items-center justify-center h-full text-slate-400">Choose a file to begin editing.</div>)}</div>
                </div>

                {iframeUrl && (<div className="w-1/3 h-full border-l bg-white flex flex-col"><div className="p-3 border-b flex items-center gap-2"><Monitor size={16}/> Preview</div><iframe src={iframeUrl} className="w-full h-full" title="WebContainer Preview"></iframe></div>)}
            </main>
            
            {isModalOpen && (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"><header className='flex justify-between items-center p-6 border-b'><h2 className='text-xl font-bold'>Add Collaborators</h2><button onClick={() => setIsModalOpen(false)} className='p-2 hover:bg-slate-100 rounded-lg'><X size={16} /></button></header><div className="users-list p-6 max-h-96 overflow-auto"><div className="space-y-2">{users.filter(u => u._id !== user._id).map(u => (<div key={u._id} className={`user cursor-pointer p-3 flex gap-3 items-center border rounded-xl ${selectedUserIds.has(u._id) ? 'bg-blue-50 border-blue-200' : ''}`} onClick={() => handleUserClick(u._id)}><div className='w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-semibold'>{(u.email?.charAt(0) || '?').toUpperCase()}</div><div className="flex-grow"><h1 className='font-semibold'>{u.email}</h1></div>{selectedUserIds.has(u._id) && (<div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center"><ChevronRight className="w-3 h-3 text-white"/></div>)}</div>))}</div></div><div className="p-6 border-t"><button onClick={addCollaborators} disabled={selectedUserIds.size === 0} className='w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold disabled:opacity-50'>Add {selectedUserIds.size} Collaborator{selectedUserIds.size !== 1 ? 's' : ''}</button></div></div></div>)}
        </div>
    );
};

export default Project;