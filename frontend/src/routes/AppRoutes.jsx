import React from "react";
import { Routes, Route,BrowserRouter } from "react-router-dom";
import Login from "../screens/login.jsx";
import Register from "../screens/Register.jsx";
import Home from "../screens/Home.jsx";
import Project from "../screens/Project.jsx";
// import UserAuth from "../components/UserAuth.jsx";

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/register" element={<Register/>}/>
                <Route path="/project" element={<Project />} />
                {/* <Route path="/about" element={<h1 className="text-3xl font-bold underline">About</h1>} />
                <Route path="/contact" element={<h1 className="text-3xl font-bold underline">Contact</h1>} /> */}
            </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes;