import React from 'react'
import { Route, BrowserRouter, Routes } from 'react-router-dom'
import Login from '../screens/login.jsx'
import Register from '../screens/Register'
import Home from '../screens/Home'
import Project from '../screens/Project'
import UserAuth from '../auth/UserAuth'

const AppRoutes = () => {
    return (
        <BrowserRouter>

            <Routes>
                <Route path="/" element={<UserAuth><Home /></UserAuth>} />
                
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                {/* ✅ CORRECTED: Added the dynamic :projectId parameter to the path */}
                <Route path="/project/:projectId" element={<UserAuth><Project /></UserAuth>} />
            </Routes>

        </BrowserRouter>
    )
}

export default AppRoutes