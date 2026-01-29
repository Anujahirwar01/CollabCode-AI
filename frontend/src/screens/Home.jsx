import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../context/user.context';
import axios from "../config/axios";
import { useNavigate } from 'react-router-dom';
import { Plus, Users, FolderOpen, Sparkles, Trash2, User } from 'lucide-react';

const Home = () => {
    const { user } = useContext(UserContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [projects, setProjects] = useState([]);

    const navigate = useNavigate();

    // Add the missing fetchProjects function
    const fetchProjects = async () => {
        try {
            const response = await axios.get('/projects/all');
            setProjects(response.data.projects || []);
        } catch (error) {
            console.error('Error fetching projects:', error);
            console.error('Backend error details:', error.response?.data);
        }
    };

    const createProject = async (e) => {
        e.preventDefault(); // Prevent form default submission

        try {
            // Log what we're sending
            const projectData = { name: projectName };
            console.log('Sending project data:', projectData);

            const response = await axios.post('/projects/create', projectData);
            console.log('Project created:', response.data);

            // Reset and refresh
            setProjectName('');
            setIsModalOpen(false); // Close modal
            fetchProjects(); // Refresh projects list
        } catch (error) {
            console.error('Create project error:', error);
            console.error('Error response:', error.response?.data);
        }
    };

    const handleDelete = (e, projectId) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
            return;
        }
        axios.delete(`/projects/delete/${projectId}`)
            .then(res => {
                console.log(res.data.message);
                setProjects(prevProjects => prevProjects.filter(p => p._id !== projectId));
            })
            .catch(err => {
                console.error("Error deleting project:", err);
                alert("Failed to delete the project. Please try again.");
            });
    };

    useEffect(() => {
        if (user) {
            fetchProjects(); // Use the new function
        } else {
            setProjects([]);
        }
    }, [user]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/60 sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                                <Sparkles className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-slate-900">Project Hub</h1>
                                <p className="text-sm text-slate-600">Welcome back, {user?.email}</p>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="flex items-center space-x-2 px-3 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <User className="w-4 h-4" />
                                    <span>Profile</span>
                                </button>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Project
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Your Projects</h2>
                    <p className="text-slate-600">Manage and collaborate on your development projects</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {/* Create New Project Card */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="group relative bg-white/60 backdrop-blur-sm border-2 border-dashed border-slate-300 rounded-2xl p-8 hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300 min-h-[200px] flex flex-col items-center justify-center"
                    >
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                            <Plus className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-700 group-hover:text-blue-700 transition-colors">
                            Create New Project
                        </h3>
                    </button>

                    {/* Project Cards */}
                    {projects.map((proj) => (
                        <div
                            key={proj._id}
                            onClick={() => {
                                navigate(`/project/${proj._id}`);
                            }}
                            className="group relative cursor-pointer bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 hover:border-blue-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 min-h-[200px] flex flex-col"
                        >
                            <button
                                onClick={(e) => handleDelete(e, proj._id)}
                                className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all z-10"
                                aria-label="Delete project"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-xl flex items-center justify-center">
                                    <FolderOpen className="w-6 h-6 text-white" />
                                </div>
                                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors line-clamp-2">
                                {proj.name}
                            </h3>

                            <div className="mt-auto">
                                <div className="flex items-center justify-between text-sm text-slate-600">
                                    <div className="flex items-center space-x-2">
                                        <Users className="w-4 h-4" />
                                        <span>{proj.users.length} collaborator{proj.users.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="flex -space-x-2">
                                        {proj.users?.slice(0, 3).map((u, index) => (
                                            <div
                                                key={index}
                                                className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                                                title={u?.email}
                                            >
                                                {(u?.email?.charAt(0) || '?').toUpperCase()}
                                            </div>
                                        ))}
                                        {proj.users.length > 3 && (
                                            <div className="w-8 h-8 bg-slate-400 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white">
                                                +{proj.users.length - 3}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {projects.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FolderOpen className="w-12 h-12 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">No projects yet</h3>
                        <p className="text-slate-500 mb-6">Create your first project to get started</p>
                    </div>
                )}
            </main>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 scale-100">
                        <div className="p-6 border-b border-slate-200">
                            <h2 className="text-2xl font-bold text-slate-900">Create New Project</h2>
                            <p className="text-slate-600 mt-1">Give your project a memorable name</p>
                        </div>
                        <form onSubmit={createProject} className="p-6">
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-700 mb-3">
                                    Project Name
                                </label>
                                <input
                                    onChange={(e) => setProjectName(e.target.value)}
                                    value={projectName}
                                    type="text"
                                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-slate-50 focus:bg-white"
                                    placeholder="Enter project name..."
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors duration-200 font-medium"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={!projectName.trim()}
                                >
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;