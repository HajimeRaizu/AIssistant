import { db, handleFirestoreError } from '../../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { studentId, password } = req.body;

    try {
      const usersSnapshot = await db.collection("students").where("studentId", "==", studentId).get();

      if (usersSnapshot.empty) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const userDoc = usersSnapshot.docs[0];
      const user = userDoc.data();

      if (user.password === password) {
        res.status(200).json({
          message: "Login successful",
          user: {
            id: userDoc.id,
            name: user.name,
            studentId: user.studentId,
          },
        });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}