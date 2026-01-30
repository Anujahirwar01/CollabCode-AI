import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserContext } from '../context/user.context';
import axios from '../config/axios';

const UserAuth = ({ children }) => {
    const { user, setUser, logout } = useContext(UserContext);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const location = useLocation();

    // Pages that don't require authentication
    const publicPaths = ['/login', '/register'];
    const isPublicPath = publicPaths.includes(location.pathname);

    useEffect(() => {
        const validateAuth = async () => {
            // Simple localStorage-only authentication
            const token = localStorage.getItem('token');

            // If on public path and already logged in, redirect to home
            if (isPublicPath && user && token) {
                navigate('/');
                setLoading(false);
                return;
            }

            // If on public path and no user, allow access
            if (isPublicPath) {
                setLoading(false);
                return;
            }

            // For protected routes, check authentication
            if (!token) {
                navigate('/login');
                setLoading(false);
                return;
            }

            // If we have a token but no user, try to get user profile
            if (!user) {
                try {
                    const response = await axios.get('/users/profile');
                    setUser(response.data.user);
                    setLoading(false);
                } catch (error) {
                    // Token might be invalid, clear it and redirect
                    logout();
                    navigate('/login');
                    setLoading(false);
                }
            } else {
                setLoading(false);
            }
        };

        validateAuth();
    }, [user, setUser, navigate, location.pathname, isPublicPath, logout]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg">Loading...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default UserAuth;