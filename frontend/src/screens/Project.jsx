import React, { useState, useEffect, useContext, useRef } from 'react'
import { UserContext } from '../context/user.context'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from '../config/axios'
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket'
import Markdown from 'markdown-to-jsx'
import hljs from 'highlight.js';
import { getWebContainer } from '../config/webcontainer'
import { 
    Plus, 
    Users, 
    X, 
    Send, 
    Play, 
    File, 
    Folder,
    Settings,
    MessageSquare,
    Code,
    Monitor,
    ChevronRight,
    Bot,
    User as UserIcon
} from 'lucide-react'

function SyntaxHighlightedCode(props) {
    const ref = useRef(null)

    React.useEffect(() => {
        if (ref.current && props.className?.includes('lang-') && window.hljs) {
            window.hljs.highlightElement(ref.current)
            ref.current.removeAttribute('data-highlighted')
        }
    }, [props.className, props.children])

    return <code {...props} ref={ref} />
}

const Project = () => {
    const location = useLocation()
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedUserId, setSelectedUserId] = useState(new Set())
    const [project, setProject] = useState(location.state.project)
    const [message, setMessage] = useState('')
    const { user } = useContext(UserContext)
    const messageBox = React.createRef()

    const [users, setUsers] = useState([])
    const [messages, setMessages] = useState([])
    const [fileTree, setFileTree] = useState({})
    const [currentFile, setCurrentFile] = useState(null)
    const [openFiles, setOpenFiles] = useState([])
    const [webContainer, setWebContainer] = useState(null)
    const [iframeUrl, setIframeUrl] = useState(null)
    const [runProcess, setRunProcess] = useState(null)

    const handleUserClick = (id) => {
        setSelectedUserId(prevSelectedUserId => {
            const newSelectedUserId = new Set(prevSelectedUserId);
            if (newSelectedUserId.has(id)) {
                newSelectedUserId.delete(id);
            } else {
                newSelectedUserId.add(id);
            }
            return newSelectedUserId;
        });
    }

    function addCollaborators() {
        axios.put("/projects/add-user", {
            projectId: location.state.project._id,
            users: Array.from(selectedUserId)
        }).then(res => {
            console.log(res.data)
            setIsModalOpen(false)
        }).catch(err => {
            console.log(err)
        })
    }

    const send = () => {
        sendMessage('project-message', {
            message,
            sender: user
        })
        setMessages(prevMessages => [...prevMessages, { sender: user, message }])
        setMessage("")
    }

    function WriteAiMessage(message) {
        const messageObject = JSON.parse(message)
        return (
            <div className='overflow-auto bg-slate-900 text-green-400 rounded-xl p-4 border border-slate-700'>
                <Markdown
                    children={messageObject.text}
                    options={{
                        overrides: {
                            code: SyntaxHighlightedCode,
                        },
                    }}
                />
            </div>
        )
    }

    useEffect(() => {
        initializeSocket(project._id)

        if (!webContainer) {
            getWebContainer().then(container => {
                setWebContainer(container)
                console.log("container started")
            })
        }

        receiveMessage('project-message', data => {
            console.log(data)
            
            if (data.sender._id == 'ai') {
                const message = JSON.parse(data.message)
                console.log(message)
                webContainer?.mount(message.fileTree)
                if (message.fileTree) {
                    setFileTree(message.fileTree || {})
                }
                setMessages(prevMessages => [...prevMessages, data])
            } else {
                setMessages(prevMessages => [...prevMessages, data])
            }
        })

        axios.get(`/projects/get-project/${location.state.project._id}`).then(res => {
            console.log(res.data.project)
            setProject(res.data.project)
            setFileTree(res.data.project.fileTree || {})
        })

        axios.get('/users/all').then(res => {
            setUsers(res.data.users)
        }).catch(err => {
            console.log(err)
        })
    }, [])

    function saveFileTree(ft) {
        axios.put('/projects/update-file-tree', {
            projectId: project._id,
            fileTree: ft
        }).then(res => {
            console.log(res.data)
        }).catch(err => {
            console.log(err)
        })
    }

    function scrollToBottom() {
        messageBox.current.scrollTop = messageBox.current.scrollHeight
    }

    return (
        <div className='h-screen w-screen flex bg-slate-50'>
            {/* Left Panel - Chat */}
            <section className="left relative flex flex-col h-screen w-96 bg-white border-r border-slate-200 shadow-lg">
                {/* Header */}
                <header className='flex justify-between items-center p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white'>
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

                {/* Messages Area */}
                <div className="conversation-area flex-grow flex flex-col relative">
                    <div
                        ref={messageBox}
                        className="message-box p-4 flex-grow flex flex-col gap-3 overflow-auto"
                    >
                        {messages.map((msg, index) => (
                            <div key={index} className={`message flex flex-col ${msg.sender._id == user._id.toString() ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] ${msg.sender._id === 'ai' ? 'max-w-full' : ''} ${
                                    msg.sender._id == user._id.toString() 
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
                                        <small className={`text-xs ${msg.sender._id == user._id.toString() ? 'text-blue-100' : 'text-slate-500'}`}>
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

                    {/* Input Field */}
                    <div className="p-4 border-t border-slate-200 bg-white">
                        <div className="flex items-center space-x-2">
                            <input
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className='flex-grow p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all'
                                type="text"
                                placeholder='Type your message...'
                                onKeyPress={(e) => e.key === 'Enter' && send()}
                            />
                            <button
                                onClick={send}
                                className='p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors'
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Side Panel - Collaborators */}
                <div className={`sidePanel w-full h-full flex flex-col bg-white absolute transition-all duration-300 ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'} top-0 shadow-2xl z-10`}>
                    <header className='flex justify-between items-center p-4 bg-slate-100 border-b border-slate-200'>
                        <h1 className='font-semibold text-lg text-slate-900'>Collaborators</h1>
                        <button 
                            onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} 
                            className='p-2 hover:bg-slate-200 rounded-lg transition-colors'
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </header>
                    <div className="users flex flex-col p-4 space-y-3">
                        {project.users && project.users.map((projectUser, index) => (
                            <div key={index} className="user cursor-pointer hover:bg-slate-50 p-3 flex gap-3 items-center rounded-xl transition-colors">
                                <div className='w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold'>
  {(projectUser?.email?.charAt(0) || '?').toUpperCase()}
</div>

                                <div>
                                    <h1 className='font-semibold text-slate-900'>{projectUser.email}</h1>
                                    <p className='text-sm text-slate-500'>Collaborator</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Right Panel - Code Editor */}
            <section className="right flex-grow h-full flex">
                {/* File Explorer */}
                <div className="explorer h-full w-64 bg-slate-100 border-r border-slate-200">
                    <div className="p-4 border-b border-slate-200 bg-white">
                        <div className="flex items-center space-x-2">
                            <Folder className="w-5 h-5 text-blue-600" />
                            <h3 className="font-semibold text-slate-900">Files</h3>
                        </div>
                    </div>
                    <div className="file-tree">
                        {Object.keys(fileTree).map((file, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    setCurrentFile(file)
                                    setOpenFiles([...new Set([...openFiles, file])])
                                }}
                                className="tree-element cursor-pointer p-3 px-4 flex items-center gap-3 hover:bg-slate-200 w-full text-left transition-colors border-b border-slate-200/50"
                            >
                                <File className="w-4 h-4 text-slate-500" />
                                <p className='font-medium text-slate-700'>{file}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Code Editor Area */}
                <div className="code-editor flex flex-col flex-grow h-full">
                    {/* Tabs and Actions */}
                    <div className="top flex justify-between bg-white border-b border-slate-200 p-2">
                        <div className="files flex">
                            {openFiles.map((file, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentFile(file)}
                                    className={`open-file cursor-pointer px-4 py-2 flex items-center gap-2 rounded-lg transition-colors ${
                                        currentFile === file 
                                            ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                            : 'hover:bg-slate-100 text-slate-600'
                                    }`}
                                >
                                    <Code className="w-4 h-4" />
                                    <span className='font-medium'>{file}</span>
                                </button>
                            ))}
                        </div>

                        <div className="actions">
                            <button
  onClick={async () => {
    const instance = await getWebContainer(); // safer
    if (!instance || !fileTree || !fileTree["package.json"]) {
      console.error("WebContainer or fileTree is not ready.");
      return;
    }

    await instance.mount(fileTree);

    const installProcess = await instance.spawn("npm", ["install"]);
    await installProcess.output.pipeTo(new WritableStream({
      write(chunk) {
        console.log("install:", chunk);
      }
    }));

    if (runProcess) {
      runProcess.kill();
    }

    const tempRunProcess = await instance.spawn("npm", ["start"]);
    tempRunProcess.output.pipeTo(new WritableStream({
      write(chunk) {
        console.log("run:", chunk);
      }
    }));

    setRunProcess(tempRunProcess);

    instance.on('server-ready', (port, url) => {
      console.log("Server ready at", url);
      setIframeUrl(url);
    });
  }}
  className='flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors'
>
  <Play className="w-4 h-4" />
  Run
</button>

                        </div>
                    </div>

                    {/* Editor Content */}
                    <div className="bottom flex flex-grow overflow-hidden">
                        {fileTree[currentFile] && (
                            <div className="code-editor-area h-full overflow-auto flex-grow bg-slate-900">
                                <pre className="hljs h-full p-4">
                                    <code
                                        className="hljs h-full outline-none text-green-400"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onBlur={(e) => {
                                            const updatedContent = e.target.innerText;
                                            const ft = {
                                                ...fileTree,
                                                [currentFile]: {
                                                    file: {
                                                        contents: updatedContent
                                                    }
                                                }
                                            }
                                            setFileTree(ft)
                                            saveFileTree(ft)
                                        }}
                                        dangerouslySetInnerHTML={{ 
                                            __html: hljs.highlight('javascript', fileTree[currentFile].file.contents).value 
                                        }}
                                        style={{
                                            whiteSpace: 'pre-wrap',
                                            paddingBottom: '25rem',
                                            counterSet: 'line-numbering',
                                        }}
                                    />
                                </pre>
                            </div>
                        )}

                        {!currentFile && (
                            <div className="flex items-center justify-center flex-grow bg-slate-50">
                                <div className="text-center">
                                    <Code className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                    <h3 className="text-xl font-semibold text-slate-600 mb-2">No file selected</h3>
                                    <p className="text-slate-500">Choose a file from the explorer to start editing</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Preview Panel */}
                {iframeUrl && webContainer && (
                    <div className="flex w-96 flex-col h-full border-l border-slate-200 bg-white">
                        <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
                            <div className="flex items-center space-x-2">
                                <Monitor className="w-4 h-4 text-slate-600" />
                                <span className="font-medium text-slate-700">Preview</span>
                            </div>
                        </div>
                        <div className="address-bar p-2 border-b border-slate-200">
                            <input 
                                type="text"
                                onChange={(e) => setIframeUrl(e.target.value)}
                                value={iframeUrl} 
                                className="w-full p-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                                placeholder="Enter URL..."
                            />
                        </div>
                        <iframe src={iframeUrl} className="w-full h-full bg-white"></iframe>
                    </div>
                )}
            </section>

            {/* Add Collaborators Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <header className='flex justify-between items-center p-6 border-b border-slate-200'>
                            <h2 className='text-xl font-bold text-slate-900'>Add Collaborators</h2>
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className='p-2 hover:bg-slate-100 rounded-lg transition-colors'
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </header>
                        
                        <div className="users-list p-6 max-h-96 overflow-auto">
                            <div className="space-y-2">
                                {users.map(userItem => (
                                    <div 
                                        key={userItem._id} 
                                        className={`user cursor-pointer hover:bg-slate-50 ${
                                            Array.from(selectedUserId).indexOf(userItem._id) != -1 ? 'bg-blue-50 border-blue-200' : 'border-slate-200'
                                        } p-3 flex gap-3 items-center border rounded-xl transition-all`} 
                                        onClick={() => handleUserClick(userItem._id)}
                                    >
                                        <div className='w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold'>
                                            {userItem.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-grow">
                                            <h1 className='font-semibold text-slate-900'>{userItem.email}</h1>
                                            <p className='text-sm text-slate-500'>User</p>
                                        </div>
                                        {Array.from(selectedUserId).indexOf(userItem._id) != -1 && (
                                            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                                                <ChevronRight className="w-3 h-3 text-white rotate-90" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-slate-200">
                            <button
                                onClick={addCollaborators}
                                disabled={selectedUserId.size === 0}
                                className='w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                                Add {selectedUserId.size} Collaborator{selectedUserId.size !== 1 ? 's' : ''}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Project