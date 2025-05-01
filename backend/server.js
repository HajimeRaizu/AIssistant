import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import XLSX from "xlsx";
import { HfInference } from "@huggingface/inference";
import admin from "firebase-admin";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { createClient } from '@supabase/supabase-js';
import { CohereClient } from "cohere-ai";

const storage = multer.memoryStorage();
const upload = multer({ storage });

const __filename = fileURLToPath(import.meta.url);
const tempStorage = multer.memoryStorage();
const uploadTemp = multer({ storage: tempStorage });
const __dirname = path.dirname(__filename);

const type = process.env.FIREBASE_TYPE;
const project_id = process.env.FIREBASE_PROJECT_ID;
const private_key_id = process.env.FIREBASE_PRIVATE_KEY_ID;
const private_key = process.env.FIREBASE_PRIVATE_KEY;
const client_email = process.env.FIREBASE_CLIENT_EMAIL;
const client_id = process.env.FIREBASE_CLIENT_ID;
const auth_uri = process.env.FIREBASE_AUTH_URI;
const token_uri = process.env.FIREBASE_TOKEN_URI;
const auth_provider_x509_cert_url = process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL;
const client_x509_cert_url = process.env.FIREBASE_CLIENT_X509_CERT_URL;
const universe_domain = process.env.FIREBASE_UNIVERSE_DOMAIN;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY, // Make sure to store your API key securely
});

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert({
    type,
    project_id,
    private_key_id,
    private_key,
    client_email,
    client_id,
    auth_uri,
    token_uri,
    auth_provider_x509_cert_url,
    client_x509_cert_url,
    universe_domain,
  }),
});

const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 5000;

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const qwen = new OpenAI({
  "baseURL": process.env.QWEN_ENDPOINT,
  "apiKey": process.env.HUGGINGFACE_API_TOKEN
});

app.use(express.json());

app.use(cors({
  origin: "*",
  methods: "GET, POST, PUT, DELETE, OPTIONS",
  credentials: true,
  allowedHeaders: "Content-Type, Authorization"
}));

// Helper function to handle Firestore operations
const handleFirestoreError = (res, error) => {
  console.error("Firestore Error:", error);
  res.status(500).json({ error: "Firestore operation failed" });
};

// 2. Chat related functions
// Store chat messages
app.post("/api/storeChat", async (req, res) => {
  let { chatId, messages, chatName, userId } = req.body;

  // Validate chatId and generate a new one if it's null or empty
  if (!chatId) {
    chatId = Date.now().toString(); // Generate a new chatId using timestamp
  }

  try {
    const chatRef = db.collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      // If the chat does not exist, create a new one
      await chatRef.set({
        id: chatId,
        messages,
        chatName,
        userId,
        feedback: "",
        createdAt: new Date().toISOString(),
      });
    } else {
      // If the chat exists, update the messages field
      await chatRef.update({
        messages,
      });
    }

    res.status(200).json({ message: "Chat stored successfully", chatId });
  } catch (error) {
    handleFirestoreError(res, error);
  }
});

// Get all chats
app.get("/api/getChats", async (req, res) => {
  try {
    const chatsSnapshot = await db.collection("chats").get();
    const chats = chatsSnapshot.docs.map((doc) => doc.data());
    res.status(200).json(chats);
  } catch (error) {
    handleFirestoreError(res, error);
  }
});

// Get chats by userId
app.get("/api/getChats/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const chatsSnapshot = await db.collection("chats")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc") // Order by createdAt in descending order
      .get();

    const userChats = chatsSnapshot.docs.map((doc) => doc.data());
    res.status(200).json(userChats);
  } catch (error) {
    handleFirestoreError(res, error);
  }
});

// Get chat history by chatId and userId
app.get("/api/getChatHistory/:chatId/:userId", async (req, res) => {
  const { chatId, userId } = req.params;

  try {
    const chatRef = db.collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists || chatDoc.data().userId !== userId) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const messages = chatDoc.data().messages || [];

    // Fetch feedback status for each message
    const messagesWithFeedback = await Promise.all(
      messages.map(async (message) => {
        if (message.sender === "bot") {
          const feedbackRef = db.collection("feedback").doc(`${userId}_${message.messageId}`);
          const feedbackDoc = await feedbackRef.get();
          if (feedbackDoc.exists) {
            return { ...message, feedback: feedbackDoc.data().action }; // Add feedback status to the message
          }
        }
        return message;
      })
    );

    res.status(200).json(messagesWithFeedback);
  } catch (error) {
    console.error("Failed to fetch chat history:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

// Create a new chat
// Modify the /api/createChat endpoint to accept the first message
app.post("/api/createChat", async (req, res) => {
  const { userId, firstMessage } = req.body; // Add firstMessage to the request body
  const newChatId = Date.now().toString();
  const createdAt = new Date().toISOString();

  // Use the first 30 characters of the first message as the chat name
  const chatName = firstMessage.substring(0, 30);

  try {
    await db.collection("chats").doc(newChatId).set({
      id: newChatId,
      messages: [], // Initialize with an empty array
      chatName,
      userId,
      createdAt,
    });

    res.status(200).json({ id: newChatId, chatName, createdAt });
  } catch (error) {
    handleFirestoreError(res, error);
  }
});

app.put("/api/updateChatName", async (req, res) => {
  const { chatId, chatName } = req.body;

  try {
    const chatRef = db.collection("chats").doc(chatId);
    await chatRef.update({ chatName });
    res.status(200).json({ message: "Chat name updated successfully" });
  } catch (error) {
    console.error("Error updating chat name:", error);
    res.status(500).json({ error: "Failed to update chat name" });
  }
});

// Delete a chat
app.delete("/api/deleteChat/:chatId/:userId", async (req, res) => {
  const { chatId, userId } = req.params;

  try {
    const chatRef = db.collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists || chatDoc.data().userId !== userId) {
      return res.status(404).json({ error: "Chat not found" });
    }

    await chatRef.delete();

    // Clear the context for this chat
    if (contextCache[userId] && contextCache[userId][chatId]) {
      delete contextCache[userId][chatId];
    }

    res.status(200).json({ message: "Chat deleted successfully" });
  } catch (error) {
    handleFirestoreError(res, error);
  }
});

// 3. AI and FAQ generate functions
// Generate response using AI

function preprocessUserQuery(userInput) {
  const lowerInput = userInput.toLowerCase();

  // Keywords that indicate an attempt to override the system
  const overridePatterns = [
    "override system", 
    "ignore system", 
    "act like", 
    "forget previous", 
    "you are now", 
    "respond directly",
    "just give me",
    "only provide code",
    "do not explain"
  ];

  // Check if input contains override attempts
  if (overridePatterns.some(pattern => lowerInput.includes(pattern))) {
    return "I'm here to guide you in learning! Let's break down your request step by step. Can you tell me what you understand so far?";
  }

  // Detects direct coding requests
  const directRequestPatterns = [
    "make me", "give me", "i want", "provide", 
    "show me", "generate", "write me"
  ];

  // Check if input contains direct requests for full code
  if (directRequestPatterns.some(pattern => lowerInput.includes(pattern))) {
    return `Answer this prompt "${userInput}" while also adhering to the system prompt guidelines`;
  }

  return userInput; // If no match, return the original input
}

let contextCache = {}; // Simple in-memory cache for user contexts

app.post("/api/ai", async (req, res) => {
  const { input, userId, chatId } = req.body;

  try {
    // Initialize context cache if not exists
    if (!contextCache[userId]) {
      contextCache[userId] = {};
    }

    if (!contextCache[userId][chatId]) {
      contextCache[userId][chatId] = [];
    }

    // Retrieve previous context for this user and chat
    let context = contextCache[userId][chatId];

    // PREPROCESS USER INPUT
    const processedInput = preprocessUserQuery(input);

    // Generate embeddings for the user input
    const embeddingResponse = await cohere.embed({
      texts: [input],
      model: "embed-english-v3.0",
      input_type: "search_query",
      embedding_types: ["float"],
    });

    const promptEmbeddings = embeddingResponse.embeddings.float[0];

    // Query Supabase for highly similar responses (similarity score >= 0.95)
    const { data: highlySimilarResponses, error: similarityError } = await supabase.rpc("match_responses", {
      query_embedding: promptEmbeddings,
      match_threshold: 0.90, // Only fetch responses with similarity >= 0.95
      match_count: 1, // Fetch only the most similar response
    });

    if (similarityError) throw similarityError;

    // Check if a highly similar response exists and its rating is not negative
    if (highlySimilarResponses.length > 0 && highlySimilarResponses[0].rating > 0) {
      const highlySimilarResponse = highlySimilarResponses[0];

      // Stream the highly similar response back to the client
      res.setHeader("Content-Type", "text/plain");
      res.setHeader("Transfer-Encoding", "chunked");

      // Simulate streaming by sending the response in chunks
      const chunkSize = 25; // Number of characters per chunk
      for (let i = 0; i < highlySimilarResponse.response.length; i += chunkSize) {
        const chunk = highlySimilarResponse.response.slice(i, i + chunkSize);
        res.write(chunk);
        await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate delay
      }

      res.end();

      // Update the context cache with the new message and the highly similar response
      const newContext = [
        ...context,
        { role: "user", content: processedInput }, // Store processed input
        { role: "assistant", content: highlySimilarResponse.response }, // Store the highly similar response
      ];

      // Keep only the latest 2 interactions (user + assistant pairs)
      const latestInteractions = [];
      let userCount = 0;
      let assistantCount = 0;

      for (let i = newContext.length - 1; i >= 0; i--) {
        const message = newContext[i];

        if (message.role === "user" && userCount < 4) {
          latestInteractions.unshift(message);
          userCount++;
        } else if (message.role === "assistant" && assistantCount < 4) {
          latestInteractions.unshift(message);
          assistantCount++;
        }

        if (userCount === 4 && assistantCount === 4) {
          break;
        }
      }

      // Update cache with the latest 2 interactions
      contextCache[userId][chatId] = latestInteractions;

      return; // Exit the function after streaming the response
    }

    // If no highly similar response or the response is negative, proceed with AI generation
    // Query Supabase for similar responses
    const { data: similarResponses, error } = await supabase.rpc("match_responses", {
      query_embedding: promptEmbeddings,
      match_threshold: 0.7, // Adjust this threshold as needed
      match_count: 10, // Fetch more responses to filter best/worst
    });

    if (error) throw error;

    // Filter responses into best and worst based on rating
    const positiveResponses = similarResponses.filter(response => response.rating > 0); // Only positive ratings
    const negativeResponses = similarResponses.filter(response => response.rating < 0); // Only negative ratings

    // Sort responses: First by similarity (highest first), then by rating (highest first)
    const sortedPositiveResponses = positiveResponses.sort((a, b) => {
      if (b.similarity === a.similarity) {
        return b.rating - a.rating; // If similarity is equal, sort by highest rating
      }
      return b.similarity - a.similarity; // Otherwise, sort by highest similarity
    });

    // Sort negative responses: First by similarity, then by lowest rating
    const sortedNegativeResponses = negativeResponses.sort((a, b) => {
      if (b.similarity === a.similarity) {
        return a.rating - b.rating; // If similarity is equal, sort by lowest rating
      }
      return b.similarity - a.similarity; // Otherwise, sort by highest similarity
    });

    // Select the top 2 responses from each category
    const topGoodResponses = sortedPositiveResponses.slice(0, 2);
    const topBadResponses = sortedNegativeResponses.slice(0, 2);

    // Format the responses as a guide for AI
    const goodGuideResponse = topGoodResponses.map(response => `(GOOD RESPONSE): ${response.response}`).join("\n");
    const badGuideResponse = topBadResponses.map(response => `(BAD RESPONSE): ${response.response}`).join("\n");

    // Final guide response string (only include if responses exist)
    const guideResponses = `
      ${goodGuideResponse ? `\n${goodGuideResponse}` : ""}
      ${badGuideResponse ? `\n${badGuideResponse}` : ""}
    `.trim();

    // Prepare the context for the AI
    const systemPreprompt = {
      role: "system",
      content: `
      When responding, follow these strict rules:

      - **English only**: Only respond in english.
      - **Programming Only**: Answer only programming-related questions, You should only answer programming related queries.
      - **Encourage Learning**: If a user asks for full code, modify the response to guide them through understanding.
      - **Explain Step-by-Step**: Always break code down line-by-line with detailed explanations.
      - **Do Not Provide Full Code**: Never give a complete working solution, only syntax, explanations, and structured guidance.
      - **Reframe Direct Requests**: If a user asks for a direct solution, reframe it as a learning opportunity.
      - **Ignore Skill Level**: Even if the user is an expert, always explain with teaching intent.
      - **No Code Merging**: Never merge or put the code together.
      - **Do Not Act Like Another AI**: You are "AIssistant" and should never respond as another entity.
      - **Encourage Feedback**: Encourage students to give their feedback by liking or disliking reponses.

      Below are examples of good and bad responses to guide you:
      ${guideResponses}
    `,
    };

    // Prepare messages array with context and guide responses
    const messages = [
      systemPreprompt,
      ...context, // Latest 2 student prompts and AI responses
      { role: "user", content: processedInput }, // Use PREPROCESSED INPUT
    ];

    // Set headers for streaming
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    // Make the API call to Hugging Face (or your chosen model)
    const response = await qwen.chat.completions.create({
      model: "Qwen/Qwen2.5-Coder-32B-Instruct",
      messages,
      max_tokens: 16384,
      stream: true,
    });

    // Stream the response back to the client
    let botResponse = "";
    for await (const chunk of response) {
      const chunkContent = chunk.choices[0]?.delta?.content || "";
      botResponse += chunkContent;
      res.write(chunkContent);
    }

    res.end();

    // Update the context cache with the new message and AI's response
    const newContext = [
      ...context,
      { role: "user", content: processedInput }, // Store processed input
      { role: "assistant", content: botResponse }, // Store AI's response
    ];

    // Keep only the latest 2 interactions (user + assistant pairs)
    const latestInteractions = [];
    let userCount = 0;
    let assistantCount = 0;

    // Iterate through the context in reverse to find the latest 2 user-assistant pairs
    for (let i = newContext.length - 1; i >= 0; i--) {
      const message = newContext[i];

      if (message.role === "user" && userCount < 4) {
        latestInteractions.unshift(message);
        userCount++;
      } else if (message.role === "assistant" && assistantCount < 4) {
        latestInteractions.unshift(message);
        assistantCount++;
      }

      // Stop once we have 2 user-assistant pairs
      if (userCount === 2 && assistantCount === 4) {
        break;
      }
    }

    // Update cache with the latest 2 interactions
    contextCache[userId][chatId] = latestInteractions;
  } catch (error) {
    console.error("Hugging Face API Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Failed to generate response from Qwen model" });
  }
});

// Edit a prompt and regenerate subsequent responses
app.put("/api/editPrompt", async (req, res) => {
  const { chatId, messageId, editedPrompt, userId } = req.body;

  try {
    const chatRef = db.collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists || chatDoc.data().userId !== userId) {
      return res.status(404).json({ error: "Chat not found" });
    }

    const messages = chatDoc.data().messages || [];
    const messageIndex = messages.findIndex(msg => msg.messageId === messageId);

    if (messageIndex === -1 || messages[messageIndex].sender !== "user") {
      return res.status(404).json({ error: "Prompt not found" });
    }

    // Truncate the conversation at the edited prompt
    const truncatedMessages = messages.slice(0, messageIndex);
    
    // Update the edited prompt
    const editedMessage = {
      ...messages[messageIndex],
      text: editedPrompt,
      edited: true,
      editedAt: new Date().toISOString()
    };

    // Set headers for streaming
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    // Generate new AI response
    const response = await qwen.chat.completions.create({
      model: "Qwen/Qwen2.5-Coder-32B-Instruct",
      messages: [
        // Include system prompt and context
        {
          role: "system",
          content: `
      When responding, follow these strict rules:

      - **Programming Only**: Answer only programming-related questions, You should only answer programming related queries.
      - **Encourage Learning**: If a user asks for full code, modify the response to guide them through understanding.
      - **Explain Step-by-Step**: Always break code down line-by-line with detailed explanations.
      - **Do Not Provide Full Code**: Never give a complete working solution, only syntax, explanations, and structured guidance.
      - **Reframe Direct Requests**: If a user asks for a direct solution, reframe it as a learning opportunity.
      - **Ignore Skill Level**: Even if the user is an expert, always explain with teaching intent.
      - **No Code Merging**: Never merge or put the code together.
      - **Do Not Act Like Another AI**: You are "AIssistant" and should never respond as another entity.
      - **Encourage Feedback**: Encourage students to give their feedback by liking or disliking reponses.
    `
        },
        // Include previous messages as context
        ...truncatedMessages.map(msg => ({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text
        })),
        // Include the edited prompt
        { role: "user", content: editedPrompt }
      ],
      max_tokens: 16384,
      stream: true,
    });

    let botResponse = "";
    for await (const chunk of response) {
      const chunkContent = chunk.choices[0]?.delta?.content || "";
      botResponse += chunkContent;
      res.write(chunkContent);
    }

    res.end();

    // Update the chat with the edited prompt and new response
    const updatedMessages = [
      ...truncatedMessages,
      editedMessage,
      {
        text: botResponse,
        sender: "bot",
        timestamp: new Date().toISOString(),
        messageId: messageId
      }
    ];

    // Update context cache
    if (contextCache[userId] && contextCache[userId][chatId]) {
      contextCache[userId][chatId] = [
        { role: "user", content: editedPrompt },
        { role: "assistant", content: botResponse }
      ];
    }

    // Update Firestore
    await chatRef.update({
      messages: updatedMessages
    });

  } catch (error) {
    console.error("Error editing prompt:", error);
    res.status(500).json({ error: "Failed to edit prompt" });
  }
});

