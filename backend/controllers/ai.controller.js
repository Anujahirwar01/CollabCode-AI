import * as ai from '../services/ai.service.js';

export const getResult = async (req, res) => {
    try {
        const { prompt } = req.query;
        const aiRawResult = await ai.generateResult(prompt);

        const messagePayload = {
            text: aiRawResult,
            fileTree: {}
        };

        const stringifiedMessage = JSON.stringify(messagePayload);

        res.status(200).send(stringifiedMessage);

    } catch (error) {
        console.error("Error in getResult (AI endpoint):", error);
        res.status(500).send({ message: error.message || "An unknown error occurred with AI." });
    }
}

// New endpoint for code-specific help
export const getCodeHelp = async (req, res) => {
    try {
        const { prompt, codeContext } = req.body;

        if (!prompt) {
            return res.status(400).json({ message: "Prompt is required" });
        }

        const aiResult = await ai.generateCodeHelp(prompt, codeContext);

        res.status(200).json({
            success: true,
            result: aiResult
        });

    } catch (error) {
        console.error("Error in getCodeHelp:", error);
        res.status(500).json({
            success: false,
            message: error.message || "An error occurred while getting code help"
        });
    }
};

// New endpoint for debugging code
export const debugCode = async (req, res) => {
    try {
        const { code, error, context } = req.body;

        if (!code || !error) {
            return res.status(400).json({ message: "Code and error are required" });
        }

        const debugResult = await ai.debugCode(code, error, context);

        res.status(200).json({
            success: true,
            result: debugResult
        });

    } catch (err) {
        console.error("Error in debugCode:", err);
        res.status(500).json({
            success: false,
            message: err.message || "An error occurred while debugging code"
        });
    }
};

// New endpoint for optimizing code  
export const optimizeCode = async (req, res) => {
    try {
        const { code, language } = req.body;

        if (!code) {
            return res.status(400).json({ message: "Code is required" });
        }

        const optimizedResult = await ai.optimizeCode(code, language);

        res.status(200).json({
            success: true,
            result: optimizedResult
        });

    } catch (error) {
        console.error("Error in optimizeCode:", error);
        res.status(500).json({
            success: false,
            message: error.message || "An error occurred while optimizing code"
        });
    }
};