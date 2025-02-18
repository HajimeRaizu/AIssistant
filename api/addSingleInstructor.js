import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { email, name } = req.body;

    try {
      const instructorsRef = db.collection("instructors");
      const newInstructorRef = instructorsRef.doc();
      const instructorId = newInstructorRef.id;

      await newInstructorRef.set({
        email: email,
        name: name,
        instructorId: instructorId,
      });

      res.status(200).json({ message: "Instructor added successfully", instructorId });
    } catch (error) {
      console.error("Error adding instructor:", error);
      res.status(500).json({ error: "Failed to add instructor" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}