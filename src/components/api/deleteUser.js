import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    const { userId } = req.query;

    try {
      await db.collection("students").doc(userId).delete();
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}