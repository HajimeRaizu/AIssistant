// api/instructors.js
import { db, handleFirestoreError } from './firestore';

export default async function handler(req, res) {
  const { email, instructorId } = req.query;

  if (req.method === "GET") {
    // Check instructor email
    if (email) {
      try {
        const instructorRef = db.collection("instructors").where("email", "==", email);
        const snapshot = await instructorRef.get();

        if (snapshot.empty) {
          return res.status(200).json({ exists: false });
        } else {
          return res.status(200).json({ exists: true });
        }
      } catch (error) {
        console.error("Error checking instructor email:", error);
        return res.status(500).json({ error: "Failed to check instructor email" });
      }
    }

    // Get all instructors
    try {
      const instructorsSnapshot = await db.collection("instructors").get();
      const instructors = instructorsSnapshot.docs.map((doc) => ({
        id: doc.id,
        email: doc.data().email,
        name: doc.data().name,
        instructorId: doc.data().instructorId,
      }));
      return res.status(200).json(instructors);
    } catch (error) {
      return handleFirestoreError(res, error);
    }
  }

  if (req.method === "POST") {
    // Add a single instructor
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

      return res.status(200).json({ message: "Instructor added successfully", instructorId });
    } catch (error) {
      console.error("Error adding instructor:", error);
      return res.status(500).json({ error: "Failed to add instructor" });
    }
  }

  if (req.method === "PUT") {
    // Update instructor information
    const { name, email } = req.body;

    try {
      const instructorRef = db.collection("instructors").doc(instructorId);
      await instructorRef.update({ name, email });
      return res.status(200).json({ message: "Instructor updated successfully" });
    } catch (error) {
      return handleFirestoreError(res, error);
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}