import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../context/user.context';
import { useNavigate } from 'react-router-dom';
import axios from "../config/axios";
import {
    User,
    LogOut,
    FolderOpen,
    Calendar,
    Settings,
    ArrowLeft,
    Users,
    FileText,
    Clock
} from 'lucide-react';

const Profile = () => {
    const { user, logout } = useContext(UserContext);
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/users/profile');
            setProfileData(response.data);
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError('Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await axios.get('/users/logout');
            logout();
            navigate('/login');
        } catch (err) {
            console.error('Logout error:', err);
            // Force logout even if request fails
            logout();
            navigate('/login');
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const goToProject = (projectId) => {
        navigate(`/project/${projectId}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    const { user: userData, projects = [], stats } = profileData || {};

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
                            >
                                <ArrowLeft size={20} />
                                <span>Back to Home</span>
                            </button>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <LogOut size={16} />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Profile Info */}
                <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
                    <div className="flex items-center space-x-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                            {userData?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900">{userData?.email}</h1>
                            <div className="flex items-center space-x-4 mt-2 text-gray-600">
                                <div className="flex items-center space-x-1">
                                    <Calendar size={16} />
                                    <span>Joined {formatDate(stats?.joinDate)}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <FolderOpen size={16} />
                                    <span>{stats?.totalProjects || 0} Projects</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FolderOpen className="text-blue-600" size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{stats?.totalProjects || 0}</p>
                                <p className="text-gray-600">Total Projects</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <Users className="text-green-600" size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {projects.reduce((acc, project) => acc + (project.users?.length || 0), 0)}
                                </p>
                                <p className="text-gray-600">Total Collaborations</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border p-6">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <FileText className="text-purple-600" size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {projects.reduce((acc, project) => acc + Object.keys(project.fileTree || {}).length, 0)}
                                </p>
                                <p className="text-gray-600">Files Created</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Projects List */}
                <div className="bg-white rounded-xl shadow-sm border">
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-semibold text-gray-900">Your Projects</h2>
                        <p className="text-gray-600 mt-1">Manage and access your collaborative projects</p>
                    </div>
                    <div className="p-6">
                        {projects.length === 0 ? (
                            <div className="text-center py-12">
                                <FolderOpen className="mx-auto text-gray-400 mb-4" size={48} />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
                                <p className="text-gray-600 mb-4">Create your first project to get started</p>
                                <button
                                    onClick={() => navigate('/')}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                                >
                                    Create Project
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {projects.map((project) => (
                                    <div
                                        key={project._id}
                                        onClick={() => goToProject(project._id)}
                                        className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
                                    >
                                        <div className="flex items-center space-x-3 mb-4">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                                <FolderOpen className="text-white" size={20} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 truncate">{project.name}</h3>
                                                <p className="text-sm text-gray-600">
                                                    {project.users?.length || 0} collaborator{(project.users?.length || 0) !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm text-gray-600">
                                            <div className="flex items-center space-x-1">
                                                <Clock size={14} />
                                                <span>Updated {formatDate(project.updatedAt)}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <FileText size={14} />
                                                <span>{Object.keys(project.fileTree || {}).length} files</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;