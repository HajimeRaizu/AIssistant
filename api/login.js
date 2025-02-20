// api/login.js
import { db, handleFirestoreError } from '../lib/firestore';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { studentId, password } = req.body;

    const usersSnapshot = await db.collection("students").where("studentId", "==", studentId).get();

    if (usersSnapshot.empty) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const userDoc = usersSnapshot.docs[0];
    const user = userDoc.data();

    if (user.password === password) {
      return res.status(200).json({
        message: "Login successful",
        user: {
          id: userDoc.id,
          name: user.name,
          studentId: user.studentId,
        },
      });
    } else {
      return res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}