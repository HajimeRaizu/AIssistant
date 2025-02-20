// api/chats.js
import { db, handleFirestoreError } from './firestore';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*"); // Allow all origins (or specify your frontend URL)
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  const { userId, chatId } = req.query;

  if (req.method === "GET") {
    // Get chats by userId
    if (userId) {
      try {
        const chatsSnapshot = await db.collection("chats")
          .where("userId", "==", userId)
          .orderBy("createdAt", "desc")
          .get();

        const userChats = chatsSnapshot.docs.map((doc) => doc.data());
        return res.status(200).json(userChats);
      } catch (error) {
        return handleFirestoreError(res, error);
      }
    }

    // Get chat history by chatId and userId
    if (chatId && userId) {
      try {
        const chatRef = db.collection("chats").doc(chatId);
        const chatDoc = await chatRef.get();

        if (!chatDoc.exists || chatDoc.data().userId !== userId) {
          return res.status(404).json({ error: "Chat not found" });
        }

        return res.status(200).json(chatDoc.data().messages || []);
      } catch (error) {
        return handleFirestoreError(res, error);
      }
    }

    // Get all chats
    try {
      const chatsSnapshot = await db.collection("chats").get();
      const chats = chatsSnapshot.docs.map((doc) => doc.data());
      return res.status(200).json(chats);
    } catch (error) {
      return handleFirestoreError(res, error);
    }
  }

  if (req.method === "POST") {
    // Create a new chat
    const { chatName, userId } = req.body;
    const newChatId = Date.now().toString();
    const createdAt = new Date().toISOString();

    try {
      await db.collection("chats").doc(newChatId).set({
        id: newChatId,
        messages: [],
        chatName,
        userId,
        createdAt,
      });
      return res.status(200).json({ id: newChatId, chatName, createdAt });
    } catch (error) {
      return handleFirestoreError(res, error);
    }
  }

  if (req.method === "DELETE") {
    // Delete a chat
    const { chatId, userId } = req.query;

    try {
      const chatRef = db.collection("chats").doc(chatId);
      const chatDoc = await chatRef.get();

      if (!chatDoc.exists || chatDoc.data().userId !== userId) {
        return res.status(404).json({ error: "Chat not found" });
      }

      await chatRef.delete();
      return res.status(200).json({ message: "Chat deleted successfully" });
    } catch (error) {
      return handleFirestoreError(res, error);
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}