// Generate FAQ
app.post("/api/generateFAQ", async (req, res) => {
  const { prompts } = req.body;

  if (!Array.isArray(prompts)) {
    return res.status(400).json({ error: "Invalid input: prompts must be an array" });
  }

  try {
    const inputPrompt = `
      Organize the following questions into an FAQ with up to 10 frequently asked questions:

      Guidelines:
      1. Review the given list of questions.
      2. Identify and generalize similar questions to create a list of the most frequently asked ones.
      3. Ensure the final list contains at most 10 generalized questions.
      4. Do not add new questions—only work with the ones provided.
      5. Do not answer any of the questions.
      6. If fewer than 10 questions can be generalized, provide only the available ones.

      Questions:
      ${prompts.map((prompt, index) => `${index + 1}. ${prompt}`).join("\n")}
    `;

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: inputPrompt,
        },
      ],
      max_tokens: 8192,
      stream: true
    });

    const stream = response.data;
    for await (const chunk of response) {
      const botResponse = chunk.choices[0]?.delta?.content || "";
      res.write(botResponse);
    }

    res.end();
  } catch (error) {
    console.error("Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Failed to generate FAQ" });
  }
});

app.post("/api/generateFAQInstructor", async (req, res) => {
  const { prompts } = req.body;

  if (!Array.isArray(prompts)) {
    return res.status(400).json({ error: "Invalid input: prompts must be an array" });
  }

  try {
    const inputPrompt = `
      Organize the following questions into an FAQ with up to 10 frequently asked questions:

      Guidelines:
      1. Review the given list of questions.
      2. Identify and generalize similar questions to create a list of the most frequently asked ones.
      3. Ensure the final list contains at most 10 generalized questions.
      4. Do not add new questions—only work with the ones provided.
      5. Do not answer any of the questions.
      6. If fewer than 10 questions can be generalized, provide only the available ones.

      Questions:
      ${prompts.map((prompt, index) => `${index + 1}. ${prompt}`).join("\n")}
    `;

    // Set headers for streaming
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    // Call the AI model to generate the FAQ
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: inputPrompt,
        },
      ],
      max_tokens: 8192,
      stream: true, // Enable streaming
    });

    // Stream the response back to the client
    for await (const chunk of response) {
      const botResponse = chunk.choices[0]?.delta?.content || "";
      res.write(botResponse);
    }

    // End the response
    res.end();
  } catch (error) {
    console.error("Error generating FAQ:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Failed to generate FAQ" });
  }
});

// 4. User management functions
// Get all users
app.get("/api/getUsers", async (req, res) => {
  try {
    // Query the 'students' collection instead of 'users'
    const usersSnapshot = await db.collection("users").get();
    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id, // Use the document ID as the user ID
      email: doc.data().email,
      name: doc.data().name,
      password: doc.data().password,
    }));
    res.status(200).json(users);
  } catch (error) {
    handleFirestoreError(res, error);
  }
});

// Update user information
app.put("/api/updateUser/:userId", async (req, res) => {
  const { userId } = req.params;
  const { name, email } = req.body;

  try {
    const userRef = db.collection("users").doc(userId);
    await userRef.update({ name, email });
    res.status(200).json({ message: "User updated successfully" });
  } catch (error) {
    handleFirestoreError(res, error);
  }
});

app.put("/api/updateUserRole/:userId", async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  try {
    const userRef = db.collection("users").doc(userId);
    await userRef.update({ role });
    res.status(200).json({ message: "User role updated successfully" });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// Get all instructors
app.get("/api/getInstructors", async (req, res) => {
  try {
    const usersSnapshot = await db.collection("users").where("role", "==", "instructor").get();
    const instructors = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      email: doc.data().email,
      name: doc.data().name,
      role: doc.data().role || "instructor", // Default to "instructor" if role is not set
    }));
    res.status(200).json(instructors);
  } catch (error) {
    handleFirestoreError(res, error);
  }
});

