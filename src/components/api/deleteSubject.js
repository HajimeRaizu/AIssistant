import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'DELETE') {
    const { subject } = req.query;
    const { instructorEmail } = req.query;
    const decodedSubject = decodeURIComponent(subject);

    try {
      const exercisesSnapshot = await db.collection("learningMaterials")
        .where("subjectName", "==", decodedSubject)
        .where("instructorEmail", "==", instructorEmail)
        .get();

      const batch = db.batch();

      exercisesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
      res.status(200).json({ message: "Subject deleted successfully" });
    } catch (error) {
      console.error("Error deleting subject:", error);
      res.status(500).json({ error: "Failed to delete subject" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}