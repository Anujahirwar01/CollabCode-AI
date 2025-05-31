import React ,{useState,useEffect} from 'react'
import {useLocation, useNavigate} from 'react-router-dom'
import axios from '../config/axios.js'
import { set } from 'mongoose';


const Project = ({navigate}) => {

    const location = useLocation();
    const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState([]);
    const [project, setProject] = useState(location.state.project || {});

    const [users, setUsers] = useState([]);

const handleUserSelect = (id) => {
    setSelectedUserId(prevSelectedUserId => {
        const newSelectedUsedId = new Set(prevSelectedUserId);
        if(newSelectedUsedId.has(id)) {
            newSelectedUsedId.delete(id); // Deselect if already selected
        } else {
            newSelectedUsedId.add(id); // Select if not already selected
        }
        return Array.from(newSelectedUsedId);
    });
    // setIsModalOpen(false);
};

function addCollaborator() {
    axios.put('/projects/add-user', {
        projectId: location.state.project._id,
        users: Array.from(selectedUserId)
    }).then(res => {
        // console.log("Collaborators added successfully:", res.data);
        setIsModalOpen(false);
        // Optionally, you can refresh the user list or perform other actions
    }).catch(err => {
        console.error("Error adding collaborator:", err);
        
    });

}


useEffect(() => {
    axios.get(`/projects/${location.state.project._id}`).then(res => {
        setProject(res.data.project);
    }).catch(err => {
        console.error("Error fetching project:", err);
    });
    // Fetch users from the API
    axios.get('/users/all').then(res => {
        setUsers(res.data.users);
    }).catch(err => {
        console.error("Error fetching users:", err);
    }
    );
}, []);


    return(
        <main className='h-screen w-screen flex'>
           <section className='left flex flex-col h-full min-w-66 bg-slate-300'>
            <header className='flex justify-between items-center p-2 px-4 w-66 bg-slate-100 absolute z-10 top-0'>
                    <button className='flex gap-2' onClick={() => setIsModalOpen(true)}>
    <i className="ri-add-fill mr-1"></i>
    <p>Add collaborator</p>
</button>
                    <button  className='p-2'>
                        <i className="ri-group-fill"></i>
                    </button>
                </header>
                <div className="conversation-area pt-14 pb-10 flex-grow flex flex-col h-full relative">

                    <div
                        
                        className="message-box p-1 flex-grow flex flex-col gap-1 overflow-auto max-h-full scrollbar-hide">
                        {/* {messages.map((msg, index) => (
                            <div key={index} className={`${msg.sender._id === 'ai' ? 'max-w-80' : 'max-w-52'} ${msg.sender._id == user._id.toString() && 'ml-auto'}  message flex flex-col p-2 bg-slate-50 w-fit rounded-md`}>
                                <small className='opacity-65 text-xs'>{msg.sender.email}</small>
                                <div className='text-sm'>
                                    {msg.sender._id === 'ai' ?
                                        WriteAiMessage(msg.message)
                                        : <p>{msg.message}</p>}
                                </div>
                            </div>
                        ))} */}
                    </div>

                    <div className="inputField w-full flex absolute bottom-0">
                        <input
                            
                            className='p-2 px-1 border-none outline-none flex-grow' type="text" placeholder='Enter message' />
                        <button
                            
                            className='px-5 bg-slate-950 text-white'><i className="ri-send-plane-fill"></i></button>
                    </div>

                </div>


                <div className={`sidePanel w-full h-full flex flex-col gap-2 bg-red-50 absolute transition-all ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'} top-0`}>
                    <header className='flex justify-between items-center px-4 p-2 bg-slate-200'>

                        <h1
                            className='font-semibold text-lg'
                        >Collaborators</h1>

                        <button   onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} className='p-2'>
                            <i className="ri-close-fill"></i>
                        </button>
                    </header>
                    <div className="users flex flex-col gap-2">

                        {/* {project.users && project.users.map(user => {


                            return (
                                <div className="user cursor-pointer hover:bg-slate-200 p-2 flex gap-2 items-center">
                                    <div className='aspect-square rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-600'>
                                        <i className="ri-user-fill absolute"></i>
                                    </div>
                                    <h1 className='font-semibold text-lg'>{user.email}</h1>
                                </div>
                            )


                        })} */}
                    </div>
                </div>

                

           </section>
           {isModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
        <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md mx-auto p-6 relative">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Select a User</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                    <i className="ri-close-fill text-2xl"></i>
                </button>
            </div>
            <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {users.map(user => (
                    <li
                        key={user.id}
                        className={`flex items-center gap-3 p-3  cursor-pointer hover:bg-slate-100 rounded transition ${
                            selectedUserId === user._id ? 'bg-slate-200 font-bold' : ''
                        }`}
                        onClick={() => handleUserSelect(user._id)}
                    >
                        <div className="w-10 h-10 rounded-full relative bg-slate-400 flex items-center justify-center text-white">
                            <i className="ri-user-fill"></i>
                        </div>
                        <span>{user.email}</span>
                    </li>
                ))}
            </ul>
            <button 
                className="absolute bottom-4 left-0 right-0 mx-auto w-[90%] bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
                onClick={() => {
                    addCollaborator();
                }}
            >
                Add Collaborator
            </button>
        </div>
    </div>
)} 
        </main>
    )
}
export default Project;