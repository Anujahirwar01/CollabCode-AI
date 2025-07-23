// frontend/src/screens/Project.jsx
import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import { UserContext } from '../context/user.context';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../config/axios';
import { getSocket, attachSocketListener, sendSocketMessage, disconnectSocket } from '../config/socket';
import Markdown from 'markdown-to-jsx';
import hljs from 'highlight.js';
import { getWebContainer } from '../config/webcontainer';
import {
    Plus, Users, X, Send, Play, File, Folder,
    Settings, MessageSquare, Code, Monitor, ChevronRight, Bot, User as UserIcon
} from 'lucide-react';

function SyntaxHighlightedCode(props) {
    const ref = useRef(null);
    useEffect(() => {
        if (ref.current && props.className?.includes('lang-') && window.hljs) {
            window.hljs.highlightElement(ref.current);
            ref.current.removeAttribute('data-highlighted');
        }
    }, [props.className, props.children]);
    return <code {...props} ref={ref} />;
}

const Project = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(new Set());
    const [project, setProject] = useState(location.state?.project || null);
    const [message, setMessage] = useState('');
    const { user } = useContext(UserContext);
    const messageBoxRef = useRef(null);

    const [users, setUsers] = useState([]);
    const [messages, setMessages] = useState([]);
    const [fileTree, setFileTree] = useState({});
    const [currentFile, setCurrentFile] = useState(null);
    const [openFiles, setOpenFiles] = useState([]);
    const [webContainer, setWebContainer] = useState(null);
    const [iframeUrl, setIframeUrl] = useState(null);
    const [runProcess, setRunProcess] = useState(null);

    const [isSocketConnected, setIsSocketConnected] = useState(false);
    const [isProjectLoading, setIsProjectLoading] = useState(true);

    const webContainerInitRef = useRef(false);

    const handleUserClick = useCallback((id) => {
        setSelectedUserId(prevSelectedUserId => {
            const newSelectedUserId = new Set(prevSelectedUserId);
            if (newSelectedUserId.has(id)) {
                newSelectedUserId.delete(id);
            } else {
                newSelectedUserId.add(id);
            }
            return newSelectedUserId;
        });
    }, []);

    const addCollaborators = useCallback(() => {
        if (!project?._id) {
            console.error("Project ID is missing, cannot add collaborators.");
            return;
        }
        axios.put("/projects/add-user", {
            projectId: project._id,
            users: Array.from(selectedUserId)
        })
        .then(res => {
            console.log(res.data);
            setIsModalOpen(false);
            if (res.data.updatedProject) {
                setProject(prev => ({ ...prev, users: res.data.updatedProject.users }));
            }
        })
        .catch(err => {
            console.error("Error adding collaborators:", err);
        });
    }, [project?._id, selectedUserId]);

    const send = useCallback(() => {
        if (!message.trim()) return;

        if (!isSocketConnected || isProjectLoading) {
            console.warn("Message not sent: Socket not connected or project loading. Please wait.");
            return;
        }
        if (!project?._id) {
            console.error("Cannot send message: Project ID is not loaded.");
            return;
        }

        sendSocketMessage(getSocket(project._id, setIsSocketConnected), 'project-message', {
            projectId: project._id, message, sender: { _id: user._id, email: user.email }
        });
        setMessages(prevMessages => [...prevMessages, { sender: user, message }]);
        setMessage("");
    }, [message, isSocketConnected, isProjectLoading, project?._id, user?._id, user?.email]);

    const WriteAiMessage = useCallback((rawMessage) => {
        let messageObject;
        try {
            messageObject = JSON.parse(rawMessage);
        } catch (e) {
            messageObject = { text: rawMessage };
        }
        return (
            <div className='overflow-auto bg-slate-900 text-green-400 rounded-xl p-4 border border-slate-700'>
                <Markdown
                    children={typeof messageObject.text === 'string' ? messageObject.text : ''}
                    options={{ overrides: { code: SyntaxHighlightedCode } }}
                />
            </div>
        );
    }, []);

    // --- EFFECT 1: Fetch initial project data and messages ---
    useEffect(() => {
        const fetchInitialProjectData = async () => {
            setIsProjectLoading(true);
            const projectIdFromLocation = location.state?.project?._id;
            if (!projectIdFromLocation) { navigate('/home'); return; }
            try {
                const projectRes = await axios.get(`/projects/get-project/${projectIdFromLocation}`);
                setProject(projectRes.data.project);
                setFileTree(projectRes.data.project.fileTree || {});
                const messagesRes = await axios.get(`/projects/${projectIdFromLocation}/messages`);
                setMessages(messagesRes.data.messages);
            } catch (err) {
                console.error("Error fetching initial project data or messages:", err);
                if (err.response?.status === 401) navigate('/login');
                else if (err.response?.status === 404) console.log("Project messages endpoint not found.");
            } finally { setIsProjectLoading(false); }
        };
        fetchInitialProjectData();
        axios.get('/users/all')
            .then(res => setUsers(res.data.users))
            .catch(err => console.log("Error fetching all users:", err));
    }, [location.state?.project?._id, navigate, user?.token]);

    // --- EFFECT 2: Socket.IO and WebContainer setup ---
    useEffect(() => {
        if (!project?._id || isProjectLoading) {
            console.log("Project.jsx: Waiting for project data to load before socket/webcontainer setup.");
            return;
        }

        console.log("Project.jsx: Initializing Socket.IO and WebContainer setup for project:", project._id);

        const currentSocket = getSocket(project._id, setIsSocketConnected);
        const unsubscribeListener = attachSocketListener(currentSocket, 'project-message', data => {
            console.log("Raw incoming message data (WebSocket):", data);
            if (data.sender && data.sender._id === 'ai') {
                let aiText = ''; let aiFileTree = {};
                try {
                    const parsedMessage = JSON.parse(data.message);
                    aiText = typeof parsedMessage.text === 'string' ? parsedMessage.text : data.message;
                    aiFileTree = (parsedMessage.fileTree && typeof parsedMessage.fileTree === 'object') ? parsedMessage.fileTree : {};
                } catch (e) { console.warn("AI message received is not valid JSON, treating as plain text:", data.message, e); aiText = data.message; }
                webContainer?.mount(aiFileTree);
                if (Object.keys(aiFileTree).length > 0) { setFileTree(aiFileTree); }
                const messageForDisplay = { ...data, message: JSON.stringify({ text: aiText, fileTree: aiFileTree }) };
                setMessages(prevMessages => [...prevMessages, messageForDisplay]);
            } else { setMessages(prevMessages => [...prevMessages, data]); }
        });

        if (!webContainerInitRef.current) {
            webContainerInitRef.current = true;
            getWebContainer().then(container => {
                setWebContainer(container);
                console.log("WebContainer started.");
            }).catch(error => {
                console.error("Failed to start WebContainer:", error);
                webContainerInitRef.current = false;
            });
        }

        return () => {
            console.log("Project.jsx: Running Socket/WebContainer useEffect cleanup for project ID:", project._id);
            unsubscribeListener();
        };
    }, [project?._id, isProjectLoading, setIsSocketConnected]);

    useEffect(() => {
        const scrollToBottom = () => {
            requestAnimationFrame(() => {
                if (messageBoxRef.current) {
                    messageBoxRef.current.scrollTop = messageBoxRef.current.scrollHeight;
                }
            });
        };
        scrollToBottom();
    }, [messages]);

    function saveFileTree(ft) {
        if (!project?._id) return;
        axios.put('/projects/update-file-tree', {
            projectId: project._id,
            fileTree: ft
        })
        .then(res => console.log("File tree updated:", res.data))
        .catch(err => console.error("Error saving file tree:", err));
    }

    if (isProjectLoading || !project?._id) {
        return (
            <div className="flex items-center justify-center h-screen w-screen bg-slate-50">
                <p className="text-xl text-slate-600">Loading project...</p>
            </div>
        );
    }

    return (
        <div className='h-screen w-screen flex bg-slate-50'>
            <section className="left relative flex flex-col h-screen w-96 bg-white border-r border-slate-200 shadow-lg">
                <header className='flex justify-between items-center p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex-shrink-0'>
                    <div className="flex items-center space-x-3">
                        <MessageSquare className="w-5 h-5" />
                        <h2 className="font-semibold">Project Chat</h2>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            className='p-2 hover:bg-white/20 rounded-lg transition-colors'
                            onClick={() => setIsModalOpen(true)}
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                            className='p-2 hover:bg-white/20 rounded-lg transition-colors'
                        >
                            <Users className="w-4 h-4" />
                        </button>
                    </div>
                </header>

                <div
                    ref={messageBoxRef}
                    className="conversation-area flex-grow flex flex-col p-4 gap-3 overflow-y-auto"
                >
                    {messages.map((msg, index) => (
                        <div key={index} className={`message flex flex-col ${msg.sender._id === user._id.toString() ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-[85%] ${msg.sender._id === 'ai' ? 'max-w-full' : ''} ${
                                msg.sender._id === user._id.toString()
                                    ? 'bg-blue-600 text-white'
                                    : msg.sender._id === 'ai'
                                    ? 'bg-slate-100 border border-slate-200'
                                    : 'bg-slate-100 text-slate-900'
                            } rounded-2xl p-3 shadow-sm`}>
                                <div className='flex items-center gap-2 mb-1'>
                                    {msg.sender._id === 'ai' ? (
                                        <Bot className="w-4 h-4 text-blue-600" />
                                    ) : (
                                        <UserIcon className="w-4 h-4 text-slate-600" />
                                    )}
                                    <small className={`text-xs ${msg.sender._id === user._id.toString() ? 'text-blue-100' : 'text-slate-500'}`}>
                                        {msg.sender._id === 'ai' ? 'AI Assistant' : msg.sender.email}
                                    </small>
                                </div>
                                <div className='text-sm'>
                                    {msg.sender._id === 'ai' ?
                                        WriteAiMessage(msg.message)
                                        : <p>{msg.message}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0">
                    <div className="flex items-center space-x-2">
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={!isSocketConnected || isProjectLoading}
                            className='flex-grow p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed'
                            type="text"
                            placeholder={isProjectLoading ? 'Loading project...' : (isSocketConnected ? 'Type your message...' : 'Connecting to chat...')}
                            onKeyPress={(e) => e.key === 'Enter' && send()}
                        />
                        <button
                            onClick={send}
                            disabled={!isSocketConnected || isProjectLoading}
                            className='p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className={`sidePanel w-full h-full flex flex-col bg-white absolute transition-all duration-300 ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'} top-0 shadow-2xl z-10`}>
                    <header className='flex justify-between items-center p-4 bg-slate-100 border-b border-slate-200 flex-shrink-0'>
                        <h1 className='font-semibold text-lg text-slate-900'>Collaborators</h1>
                        <button
                            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                            className='p-2 hover:bg-slate-200 rounded-lg transition-colors'
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </header>
                    <div className="users flex flex-col p-4 space-y-3 flex-grow overflow-y-auto">
                        {project.users && project.users.map((projectUser, index) => (
                            <div key={index} className="user cursor-pointer hover:bg-slate-50 p-3 flex gap-3 items-center rounded-xl transition-all">
                                <div className='w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold'>
                                    {(projectUser?.email?.charAt(0) || '?').toUpperCase()}
                                </div>
                                <div>
                                    <h1 className='font-semibold text-slate-900'>{projectUser.email}</h1>
                                    <p className='text-sm text-slate-500'>Collaborator</p>
                                </div>
                                {Array.from(selectedUserId).indexOf(projectUser._id) !== -1 && (
                                    <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                        <ChevronRight className="w-3 h-3 text-white rotate-90" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="right flex-grow h-full flex">
                <div className="explorer h-full w-64 bg-slate-100 border-r border-slate-200 flex flex-col flex-shrink-0">
                    <div className="p-4 border-b border-slate-200 bg-white flex-shrink-0">
                        <div className="flex items-center space-x-2">
                            <Folder className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-slate-900">Files</h3>
                        </div>
                    </div>
                    <div className="file-tree flex-grow overflow-y-auto">
                        {Object.keys(fileTree).map((file, index) => (
                            <button key={index} onClick={() => { setCurrentFile(file); setOpenFiles([...new Set([...openFiles, file])]); }} className="tree-element cursor-pointer p-3 px-4 flex items-center gap-3 hover:bg-slate-200 w-full text-left transition-colors border-b border-slate-200/50">
                                <File className="w-4 h-4 text-slate-500" />
                                <p className='font-medium text-slate-700'>{file}</p>
                            </button>
                        ))}
                    </div>
                </div>
                <div className="code-editor flex flex-col flex-grow h-full">
                    <div className="top flex justify-between bg-white border-b border-slate-200 p-2 flex-shrink-0">
                        <div className="files flex">
                            {openFiles.map((file, index) => (
                                <button key={index} onClick={() => setCurrentFile(file)} className={`open-file cursor-pointer px-4 py-2 flex items-center gap-2 rounded-lg transition-colors ${currentFile === file ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'hover:bg-slate-100 text-slate-600'}`}>
                                    <Code className="w-4 h-4" />
                                    <span className='font-medium'>{file}</span>
                                </button>
                            ))}
                        </div>
                        <div className="actions">
                            <button
                                onClick={async () => {
                                    const instance = await getWebContainer();
                                    if (!instance || !fileTree || !fileTree["package.json"]) { console.error("WebContainer or fileTree is not ready."); return; }
                                    await instance.mount(fileTree); const installProcess = await instance.spawn("npm", ["install"]);
                                    await installProcess.output.pipeTo(new WritableStream({ write(chunk) { console.log("install:", chunk); } }));
                                    if (runProcess) { runProcess.kill(); }
                                    const tempRunProcess = await instance.spawn("npm", ["start"]);
                                    tempRunProcess.output.pipeTo(new WritableStream({ write(chunk) { console.log("run:", chunk); } }));
                                    setRunProcess(tempRunProcess);
                                    instance.on('server-ready', (port, url) => { console.log("Server ready at", url); setIframeUrl(url); });
                                }}
                                disabled={!webContainer || !fileTree || !fileTree["package.json"]}
                                className='flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                <Play className="w-4 h-4" /> Run
                            </button>
                        </div>
                    </div>
                    <div className="bottom flex flex-grow overflow-hidden">
                        {fileTree[currentFile] && (<div className="code-editor-area h-full overflow-auto flex-grow bg-slate-900"><pre className="hljs h-full p-4"><code className="hljs h-full outline-none text-green-400" contentEditable suppressContentEditableWarning onBlur={(e) => { const updatedContent = e.target.innerText; const ft = { ...fileTree, [currentFile]: { file: { contents: updatedContent } } }; setFileTree(ft); saveFileTree(ft); }} dangerouslySetInnerHTML={{ __html: hljs.highlight('javascript', fileTree[currentFile].file.contents).value }} style={{ whiteSpace: 'pre-wrap', paddingBottom: '25rem', counterSet: 'line-numbering', }}/> 
                            </pre></div>)}
                        {!currentFile && (<div className="flex items-center justify-center flex-grow bg-slate-50"><div className="text-center"><Code className="w-16 h-16 text-slate-300 mx-auto mb-4" /><h3 className="text-xl font-semibold text-slate-600 mb-2">No file selected</h3><p className="text-slate-500">Choose a file from the explorer to start editing</p></div></div>)}
                    </div>
                </div>
                {iframeUrl && webContainer && (<div className="flex w-96 flex-col h-full border-l border-slate-200 bg-white flex-shrink-0"><div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50 flex-shrink-0"><div className="flex items-center space-x-2"><Monitor className="w-4 h-4 text-slate-600" /><span className="font-medium text-slate-700">Preview</span></div></div><div className="address-bar p-2 border-b border-slate-200 flex-shrink-0"><input type="text" onChange={(e) => setIframeUrl(e.target.value)} value={iframeUrl} className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter URL..." /></div><iframe src={iframeUrl} className="w-full h-full bg-white flex-grow"></iframe></div>)}
            </section>
            {isModalOpen && (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-md"><header className='flex justify-between items-center p-6 border-b border-slate-200'><h2 className='text-xl font-bold text-slate-900'>Add Collaborators</h2><button onClick={() => setIsModalOpen(false)} className='p-2 hover:bg-slate-100 rounded-lg transition-colors'><X className="w-4 h-4" /></button></header><div className="users-list p-6 max-h-96 overflow-auto"><div className="space-y-2">{users.map(projectUser => (<div key={projectUser._id} className={`user cursor-pointer hover:bg-slate-50 ${Array.from(selectedUserId).indexOf(projectUser._id) !== -1 ? 'bg-blue-50 border-blue-200' : 'border-slate-200'} p-3 flex gap-3 items-center border rounded-xl transition-all`} onClick={() => handleUserClick(projectUser._id)}><div className='w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold'>{(projectUser.email?.charAt(0) || '?').toUpperCase()}</div><div className="flex-grow"><h1 className='font-semibold text-slate-900'>{projectUser.email}</h1><p className='text-sm text-slate-500'>Collaborator</p></div>{Array.from(selectedUserId).indexOf(projectUser._id) !== -1 && (<div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center"><ChevronRight className="w-3 h-3 text-white rotate-90" /></div>)}</div>))}</div></div><div className="p-6 border-t border-slate-200"><button onClick={addCollaborators} disabled={selectedUserId.size === 0} className='w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed'>Add {selectedUserId.size} Collaborator{selectedUserId.size !== 1 ? 's' : ''}</button></div></div></div>)}
        </div>
    );
};

export default Project;