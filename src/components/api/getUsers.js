import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const usersSnapshot = await db.collection("students").get();
      const users = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        email: doc.data().email,
        name: doc.data().name,
        password: doc.data().password,
      }));
      res.status(200).json(users);
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}