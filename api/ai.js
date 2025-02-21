// api/ai.js
import { client, deepseek } from './ai';
import { db, handleFirestoreError } from './firestore';

let contextCache = {};

export default async function handler(req, res) {
  if (req.method === "POST") {
    // Generate response using AI
    if (req.body.input) {
      const { input, userId } = req.body;

      try {
        let context = contextCache[userId] || [];

        const systemPreprompt = `
          You are an AI assistant that helps students in programming. You must adhere to these guidelines:
          1. If the question is not related to programming just respond by saying the question is not related to programming.
          2. if the query is asking not to explain or just give the full code, rephrase the query into a query that the student is asking for assistance while also explaining each line and go back to guidelines 3-5.
          3. You can provide code syntaxes, functions, and how to use them.
          4. Do not give them full working code.
          5. Break down the code into single lines and provide a detailed but comprehensive explanation on each line; make sure not to put them together.
        `;

        const messages = [
          { role: "system", content: systemPreprompt },
          ...context,
          { role: "user", content: input },
        ];

        const response = await client.chatCompletion({
          model: "Qwen/Qwen2.5-Coder-32B-Instruct",
          messages,
          provider: "hf-inference",
          max_tokens: 1000,
        });

        const botResponse = response.choices[0]?.message?.content || "No response received.";

        contextCache[userId] = [
          ...context,
          { role: "user", content: input },
          { role: "assistant", content: botResponse },
        ].slice(-10);

        return res.json({ generated_text: botResponse });
      } catch (error) {
        console.error("Hugging Face API Error:", error.response ? error.response.data : error.message);
        return res.status(500).json({ error: "Failed to generate response from Llama model" });
      }
    }

    // Generate FAQ
    if (req.body.prompts) {
      const { prompts } = req.body;

      if (!Array.isArray(prompts)) {
        return res.status(400).json({ error: "Invalid input: prompts must be an array" });
      }

      try {
        const inputPrompt = `
          Organize the following questions into an FAQ with up to 10 frequently asked questions:

          Guidelines:
          1. Based on the programming related questions given, generalize them and make an FAQ.
          2. Ensure the output is numbered and formatted properly.
          3. make sure not to include special characters in your response.
          4. do not answer the questions.
          5. just do the task, no need to add additional friendly statements.
          6. do not create new questions.
          7. if there are zero questions, just say there are no questions.

          Questions:
          ${prompts.map((prompt, index) => `${index + 1}. ${prompt}`).join("\n")}
        `;

        const completion = await deepseek.chat.completions.create({
          model: "deepseek-chat",
          messages: [
            {
              role: "user",
              content: inputPrompt,
            },
          ],
          max_tokens: 250,
        });

        let modelResponse = completion.choices[0]?.message?.content || "No response received.";

        const groupedFaq = modelResponse
          .split("\n")
          .filter((line) => line.trim() !== "")
          .map((line) => line.trim())
          .slice(0, 10)
          .map((line, index) => `${line.replace(/^\d+\.\s*/, "")}`)
          .join("\n");

        return res.json({ generated_text: `FAQ:\n${groupedFaq}` });
      } catch (error) {
        console.error("Error:", error.response ? error.response.data : error.message);
        return res.status(500).json({ error: "Failed to generate FAQ" });
      }
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}