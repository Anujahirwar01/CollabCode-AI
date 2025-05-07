import React from "react";
import { Routes, Route,BrowserRouter } from "react-router-dom";

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<div>Home</div>}/>
                <Route path="/login" element={<div>login</div>}/>
                <Route path="/register" element={<div>Register</div>}/>
                {/* <Route path="/about" element={<h1 className="text-3xl font-bold underline">About</h1>} />
                <Route path="/contact" element={<h1 className="text-3xl font-bold underline">Contact</h1>} /> */}
            </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes;