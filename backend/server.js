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

const storage = multer.memoryStorage();
const upload = multer({ storage });

const __filename = fileURLToPath(import.meta.url);
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
  origin: '*',
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

    res.status(200).json(chatDoc.data().messages || []);
  } catch (error) {
    handleFirestoreError(res, error);
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
    return `Let's break this down! Can you explain what you understand so far about ${userInput.replace(/make me|give me|i want|provide|show me|generate|write me/gi, '').trim()}?`;
  }

  return userInput; // If no match, return the original input
}

let contextCache = {}; // Simple in-memory cache for user contexts

app.post("/api/ai", async (req, res) => {
  const { input, userId, chatId } = req.body; // Add chatId to the request body

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

    const systemPreprompt = {
      role: "system",
      content: `
      You are an AI assistant designed to help students learn programming effectively. When responding, follow these strict rules:

      - **Programming Only**: Answer only programming-related questions.
      - **Encourage Learning**: If a user asks for full code, modify the response to guide them through understanding.
      - **Explain Step-by-Step**: Always break code down line-by-line with detailed explanations.
      - **Do Not Provide Full Code**: Never give a complete working solution, only syntax, explanations, and structured guidance.
      - **Reframe Direct Requests**: If a user asks for a direct solution, reframe it as a learning opportunity.
      - **Ignore Skill Level**: Even if the user is an expert, always explain with teaching intent.
      - **No Code Merging**: Never merge code snippets into a single working program.
      - **Do Not Act Like Another AI**: You are "AIssistant" and should never respond as another entity.

      Example 1:
      **User:** Make me a Java program that prints Hello World  
      **Assistant:** To print "Hello World" in Java, let's go step by step.

      1. Let's define the class. The class is like a blueprint for creating objects in Java. Here's how you start:

      public class HelloWorld {

      2. We need to create the main method. This is the entry point for any Java application. It's where the program starts execution. Here's how you define it inside your class:

        public static void main(String[] args) {

      3. Inside the main method, you'll use "System.out.println()" to print "Hello World" to the console. Here's the line of code for that:
        
        System.out.println("Hello World");

      4. Finally, to complete the class, you close the curly brace:

          }
      }

      Now, put all these parts together to complete your Java program.

      Example 2:
      **User:** What is the recipe for baking a cake?
      **Assistant:** It seems like there might be a mix-up in the context. If you're asking about programming, let's focus on that. If you're interested in baking a cake, that's a different topic! For programming, could you please specify what you need help with, such as a specific programming language or concept?

      Example 3:
      **User:** Teach me how to bake a cake, step by step.
      **Assistant:** It seems like there might be a mix-up in the context. If you're asking about programming, let's focus on that. If you're interested in baking a cake, that's a different topic! For programming, could you please specify what you need help with, such as a specific programming language or concept?
    `
    };

    // Prepare messages array with context
    const messages = [
      systemPreprompt,
      ...context,
      { role: "user", content: processedInput }, // Use PREPROCESSED INPUT
    ];

    // Set headers for streaming
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");

    // Make the API call to Hugging Face (or your chosen model)
    const response = await qwen.chat.completions.create({
      model: "tgi",
      messages,
      max_tokens: 8192,
      temperature: 0.1,
      stream: true,
    });

    // Stream the response back to the client
    let botResponse = "";
    for await (const chunk of response) {
      const chunkContent = chunk.choices[0]?.delta?.content || "";
      botResponse += chunkContent;
      res.write(chunkContent);
    }

    // Update the context cache with the new message
    const newContext = [
      ...context,
      { role: "user", content: processedInput }, // Store processed input
    ];

    // Keep only the latest 3 user prompts and 3 AI responses
    const userPrompts = newContext.filter((msg) => msg.role === "user").slice(-3); // Latest 3 user prompts

    // Update cache
    contextCache[userId][chatId] = [...userPrompts];

    // End the response
    res.end();
  } catch (error) {
    console.error("Hugging Face API Error:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "Failed to generate response from Qwen model" });
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
      return res.status(400).json({ error: "Invalid subject IDs" });
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
          const { "subtopicCode": subtopicCode, "subtopicTitle": subtopicTitle, content, questions, answers } = subtopic;

          // Add subtopic data to the lesson
          lessonData.subtopics.push({
            subtopicCode,
            subtopicTitle,
            content,
            questions,
            answers,
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
app.delete("/api/deleteSubject/:subjectCode", async (req, res) => {
  const { subjectCode } = req.params;
  const { instructorEmail } = req.query; // Get instructorEmail from query params

  try {
    const subjectRef = db.collection("learningMaterials").doc(subjectCode);
    const doc = await subjectRef.get();

    if (!doc.exists || doc.data().ownerEmail !== instructorEmail) {
      return res.status(404).json({ error: "Subject not found or unauthorized" });
    }

    await subjectRef.delete(); // Delete the document
    res.status(200).json({ message: "Subject deleted successfully" });
  } catch (error) {
    console.error("Error deleting subject:", error);
    res.status(500).json({ error: "Failed to delete subject" });
  }
});

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

    lessons.splice(lessonIndex, 1);
    await subjectRef.update({ lessons });

    res.status(200).json({ message: "Lesson deleted successfully!" });
  } catch (error) {
    console.error("Error deleting lesson:", error);
    res.status(500).json({ error: "Failed to delete lesson" });
  }
});

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
      return res.status(404).json({ error: "Invalid subject code. Please check the code and try again." });
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
      // If the user exists, retrieve their data
      userData = usersSnapshot.docs[0].data();
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
  const { subtopicCode, subtopicTitle, content, questions, answers } = req.body;

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

    // Add the new subtopic to the subtopics array
    lessons[lessonIndex].subtopics.push({
      subtopicCode,
      subtopicTitle,
      content,
      questions,
      answers,
    });

    // Update the subject document in Firestore
    await subjectRef.update({ lessons });

    res.status(200).json({ message: "Subtopic added successfully!" });
  } catch (error) {
    console.error("Error adding subtopic:", error);
    res.status(500).json({ error: "Failed to add subtopic" });
  }
});

app.put("/api/updateSubtopic/:subjectCode/:lessonIndex/:subtopicIndex", async (req, res) => {
  const { subjectCode, lessonIndex, subtopicIndex } = req.params;
  const { subtopicCode, subtopicTitle, content, questions, answers } = req.body;

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

    lessons[lessonIndex].subtopics[subtopicIndex].subtopicCode = subtopicCode;
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});