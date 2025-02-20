// api/accessLearningMaterials.js
import { db, handleFirestoreError } from './firestore';

export default async function handler(req, res) {
  const { studentId, subjectId } = req.query;

  if (req.method === "GET") {
    // Get access learning materials
    try {
      const accessRef = db.collection("accessLearningMaterials").doc(studentId);
      const accessDoc = await accessRef.get();

      if (!accessDoc.exists) {
        return res.status(200).json({ subjectIds: [] });
      }

      return res.status(200).json(accessDoc.data());
    } catch (error) {
      console.error("Error fetching access learning materials:", error);
      return res.status(500).json({ error: "Failed to fetch access learning materials" });
    }
  }

  if (req.method === "POST") {
    // Add access learning material
    try {
      const accessRef = db.collection("accessLearningMaterials").doc(studentId);
      const accessDoc = await accessRef.get();

      if (!accessDoc.exists) {
        await accessRef.set({
          studentId,
          subjectIds: [subjectId],
        });
      } else {
        const existingIds = accessDoc.data().subjectIds || [];
        if (!existingIds.includes(subjectId)) {
          existingIds.push(subjectId);
          await accessRef.update({ subjectIds: existingIds });
        }
      }

      return res.status(200).json({ message: "Subject ID added successfully" });
    } catch (error) {
      console.error("Error adding subject ID:", error);
      return res.status(500).json({ error: "Failed to add subject ID" });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}