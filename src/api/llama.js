import { client, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'POST') {
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

      res.json({ generated_text: botResponse });
    } catch (error) {
      console.error("Hugging Face API Error:", error.response ? error.response.data : error.message);
      res.status(500).json({ error: "Failed to generate response from Llama model" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}