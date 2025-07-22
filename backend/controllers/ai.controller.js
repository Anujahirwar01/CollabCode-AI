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