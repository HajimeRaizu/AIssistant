import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const instructorsSnapshot = await db.collection("instructors").get();
      const instructors = instructorsSnapshot.docs.map((doc) => ({
        id: doc.id,
        email: doc.data().email,
        name: doc.data().name,
        instructorId: doc.data().instructorId,
      }));
      res.status(200).json(instructors);
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}