import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'PUT') {
    const { userId } = req.query;
    const { name, email } = req.body;

    try {
      const userRef = db.collection("students").doc(userId);
      await userRef.update({ name, email });
      res.status(200).json({ message: "User updated successfully" });
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}