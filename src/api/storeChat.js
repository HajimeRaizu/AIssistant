import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'POST') {
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
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}