import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'POST') {
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
      res.status(200).json({ id: newChatId, chatName, createdAt });
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}