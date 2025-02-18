import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const chatsSnapshot = await db.collection("chats").get();
      const chats = chatsSnapshot.docs.map((doc) => doc.data());
      res.status(200).json(chats);
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}