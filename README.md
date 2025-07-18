# Codemate AI

**Codemate AI** is a real-time collaborative coding platform built with the MERN stack and enhanced by AI support. It allows multiple users to collaboratively edit code, chat in real-time, and get AI-generated code suggestions, explanations, or debugging help.

---

## 🚀 Features

- 🔐 **User Authentication**
  - Register/login securely using JWT and HTTP-only cookies.
  - Auth-protected routes for managing private projects.

- 💬 **Real-time Chat**
  - Built-in chat interface within each coding session.
  - Powered by Socket.io for instant message delivery.

- 💻 **Live Code Collaboration**
  - Multiple users can edit the same project simultaneously.
  - Code is synced across clients in real-time.

- 🤖 **AI Assistance**
  - Ask AI for help on bugs or logic.
  - Generate explanations, debug code, or produce test cases.

- 🗂️ **Project Management**
  - Create, view, and manage coding projects.
  - Each project is tied to its collaborators and stored securely.

---

## 🛠 Tech Stack

| Role       | Tech                         |
|------------|------------------------------|
| Frontend   | React.js, Tailwind CSS       |
| Backend    | Node.js, Express.js          |
| Database   | MongoDB Atlas                |
| Real-time  | Socket.io                    |
| AI Engine  | OpenAI API                   |
| Auth       | JWT + Cookies (HTTP-only)    |

---

## 📁 Folder Structure

root/
├── client/ # Frontend (React)
│ ├── components/ # Reusable components
│ ├── pages/ # Page-level components
│ └── App.jsx # Root component
├── server/ # Backend (Express)
│ ├── controllers/ # Request logic
│ ├── models/ # Mongoose schemas
│ ├── routes/ # API endpoints
│ └── app.js # Entry point
└── README.md

yaml
Copy
Edit

---

## ⚙️ Setup Instructions

### 1. Clone the Repo

```bash
git clone https://github.com/Anujahirwar01/CollabCode-AI.git
cd CollabCode-AI
2. Install Dependencies
bash
Copy
Edit
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
3. Environment Variables
Create a .env file in /server with:

ini
Copy
Edit
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
OPENAI_API_KEY=your_openai_key
Create a .env in /client with:

ini
Copy
Edit
VITE_API_BASE_URL=http://localhost:5000
4. Run the App
bash
Copy
Edit
# Run backend
cd server
npm run dev

# Run frontend
cd ../client
npm run dev
🧠 AI Usage
Navigate to a project and open the AI Assistant.

Enter your question (e.g., “Why is my loop not breaking?”).

AI will return a code explanation, fix, or suggestion.

📸 Screenshots
Login Page	Live Code Editor	AI Assistant

🔄 Future Enhancements
Syntax highlighting and auto-formatting.

Multi-language support (Python, Java).

Voice-based code explanation.

Project history & versioning.

🤝 Contributing
Fork the repository.

Create your feature branch: git checkout -b feature/your-feature

Commit changes: git commit -m "Add feature"

Push to the branch: git push origin feature/your-feature

Open a pull request.

📄 License
This project is licensed under the MIT License.


