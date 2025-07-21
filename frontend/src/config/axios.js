// frontend/src/config/axios.js
import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL, // Ensure this is correct
    withCredentials: true,
});

axiosInstance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token'); // Get the latest token from localStorage
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            delete config.headers.Authorization;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.error("Authentication error caught by interceptor:", error.response.data.error || "Unauthorized");
            // Example: window.location.href = '/login'; // Redirect to login
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;