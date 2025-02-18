import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { email } = req.query;

    try {
      const instructorRef = db.collection("instructors").where("email", "==", email);
      const snapshot = await instructorRef.get();

      if (snapshot.empty) {
        res.status(200).json({ exists: false });
      } else {
        res.status(200).json({ exists: true });
      }
    } catch (error) {
      console.error("Error checking instructor email:", error);
      res.status(500).json({ error: "Failed to check instructor email" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}