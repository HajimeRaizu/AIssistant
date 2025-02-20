import { db, handleFirestoreError } from '../../lib/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get all instructors
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
  } else if (req.method === 'POST') {
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
      res.status(200).json({ message: "Instructor added successfully", instructorId });
    } catch (error) {
      console.error("Error adding instructor:", error);
      res.status(500).json({ error: "Failed to add instructor" });
    }
  } else if (req.method === 'PUT') {
    // Update instructor information
    const { instructorId } = req.query;
    const { name, email } = req.body;
    try {
      const instructorRef = db.collection("instructors").doc(instructorId);
      await instructorRef.update({ name, email });
      res.status(200).json({ message: "Instructor updated successfully" });
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}