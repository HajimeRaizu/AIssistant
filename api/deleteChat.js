import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    const { chatId, userId } = req.query;

    try {
      const chatRef = db.collection("chats").doc(chatId);
      const chatDoc = await chatRef.get();

      if (!chatDoc.exists || chatDoc.data().userId !== userId) {
        return res.status(404).json({ error: "Chat not found" });
      }

      await chatRef.delete();
      res.status(200).json({ message: "Chat deleted successfully" });
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}