// Update instructor information
app.put("/api/updateUserRole/:userId", async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  try {
    const userRef = db.collection("users").doc(userId);
    await userRef.update({ role });
    res.status(200).json({ message: "User role updated successfully" });
  } catch (error) {
    console.error("Error updating user role:", error);
    res.status(500).json({ error: "Failed to update user role" });
  }
});

// Delete an instructor
app.delete("/api/deleteInstructor/:instructorEmail", async (req, res) => {
  const { instructorEmail } = req.params;

  try {
    // Query the instructors collection to find the instructor by email
    const instructorsRef = db.collection("instructors");
    const querySnapshot = await instructorsRef.where("email", "==", instructorEmail).get();

    if (querySnapshot.empty) {
      return res.status(404).json({ error: "Instructor not found" });
    }

    // Delete the instructor document(s) matching the email
    const batch = db.batch();
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    res.status(200).json({ message: "Instructor deleted successfully" });
  } catch (error) {
    console.error("Error deleting instructor:", error);
    res.status(500).json({ error: "Failed to delete instructor" });
  }
});

// Delete a user
app.delete("/api/deleteUser/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    await db.collection("users").doc(userId).delete();
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    handleFirestoreError(res, error);
  }
});

// User login
app.post("/api/login", async (req, res) => {
  const { studentId, password } = req.body; // Change from email to studentId

  try {
    // Query the 'students' collection for the provided studentId
    const usersSnapshot = await db.collection("users").where("studentId", "==", studentId).get();

    if (usersSnapshot.empty) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Get the first matching user document
    const userDoc = usersSnapshot.docs[0];
    const user = userDoc.data();

    // Check the password
    if (user.password === password) {
      res.status(200).json({
        message: "Login successful",
        user: {
          id: userDoc.id, // Use the document ID as the user ID
          name: user.name, // Use the 'name' field from the document
          studentId: user.studentId, // Use the 'studentId' field from the document
        },
      });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    handleFirestoreError(res, error);
  }
});

// 5. Learning materials and exercises functions
// Get learning materials for the logged-in instructor
app.get("/api/getLearningMaterials", async (req, res) => {
  const { subjectCodes } = req.query;

  try {
    if (!subjectCodes || !Array.isArray(subjectCodes)) {
      return res.status(400).json({ error: "Invalid learning material code" });
    }

    const learningMaterialsRef = db.collection("learningMaterials");
    const querySnapshot = await learningMaterialsRef.where("subjectCode", "in", subjectCodes).get();

    if (querySnapshot.empty) {
      return res.status(200).json({});
    }

    const learningMaterials = {};
    querySnapshot.forEach((doc) => {
      const material = doc.data();
      const { subjectName, lessons, ownerEmail, ownerName, subjectCode } = material;

      // Initialize the subject in the learningMaterials object
      if (!learningMaterials[subjectName]) {
        learningMaterials[subjectName] = {
          subjectName,
          ownerEmail,
          ownerName,
          subjectCode,
          lessons: [],
        };
      }

      // Iterate through lessons
      lessons.forEach((lesson) => {
        const { lessonName, subtopics } = lesson;

        // Initialize the lesson in the subject
        const lessonData = {
          lessonName,
          subtopics: [],
        };

        // Iterate through subtopics
        subtopics.forEach((subtopic) => {
          const { "subtopicTitle": subtopicTitle, content, questions, answers, attachments } = subtopic;

          // Add subtopic data to the lesson
          lessonData.subtopics.push({
            subtopicTitle,
            content,
            questions,
            answers,
            attachments
          });
        });

        // Add lesson data to the subject
        learningMaterials[subjectName].lessons.push(lessonData);
      });
    });

    res.status(200).json(learningMaterials);
  } catch (error) {
    console.error("Error fetching learning materials:", error);
    res.status(500).json({ error: "Failed to fetch learning materials" });
  }
});

// Endpoint to get learning materials for a specific instructor
app.get('/api/getInstructorLearningMaterials', async (req, res) => {
  const { instructorEmail } = req.query;

  try {
    const snapshot = await db.collection('learningMaterials')
      .where('ownerEmail', '==', instructorEmail)
      .get();

    const learningMaterials = {};
    snapshot.forEach(doc => {
      learningMaterials[doc.id] = doc.data();
    });

    res.status(200).send(learningMaterials);
  } catch (error) {
    console.error('Error fetching learning materials:', error);
    res.status(500).send({ message: 'Failed to fetch learning materials.' });
  }
});

// Add this endpoint to get the total number of learning materials
app.get("/api/getTotalLearningMaterials", async (req, res) => {
  try {
    const learningMaterialsSnapshot = await db.collection("learningMaterials").get();
    const totalLearningMaterials = learningMaterialsSnapshot.size; // Get the total count of documents
    res.status(200).json({ totalLearningMaterials });
  } catch (error) {
    console.error("Error fetching total learning materials:", error);
    res.status(500).json({ error: "Failed to fetch total learning materials" });
  }
});

const generateSubjectCode = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

app.post('/api/uploadLearningMaterials', async (req, res) => {
  const { learningMaterials, instructorEmail, ownerName } = req.body;

  try {
    let subjectCode;
    let subjectRef;
    let doc;

    // Generate a unique subject code
    do {
      subjectCode = generateSubjectCode(6); // Adjust length if needed
      subjectRef = db.collection('learningMaterials').doc(subjectCode);
      doc = await subjectRef.get();
    } while (doc.exists); // Ensure uniqueness

    // Save to Firestore with the new structure
    await subjectRef.set({
      subjectName: learningMaterials.subjectName,
      ownerName: ownerName,
      ownerEmail: instructorEmail,
      subjectCode: subjectCode,
      lessons: learningMaterials.lessons,
    });

    res.status(200).send({ message: 'Learning materials uploaded successfully!', subjectCode });
  } catch (error) {
    console.error('Error uploading learning materials:', error);
    res.status(500).send({ message: 'Failed to upload learning materials.' });
  }
});


// Helper function to generate a unique ID
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Update an exercise
app.put("/api/updateExercise/:subjectCode/:lessonIndex/:subtopicIndex", async (req, res) => {
  const { subjectCode, lessonIndex, subtopicIndex } = req.params;
  const { content, questions, answers } = req.body;

  try {
    const subjectRef = db.collection("learningMaterials").doc(subjectCode);
    const subjectDoc = await subjectRef.get();

    if (!subjectDoc.exists) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const subjectData = subjectDoc.data();
    const lessons = subjectData.lessons || [];

    if (!lessons[lessonIndex] || !lessons[lessonIndex].subtopics[subtopicIndex]) {
      return res.status(404).json({ error: "Lesson or subtopic not found" });
    }

    // Update the specific subtopic
    lessons[lessonIndex].subtopics[subtopicIndex].content = content;
    lessons[lessonIndex].subtopics[subtopicIndex].questions = questions;
    lessons[lessonIndex].subtopics[subtopicIndex].answers = answers;

    // Update Firestore document
    await subjectRef.update({ lessons });

    res.status(200).json({ message: "Exercise updated successfully" });
  } catch (error) {
    console.error("Error updating exercise:", error);
    res.status(500).json({ error: "Failed to update exercise" });
  }
});

// Delete a subject
// Update this endpoint in server.js
app.delete("/api/deleteSubject/:subjectCode", async (req, res) => {
  const { subjectCode } = req.params;
  const { instructorEmail } = req.query;

  try {
    const subjectRef = db.collection("learningMaterials").doc(subjectCode);
    const doc = await subjectRef.get();

    if (!doc.exists || doc.data().ownerEmail !== instructorEmail) {
      return res.status(404).json({ error: "Subject not found or unauthorized" });
    }

    const subjectData = doc.data();
    
    // Get all attachments from all subtopics in all lessons
    const attachmentsToDelete = [];
    const lessons = subjectData.lessons || [];
    
    for (const lesson of lessons) {
      const subtopics = lesson.subtopics || [];
      for (const subtopic of subtopics) {
        if (subtopic.attachments && subtopic.attachments.length > 0) {
          attachmentsToDelete.push(...subtopic.attachments);
        }
      }
    }

    // Delete all attachments from storage
    /*if (attachmentsToDelete.length > 0) {
      await deleteAttachmentsFromStorage(attachmentsToDelete);
    }*/

    // Delete the subject document
    await subjectRef.delete();
    
    res.status(200).json({ message: "Subject deleted successfully" });
  } catch (error) {
    console.error("Error deleting subject:", error);
    res.status(500).json({ error: "Failed to delete subject" });
  }
});

// Update this endpoint in server.js
app.delete("/api/deleteLesson/:subjectCode/:lessonIndex", async (req, res) => {
  const { subjectCode, lessonIndex } = req.params;

  try {
    const subjectRef = db.collection("learningMaterials").doc(subjectCode);
    const subjectDoc = await subjectRef.get();

    if (!subjectDoc.exists) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const subjectData = subjectDoc.data();
    const lessons = subjectData.lessons || [];

    if (!lessons[lessonIndex]) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    // Get all attachments from all subtopics in this lesson
    const attachmentsToDelete = [];
    const subtopics = lessons[lessonIndex].subtopics || [];
    
    for (const subtopic of subtopics) {
      if (subtopic.attachments && subtopic.attachments.length > 0) {
        attachmentsToDelete.push(...subtopic.attachments);
      }
    }

    // Delete all attachments from storage
    /*if (attachmentsToDelete.length > 0) {
      await deleteAttachmentsFromStorage(attachmentsToDelete);
    }*/

    // Remove the lesson
    lessons.splice(lessonIndex, 1);
    await subjectRef.update({ lessons });

    res.status(200).json({ message: "Lesson deleted successfully!" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    res.status(500).json({ error: "Failed to delete lesson" });
  }
});

// Update this endpoint in server.js
app.delete("/api/deleteSubtopic/:subjectCode/:lessonIndex/:subtopicIndex", async (req, res) => {
  const { subjectCode, lessonIndex, subtopicIndex } = req.params;

  try {
    const subjectRef = db.collection("learningMaterials").doc(subjectCode);
    const subjectDoc = await subjectRef.get();

    if (!subjectDoc.exists) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const subjectData = subjectDoc.data();
    const lessons = subjectData.lessons || [];

    if (!lessons[lessonIndex] || !lessons[lessonIndex].subtopics[subtopicIndex]) {
      return res.status(404).json({ error: "Lesson or subtopic not found" });
    }

    // Get attachments before deleting
    const subtopic = lessons[lessonIndex].subtopics[subtopicIndex];
    const attachments = subtopic.attachments || [];

    // Delete attachments from storage
    /*if(attachments.length > 0) {
      await deleteAttachmentsFromStorage(attachments);
    }*/

    // Remove the subtopic
    lessons[lessonIndex].subtopics.splice(subtopicIndex, 1);
    await subjectRef.update({ lessons });

    res.status(200).json({ message: "Subtopic deleted successfully!" });
  } catch (error) {
    console.error("Error deleting subtopic:", error);
    res.status(500).json({ error: "Failed to delete subtopic" });
  }
});

// Add this endpoint to fetch university info
app.get("/api/getUniversityInfo", async (req, res) => {
  try {
    const universityInfoRef = db.collection("universityInfo").doc("Tandag");
    const universityInfoDoc = await universityInfoRef.get();

    if (!universityInfoDoc.exists) {
      // If the document doesn't exist, create it with default values
      await universityInfoRef.set({ branch: "Tandag", info: "Default university info" });
      return res.status(200).json({ branch: "Tandag", info: "Default university info" });
    }

    res.status(200).json(universityInfoDoc.data());
  } catch (error) {
    handleFirestoreError(res, error);
  }
});

// Add this endpoint to update university info
app.put("/api/updateUniversityInfo", async (req, res) => {
  const { info } = req.body;

  try {
    const universityInfoRef = db.collection("universityInfo").doc("Tandag");
    const universityInfoDoc = await universityInfoRef.get();

    if (!universityInfoDoc.exists) {
      // If the document doesn't exist, create it with the provided info
      await universityInfoRef.set({ branch: "Tandag", info });
      return res.status(200).json({ message: "University info created successfully" });
    }

    // If the document exists, update it
    await universityInfoRef.update({ info });
    res.status(200).json({ message: "University info updated successfully" });
  } catch (error) {
    handleFirestoreError(res, error);
  }
});

app.get("/api/checkInstructorEmail", async (req, res) => {
  const { email } = req.query;

  try {
    const instructorRef = db.collection("instructors").where("email", "==", email);
    const snapshot = await instructorRef.get();

    if (snapshot.empty) {
      res.status(200).json({ exists: false });
    } else {
      res.status(200).json({ exists: true });
    }
  } catch (error) {
    console.error("Error checking instructor email:", error);
    res.status(500).json({ error: "Failed to check instructor email" });
  }
});

app.post("/api/addAccessLearningMaterial", async (req, res) => {
  const { studentId, subjectCode } = req.body;

  try {
    // Check if the subjectCode exists in the learningMaterials collection
    const learningMaterialsRef = db.collection("learningMaterials");
    const querySnapshot = await learningMaterialsRef.where("subjectCode", "==", subjectCode).get();

    if (querySnapshot.empty) {
      return res.status(404).json({ error: "Invalid learning materials code. Please check the code and try again." });
    }

    const accessRef = db.collection("accessLearningMaterials").doc(studentId);
    const accessDoc = await accessRef.get();

    if (!accessDoc.exists) {
      // If the document doesn't exist, create it with subjectCodes as an array
      await accessRef.set({
        studentId,
        subjectCodes: [subjectCode], // Use subjectCodes instead of subjectCode
      });
    } else {
      // If the document exists, update the subjectCodes array
      const existingIds = accessDoc.data().subjectCodes || [];
      if (!existingIds.includes(subjectCode)) {
        existingIds.push(subjectCode);
        await accessRef.update({ subjectCodes: existingIds });
      }
    }

    res.status(200).json({ message: "Subject ID added successfully" });
  } catch (error) {
    console.error("Error adding subject ID:", error);
    res.status(500).json({ error: "Failed to add subject ID" });
  }
});

app.get("/api/getAccessLearningMaterials", async (req, res) => {
  const { studentId } = req.query;

  try {
    const accessRef = db.collection("accessLearningMaterials").doc(studentId);
    const accessDoc = await accessRef.get();

    if (!accessDoc.exists) {
      return res.status(200).json({ subjectCodes: [] }); // Change from subjectCodes to subjectCodes
    }

    res.status(200).json(accessDoc.data());
  } catch (error) {
    console.error("Error fetching access learning materials:", error);
    res.status(500).json({ error: "Failed to fetch access learning materials" });
  }
});

// Add this endpoint to handle Google login and user role checking
app.post("/api/googleLogin", async (req, res) => {
  const { email, name, profileImage } = req.body;

  try {
    // Check if the email ends with @nemsu.edu.ph
    if (!email.endsWith("@nemsu.edu.ph")) {
      return res.status(403).json({ error: "Only @nemsu.edu.ph emails are allowed to login." });
    }

    // Check if the user exists in the database
    const usersSnapshot = await db.collection("users").where("email", "==", email).get();

    let userData;
    if (usersSnapshot.empty) {
      // If the user does not exist, create a new user with the default role as "student"
      const newUserRef = db.collection("users").doc();
      userData = {
        id: newUserRef.id,
        email,
        name,
        profileImage,
        role: "student", // Default role
        createdAt: new Date().toISOString(),
      };
      await newUserRef.set(userData);
    } else {
      // If the user exists
      const userDoc = usersSnapshot.docs[0];
      userData = userDoc.data();
      
      // Check if any of the fields have changed
      const updates = {};
      if (userData.name !== name) updates.name = name;
      if (userData.profileImage !== profileImage) updates.profileImage = profileImage;
      
      // If there are changes, update the user document
      if (Object.keys(updates).length > 0) {
        updates.updatedAt = new Date().toISOString();
        await userDoc.ref.update(updates);
        // Update the userData with the new values
        userData = { ...userData, ...updates };
      }
    }

    // Return the user data including their role
    res.status(200).json(userData);
  } catch (error) {
    console.error("Error during Google login:", error);
    res.status(500).json({ error: "Failed to process Google login" });
  }
});

app.get("/api/getStudents", async (req, res) => {
  try {
    const usersSnapshot = await db.collection("users").where("role", "==", "student").get();
    const students = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      email: doc.data().email,
      name: doc.data().name,
      role: doc.data().role || "student", // Default to "student" if role is not set
    }));
    res.status(200).json(students);
  } catch (error) {
    handleFirestoreError(res, error);
  }
});

