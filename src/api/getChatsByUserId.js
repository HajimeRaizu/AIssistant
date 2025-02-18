import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { userId } = req.query;

    try {
      const chatsSnapshot = await db.collection("chats")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .get();

      const userChats = chatsSnapshot.docs.map((doc) => doc.data());
      res.status(200).json(userChats);
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}