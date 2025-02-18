import { deepseek, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'POST') {
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
        messages: [{ role: "user", content: inputPrompt }],
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

      res.json({ generated_text: `FAQ:\n${groupedFaq}` });
    } catch (error) {
      console.error("Error:", error.response ? error.response.data : error.message);
      res.status(500).json({ error: "Failed to generate FAQ" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}