app.get("/api/getUserRole", async (req, res) => {
  const { email } = req.query;

  try {
    const userSnapshot = await db.collection("users").where("email", "==", email).get();
    if (userSnapshot.empty) {
      return res.status(404).json({ error: "User not found" });
    }

    const userDoc = userSnapshot.docs[0];
    const role = userDoc.data().role || "student"; // Default to "student" if role is not set
    res.status(200).json({ role });
  } catch (error) {
    console.error("Error fetching user role:", error);
    res.status(500).json({ error: "Failed to fetch user role" });
  }
});

// Endpoint to remove access to a subject for a student
app.delete("/api/removeAccessLearningMaterial", async (req, res) => {
  const { studentId, subjectCode } = req.body;

  try {
    const accessRef = db.collection("accessLearningMaterials").doc(studentId);
    const accessDoc = await accessRef.get();

    if (!accessDoc.exists) {
      return res.status(404).json({ error: "Access record not found" });
    }

    const existingIds = accessDoc.data().subjectCodes || [];

    // Ensure subjectCode is a string for comparison
    const updatedIds = existingIds.filter(id => id !== subjectCode.toString());

    await accessRef.update({ subjectCodes: updatedIds });

    res.status(200).json({ message: "Access removed successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to remove access" });
  }
});

app.post("/api/createSubject", async (req, res) => {
  const { subjectName, ownerName, ownerEmail } = req.body;

  try {
    // Generate a unique subject code
    const subjectCode = generateSubjectCode(6); // Adjust length if needed

    // Create the subject document in Firestore
    const subjectRef = db.collection("learningMaterials").doc(subjectCode);
    await subjectRef.set({
      subjectName,
      ownerName,
      ownerEmail,
      subjectCode,
      lessons: [], // Initialize with an empty lessons array
    });

    res.status(200).json({ message: "Subject created successfully!", subjectCode });
  } catch (error) {
    console.error("Error creating subject:", error);
    res.status(500).json({ error: "Failed to create subject" });
  }
});

