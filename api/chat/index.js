import { db, handleFirestoreError } from '../../lib/firestore';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Store chat messages
    const { chatId, messages, chatName, userId } = req.body;
    try {
      const chatRef = db.collection("chats").doc(chatId);
      const chatDoc = await chatRef.get();
      if (!chatDoc.exists) {
        return res.status(404).json({ error: "Chat not found" });
      }
      await chatRef.update({ messages });
      res.status(200).json({ message: "Chat stored successfully" });
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else if (req.method === 'GET') {
    // Get all chats or chats by userId
    const { userId } = req.query;
    try {
      let query = db.collection("chats");
      if (userId) {
        query = query.where("userId", "==", userId).orderBy("createdAt", "desc");
      }
      const chatsSnapshot = await query.get();
      const chats = chatsSnapshot.docs.map((doc) => doc.data());
      res.status(200).json(chats);
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}