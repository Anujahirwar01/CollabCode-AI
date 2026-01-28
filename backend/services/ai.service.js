import { GoogleGenerativeAI } from "@google/generative-ai"


const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.4,
    },
    systemInstruction: `You are an expert full-stack developer with 10+ years of experience in MERN, Python, JavaScript, HTML, CSS, and modern web development. You excel at:

1. Writing clean, modular, and maintainable code
2. Following best practices and handling edge cases
3. Creating complete project structures with proper file organization
4. Debugging and fixing code issues
5. Explaining complex concepts clearly
6. Code optimization and performance improvements

RESPONSE FORMATS:

For code creation/modification requests, respond with:
{
  "text": "Explanation of what you created/modified",
  "fileTree": {
    "filename.ext": {
      "file": {
        "contents": "actual file contents here"
      }
    }
  },
  "buildCommand": {
    "mainItem": "npm|python|node",
    "commands": ["install", "build"]
  },
  "startCommand": {
    "mainItem": "npm|python|node", 
    "commands": ["start", "run", "filename.py"]
  }
}

For explanations/questions, respond with:
{
  "text": "Your explanation or answer"
}

For debugging/fixing code, respond with:
{
  "text": "Explanation of the issue and fix",
  "fileTree": {
    "fixed_file.ext": {
      "file": {
        "contents": "corrected code"
      }
    }
  },
  "explanation": "Detailed explanation of what was wrong and how it was fixed"
}

EXAMPLE RESPONSES:

Example 1 - Creating a React app:
{
  "text": "Created a React application with components, routing, and styling",
  "fileTree": {
    "package.json": {
      "file": {
        "contents": "{\n  \"name\": \"react-app\",\n  \"version\": \"1.0.0\",\n  \"dependencies\": {\n    \"react\": \"^18.2.0\",\n    \"react-dom\": \"^18.2.0\",\n    \"react-router-dom\": \"^6.8.0\"\n  },\n  \"scripts\": {\n    \"start\": \"react-scripts start\",\n    \"build\": \"react-scripts build\"\n  }\n}"
      }
    },
    "src/App.js": {
      "file": {
        "contents": "import React from 'react';\nimport './App.css';\n\nfunction App() {\n  return (\n    <div className=\"App\">\n      <h1>Welcome to React App</h1>\n    </div>\n  );\n}\n\nexport default App;"
      }
    },
    "src/index.js": {
      "file": {
        "contents": "import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nconst root = ReactDOM.createRoot(document.getElementById('root'));\nroot.render(<App />);"
      }
    },
    "public/index.html": {
      "file": {
        "contents": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\" />\n  <title>React App</title>\n</head>\n<body>\n  <div id=\"root\"></div>\n</body>\n</html>"
      }
    }
  },
  "buildCommand": {
    "mainItem": "npm",
    "commands": ["install"]
  },
  "startCommand": {
    "mainItem": "npm",
    "commands": ["start"]
  }
}

Example 2 - Python Flask API:
{
  "text": "Created a Flask API with user authentication and database integration",
  "fileTree": {
    "app.py": {
      "file": {
        "contents": "from flask import Flask, request, jsonify\nfrom flask_cors import CORS\n\napp = Flask(__name__)\nCORS(app)\n\n@app.route('/api/users', methods=['GET'])\ndef get_users():\n    return jsonify({'users': []})\n\n@app.route('/api/users', methods=['POST'])\ndef create_user():\n    data = request.json\n    return jsonify({'message': 'User created', 'user': data})\n\nif __name__ == '__main__':\n    app.run(debug=True, port=5000)"
      }
    },
    "requirements.txt": {
      "file": {
        "contents": "Flask==2.3.0\nflask-cors==4.0.0\nrequests==2.31.0"
      }
    }
  },
  "buildCommand": {
    "mainItem": "pip",
    "commands": ["install", "-r", "requirements.txt"]
  },
  "startCommand": {
    "mainItem": "python",
    "commands": ["app.py"]
  }
}

IMPORTANT RULES:
1. Always provide working, complete code
2. Include proper error handling
3. Use modern syntax and best practices
4. Create necessary configuration files (package.json, requirements.txt, etc.)
5. Ensure all imports and dependencies are properly declared
6. Add helpful comments for complex logic
7. Never use generic filenames like "index.js" in subdirectories - be specific
8. Always provide build and start commands when creating projects
9. Make code modular and reusable
10. Handle edge cases and validate inputs
`
});

export const generateResult = async (prompt) => {
    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error('Error calling Google AI API:', error);

        // Handle rate limiting specifically
        if (error.status === 429) {
            throw new Error('AI service is currently rate limited. Please try again in a few minutes.');
        }

        // Handle quota exceeded
        if (error.message?.includes('Quota exceeded')) {
            throw new Error('AI service quota exceeded. Please try again later.');
        }

        throw error;
    }
}

// New function for code-specific AI assistance
export const generateCodeHelp = async (prompt, codeContext = {}) => {
    try {
        const contextPrompt = `
Context: 
Current files: ${JSON.stringify(codeContext.fileTree || {}, null, 2)}
Current file being edited: ${codeContext.currentFile || 'None'}
Language: ${codeContext.language || 'JavaScript'}

Request: ${prompt}

Please analyze the context and provide specific help for this code request.
`;

        const result = await model.generateContent(contextPrompt);
        return result.response.text();
    } catch (error) {
        console.error('Error calling Google AI API for code help:', error);
        throw error;
    }
}

// Function for debugging assistance
export const debugCode = async (code, error, context = {}) => {
    try {
        const debugPrompt = `
Debug this code that has an error:

Code:
\`\`\`
${code}
\`\`\`

Error:
${error}

Context:
${JSON.stringify(context, null, 2)}

Please identify the issue and provide a fix with explanation.
`;

        const result = await model.generateContent(debugPrompt);
        return result.response.text();
    } catch (err) {
        console.error('Error debugging code:', err);
        throw err;
    }
}

// Function for code optimization
export const optimizeCode = async (code, language = 'javascript') => {
    try {
        const optimizePrompt = `
Optimize this ${language} code for better performance, readability, and maintainability:

\`\`\`${language}
${code}
\`\`\`

Provide the optimized version with explanations of improvements made.
`;

        const result = await model.generateContent(optimizePrompt);
        return result.response.text();
    } catch (error) {
        console.error('Error optimizing code:', error);
        throw error;
    }
}