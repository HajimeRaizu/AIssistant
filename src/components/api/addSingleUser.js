import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { name, email } = req.body;

    try {
      const studentsRef = db.collection("students");
      const newStudentRef = studentsRef.doc();
      const studentId = newStudentRef.id;
      const defaultPassword = "N3msuP4zzword";

      await newStudentRef.set({
        email: email,
        name: name,
        studentId: studentId,
        password: defaultPassword,
      });

      res.status(200).json({ message: "User added successfully", studentId });
    } catch (error) {
      console.error("Error adding user:", error);
      res.status(500).json({ error: "Failed to add user" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}