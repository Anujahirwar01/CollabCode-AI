import React from 'react';
import { Route, BrowserRouter, Routes, Navigate } from 'react-router-dom'; // <-- Add Navigate here
import Login from '../screens/login.jsx';
import Register from '../screens/Register';
import Home from '../screens/Home';
import Project from '../screens/Project';
import Profile from '../screens/Profile';
import UserAuth from '../auth/UserAuth';
const AppRoutes = () => {
    return (
        <BrowserRouter>

            <Routes>
                <Route path="/" element={<UserAuth><Home /></UserAuth>} />
                <Route path="/home" element={<Navigate to="/" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/profile" element={<UserAuth><Profile /></UserAuth>} />
                {/* ✅ CORRECTED: Added the dynamic :projectId parameter to the path */}
                <Route path="/project/:projectId" element={<UserAuth><Project /></UserAuth>} />
            </Routes>

        </BrowserRouter>
    )
}

export default AppRoutes