app.put("/api/addLesson/:subjectCode", async (req, res) => {
  const { subjectCode } = req.params;
  const { lessonName } = req.body;

  try {
    const subjectRef = db.collection("learningMaterials").doc(subjectCode);
    const subjectDoc = await subjectRef.get();

    if (!subjectDoc.exists) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const subjectData = subjectDoc.data();
    const lessons = subjectData.lessons || [];

    // Add the new lesson to the lessons array
    lessons.push({
      lessonName,
      subtopics: [], // Initialize with an empty subtopics array
    });

    // Update the subject document in Firestore
    await subjectRef.update({ lessons });

    res.status(200).json({ message: "Lesson added successfully!" });
  } catch (error) {
    console.error("Error adding lesson:", error);
    res.status(500).json({ error: "Failed to add lesson" });
  }
});

app.put("/api/addSubtopic/:subjectCode/:lessonIndex", async (req, res) => {
  const { subjectCode, lessonIndex } = req.params;
  const { subtopicTitle, content, questions, answers, attachments } = req.body;

  try {
    const subjectRef = db.collection("learningMaterials").doc(subjectCode);
    const subjectDoc = await subjectRef.get();

    if (!subjectDoc.exists) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const subjectData = subjectDoc.data();
    const lessons = subjectData.lessons || [];

    if (!lessons[lessonIndex]) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    // Add the new subtopic without attachments first
    const newSubtopic = {
      subtopicTitle,
      content,
      questions,
      answers,
      attachments: attachments || []
    };

    lessons[lessonIndex].subtopics.push(newSubtopic);
    
    // Update the subject document in Firestore
    await subjectRef.update({ lessons });

    res.status(200).json({ 
      message: "Subtopic added successfully!",
      subtopicIndex: lessons[lessonIndex].subtopics.length - 1 // Return the new subtopic index
    });
  } catch (error) {
    console.error("Error adding subtopic:", error);
    res.status(500).json({ error: "Failed to add subtopic" });
  }
});

// Add this endpoint to generate questions based on content
// In your server.js
app.post("/api/generateQuestions", async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: "Content is required" });
  }

  try {
    const prompt = `Based on the following educational content, generate exactly 5 identification or true or false questions that would help students test their understanding of the material. The answers should be one word only that should also be found in the material. if questions cant be made from the eductational content, leave it blank

Format your response EXACTLY like this example:

### Questions
1. What is the capital of France?
2. Is Paris located on the Seine River? (True/False)
3. What is the main language spoken in France?
4. Does France use the Euro as currency? (True/False)
5. What is France's national anthem called?

### Answers
1. Paris
2. True
3. French
4. True
5. Marseillaise

Content to base questions on:
${content}`;

    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1024,
    });

    const generatedText = response.choices[0].message.content;

    // More robust parsing
    const questions = [];
    const answers = [];
    
    // Split into lines and process
    const lines = generatedText.split('\n');
    let currentSection = null;
    
    for (const line of lines) {
      if (line.startsWith('### Questions')) {
        currentSection = 'questions';
        continue;
      } else if (line.startsWith('### Answers')) {
        currentSection = 'answers';
        continue;
      }
      
      // Process numbered lines (1., 2., etc.)
      const numberedLine = line.match(/^\d+\.\s*(.+)/);
      if (numberedLine) {
        if (currentSection === 'questions') {
          questions.push(numberedLine[1].trim());
        } else if (currentSection === 'answers') {
          answers.push(numberedLine[1].trim());
        }
      }
    }

    // Format for response
    const formattedQuestions = questions.join('\n');
    const formattedAnswers = answers.join('\n');

    if (questions.length === 0 || answers.length === 0) {
      throw new Error("Failed to extract questions and answers");
    }

    res.status(200).json({ 
      questions: formattedQuestions,
      answers: formattedAnswers 
    });
  } catch (error) {
    console.error("Error generating questions:", error);
    res.status(500).json({ 
      error: "Failed to generate questions",
      details: error.message 
    });
  }
});

