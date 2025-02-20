import { client, deepseek } from '../../lib/ai';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { input, userId, prompts } = req.body;
    if (input) {
      // Generate response using AI
      try {
        let context = contextCache[userId] || [];
        const systemPreprompt = `...`; // Your system prompt
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
        console.error("Hugging Face API Error:", error);
        res.status(500).json({ error: "Failed to generate response" });
      }
    } else if (prompts) {
      // Generate FAQ
      try {
        const inputPrompt = `...`; // Your FAQ prompt
        const completion = await deepseek.chat.completions.create({
          model: "deepseek-chat",
          messages: [{ role: "user", content: inputPrompt }],
          max_tokens: 250,
        });
        let modelResponse = completion.choices[0]?.message?.content || "No response received.";
        const groupedFaq = modelResponse.split("\n").filter((line) => line.trim() !== "").map((line) => line.trim()).slice(0, 10).map((line, index) => `${line.replace(/^\d+\.\s*/, "")}`).join("\n");
        res.json({ generated_text: `FAQ:\n${groupedFaq}` });
      } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: "Failed to generate FAQ" });
      }
    } else {
      res.status(400).json({ error: "Invalid input" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}