app.put("/api/updateSubtopic/:subjectCode/:lessonIndex/:subtopicIndex", async (req, res) => {
  const { subjectCode, lessonIndex, subtopicIndex } = req.params;
  const { subtopicTitle, content, questions, answers } = req.body;

  try {
    const subjectRef = db.collection("learningMaterials").doc(subjectCode);
    const subjectDoc = await subjectRef.get();

    if (!subjectDoc.exists) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const subjectData = subjectDoc.data();
    const lessons = subjectData.lessons || [];

    if (!lessons[lessonIndex] || !lessons[lessonIndex].subtopics[subtopicIndex]) {
      return res.status(404).json({ error: "Lesson or subtopic not found" });
    }

    lessons[lessonIndex].subtopics[subtopicIndex].subtopicTitle = subtopicTitle;
    lessons[lessonIndex].subtopics[subtopicIndex].content = content;
    lessons[lessonIndex].subtopics[subtopicIndex].questions = questions;
    lessons[lessonIndex].subtopics[subtopicIndex].answers = answers;

    await subjectRef.update({ lessons });

    res.status(200).json({ message: "Subtopic updated successfully!" });
  } catch (error) {
    console.error("Error updating subtopic:", error);
    res.status(500).json({ error: "Failed to update subtopic" });
  }
});

app.put("/api/updateLessonName/:subjectCode/:lessonIndex", async (req, res) => {
  const { subjectCode, lessonIndex } = req.params;
  const { lessonName } = req.body;

  try {
    const subjectRef = db.collection("learningMaterials").doc(subjectCode);
    const subjectDoc = await subjectRef.get();

    if (!subjectDoc.exists) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const subjectData = subjectDoc.data();
    const lessons = subjectData.lessons || [];

    if (!lessons[lessonIndex]) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    // Update the lesson name
    lessons[lessonIndex].lessonName = lessonName;

    // Update the subject document in Firestore
    await subjectRef.update({ lessons });

    res.status(200).json({ message: "Lesson name updated successfully!" });
  } catch (error) {
    console.error("Error updating lesson name:", error);
    res.status(500).json({ error: "Failed to update lesson name" });
  }
});

app.put("/api/updateSubjectName/:subjectCode", async (req, res) => {
  const { subjectCode } = req.params;
  const { subjectName } = req.body;

  try {
    const subjectRef = db.collection("learningMaterials").doc(subjectCode);
    await subjectRef.update({ subjectName });

    res.status(200).json({ message: "Subject name updated successfully!" });
  } catch (error) {
    console.error("Error updating subject name:", error);
    res.status(500).json({ error: "Failed to update subject name" });
  }
});

app.get("/api/getStudentsBySubjects", async (req, res) => {
  const { subjectCodes } = req.query;

  // Validate the subjectCodes parameter
  if (!subjectCodes || !Array.isArray(subjectCodes)) {
    return res.status(400).json({ error: "subjectCodes must be an array" });
  }

  try {
    // Query Firestore for students who have access to the given subject codes
    const snapshot = await db.collection("accessLearningMaterials")
      .where("subjectCodes", "array-contains-any", subjectCodes)
      .get();

    const students = [];
    snapshot.forEach(doc => {
      const studentData = doc.data();
      if (studentData.studentId) {
        // Push only the studentId (or email) to the students array
        students.push({ email: studentData.studentId }); // Assuming studentId is the email
      }
    });

    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching students by subjects:", error);
    res.status(500).json({ error: "Failed to fetch students by subjects." });
  }
});

app.get("/api/getStudentPrompts", async (req, res) => {
  const { studentEmail } = req.query;

  try {
    // Query Firestore for chats belonging to the student
    const snapshot = await db.collection("chats")
      .where("userId", "==", studentEmail)
      .get();

    const prompts = [];
    snapshot.forEach(doc => {
      const messages = doc.data().messages || [];
      prompts.push(...messages.filter(message => message.sender === "user"));
    });

    res.status(200).json(prompts);
  } catch (error) {
    console.error("Error fetching student prompts:", error);
    res.status(500).json({ error: "Failed to fetch student prompts." });
  }
});

app.get("/api/getStudentPromptsByInstructor", async (req, res) => {
  const { instructorEmail } = req.query;

  try {
    // Step 1: Fetch the subjects owned by the instructor
    const subjectsSnapshot = await db.collection("learningMaterials")
      .where("ownerEmail", "==", instructorEmail)
      .get();

    if (subjectsSnapshot.empty) {
      return res.status(200).json([]); // No subjects found for the instructor
    }

    const subjectCodes = subjectsSnapshot.docs.map(doc => doc.data().subjectCode);

    // Step 2: Fetch students who have access to these subjects
    const accessSnapshot = await db.collection("accessLearningMaterials")
      .where("subjectCodes", "array-contains-any", subjectCodes)
      .get();

    if (accessSnapshot.empty) {
      return res.status(200).json([]); // No students found with access
    }

    const studentEmails = accessSnapshot.docs.map(doc => doc.data().studentId);

    // Step 3: Fetch prompts from these students
    const prompts = [];
    for (const studentEmail of studentEmails) {
      const chatsSnapshot = await db.collection("chats")
        .where("userId", "==", studentEmail)
        .get();

      chatsSnapshot.forEach(doc => {
        const messages = doc.data().messages || [];
        prompts.push(...messages.filter(message => message.sender === "user"));
      });
    }

    res.status(200).json(prompts);
  } catch (error) {
    console.error("Error fetching student prompts by instructor:", error);
    res.status(500).json({ error: "Failed to fetch student prompts by instructor." });
  }
});

app.post("/api/likeDislikeResponse", async (req, res) => {
  const { studentPrompt, response, action, messageId, userId } = req.body;

  try {
    // Check if the user has already reacted to this message
    const feedbackRef = db.collection("feedback").doc(`${userId}_${messageId}`);
    const feedbackDoc = await feedbackRef.get();

    if (feedbackDoc.exists) {
      return res.status(400).json({ error: "You have already reacted to this message." });
    }

    // Generate embeddings for the student prompt
    const embeddingResponse = await cohere.embed({
      texts: [studentPrompt],
      model: "embed-english-v3.0",
      input_type: "search_query",
      embedding_types: ["float"],
    });

    const promptEmbeddings = embeddingResponse.embeddings.float[0];

    // Determine the rating based on the action
    const rating = action === 'like' ? 1 : -1;

    // Insert the data into the Supabase database
    const { data, error } = await supabase
      .from("responses")
      .insert([
        {
          student_prompt: studentPrompt,
          prompt_embeddings: promptEmbeddings,
          response: response,
          rating: rating,
        },
      ]);

    if (error) throw error;

    // Store the feedback in Firestore
    await feedbackRef.set({
      userId,
      messageId,
      action, // 'like' or 'dislike'
      timestamp: new Date().toISOString(),
    });

    res.status(200).json({ success: true, message: "Response liked/disliked successfully" });
  } catch (error) {
    console.error("Error handling like/dislike:", error);
    res.status(500).json({ success: false, error: "Failed to handle like/dislike" });
  }
});

app.get("/api/checkFeedback", async (req, res) => {
  const { userId, messageId } = req.query;

  try {
    const feedbackRef = db.collection("feedback").doc(`${userId}_${messageId}`);
    const feedbackDoc = await feedbackRef.get();

    if (feedbackDoc.exists) {
      res.status(200).json({ exists: true });
    } else {
      res.status(200).json({ exists: false });
    }
  } catch (error) {
    console.error("Error checking feedback:", error);
    res.status(500).json({ error: "Failed to check feedback" });
  }
});

app.post("/api/uploadAttachment", upload.single('file'), async (req, res) => {
  const { subjectCode, lessonName, subtopicName, lessonIndex, subtopicIndex } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Check file size (50MB limit)
  if (file.size > 50 * 1024 * 1024) {
    return res.status(400).json({ error: "File size exceeds 50MB limit" });
  }

  try {
    // Generate unique filename
    const fileExt = path.extname(file.originalname);
    const fileName = `${file.originalname}`;
    const filePath = `attachments/${subjectCode}/${lessonName}/${subtopicName}/${fileName}`;

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('learning-materials') // Your bucket name
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('learning-materials')
      .getPublicUrl(filePath);

    // Add reference to Firestore
    const subjectRef = db.collection("learningMaterials").doc(subjectCode);
    const subjectDoc = await subjectRef.get();

    if (!subjectDoc.exists) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const subjectData = subjectDoc.data();
    const lessons = subjectData.lessons || [];

    if (!lessons[lessonIndex] || !lessons[lessonIndex].subtopics[subtopicIndex]) {
      return res.status(404).json({ error: "Lesson or subtopic not found" });
    }

    // Initialize attachments array if it doesn't exist
    if (!lessons[lessonIndex].subtopics[subtopicIndex].attachments) {
      lessons[lessonIndex].subtopics[subtopicIndex].attachments = [];
    }

    // Add new attachment
    lessons[lessonIndex].subtopics[subtopicIndex].attachments.push({
      name: file.originalname,
      url: urlData.publicUrl,
      path: filePath,
      size: file.size,
      type: file.mimetype,
      uploadedAt: new Date().toISOString()
    });

    // Update Firestore
    await subjectRef.update({ lessons });

    res.status(200).json({ 
      message: "File uploaded successfully",
      attachment: {
        name: file.originalname,
        url: urlData.publicUrl
      }
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// Add this endpoint to delete attachments
app.delete("/api/deleteAttachment/:subjectCode/:lessonIndex/:lessonName/:subtopicIndex/:subtopicTitle/:attachmentIndex/:attachmentName", async (req, res) => {
  const { 
    subjectCode, 
    lessonIndex, 
    lessonName, 
    subtopicIndex, 
    subtopicTitle, 
    attachmentIndex, 
    attachmentName 
  } = req.params;

  try {
    // Initialize Supabase client
    const supabaseAnon = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Construct storage path (decode URI components if needed)
    const storagePath = `attachments/${subjectCode}/${decodeURIComponent(lessonName)}/${decodeURIComponent(subtopicTitle)}/${decodeURIComponent(attachmentName)}`;

    // 1. Delete from Supabase storage
    const { error: storageError } = await supabaseAnon.storage
      .from('learning-materials')
      .remove([storagePath]);

    if (storageError) throw storageError;

    // Convert indices to numbers
    const lessonIdx = parseInt(lessonIndex);
    const subtopicIdx = parseInt(subtopicIndex);
    const attachmentIdx = parseInt(attachmentIndex);

    // 2. Update Firestore
    const subjectRef = db.collection("learningMaterials").doc(subjectCode);
    const subjectDoc = await subjectRef.get();

    if (!subjectDoc.exists) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const subjectData = subjectDoc.data();
    const lessons = subjectData.lessons || [];

    if (!lessons[lessonIdx] || !lessons[lessonIdx].subtopics[subtopicIdx]) {
      return res.status(404).json({ error: "Lesson or subtopic not found" });
    }

    const attachments = lessons[lessonIdx].subtopics[subtopicIdx].attachments || [];
    if (!attachments[attachmentIdx]) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    // Remove the attachment from the array
    attachments.splice(attachmentIdx, 1);
    
    // Update Firestore
    await subjectRef.update({ 
      lessons: lessons 
    });

    res.status(200).json({ message: "Attachment deleted successfully" });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    res.status(500).json({ 
      error: "Failed to delete attachment",
      details: error.message 
    });
  }
});

// Endpoint for uploading temporary attachments
app.post("/api/uploadTempAttachment", uploadTemp.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // Generate unique filename
    const fileExt = path.extname(file.originalname);
    const fileName = `temp_${Date.now()}${fileExt}`;
    const filePath = `temp/${fileName}`;

    // Upload to Supabase storage
    const { error } = await supabase.storage
      .from('learning-materials')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('learning-materials')
      .getPublicUrl(filePath);

    res.status(200).json({
      name: file.originalname,
      url: urlData.publicUrl,
      path: filePath,
      size: file.size,
      type: file.mimetype
    });
  } catch (error) {
    console.error("Error uploading temporary file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// Endpoint for deleting temporary attachments
app.delete("/api/deleteTempAttachment", async (req, res) => {
  const { path } = req.body;
  if (!path) {
    return res.status(400).json({ error: "Path is required" });
  }

  try {
    // Delete from Supabase storage
    const { error } = await supabase.storage
      .from('learning-materials')
      .remove([path]);

    if (error) throw error;

    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Error deleting temporary file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// Add this function to server.js
const deleteAttachmentsFromStorage = async (attachments) => {
  try {
    if (!attachments || attachments.length === 0) return;
    
    const paths = attachments.map(attachment => attachment.path);
    const { error } = await supabase.storage
      .from('learning-materials')
      .remove(paths);
      
    if (error) throw error;
  } catch (error) {
    console.error("Error deleting attachments from storage:", error);
    throw error;
  }
};

const testSimilaritySearch = async (studentPrompt) => {
  try {
    // Generate embeddings for the student prompt
    const embeddingResponse = await cohere.embed({
      texts: [studentPrompt],
      model: "embed-english-v3.0",
      input_type: "search_query",
      embedding_types: ["float"],
    });

    const promptEmbeddings = embeddingResponse.embeddings.float[0];

    // Perform similarity search in Supabase
    const { data, error } = await supabase.rpc("match_responses", {
      query_embedding: promptEmbeddings,
      match_threshold: 0.7, // Adjust this threshold as needed
      match_count: 5, // Get top 5 similar responses
    });

    if (error) throw error;

    console.log("Similar responses (ordered by rating):", data);
    return data;
  } catch (error) {
    console.error("Error performing similarity search:", error);
    return null;
  }
};

//testSimilaritySearch("I want a code that prints hello world in java 10 times using for loop");

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});