import { db, handleFirestoreError } from '../../lib/firestore';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Add access to learning material
    const { studentId, subjectId } = req.body;
    try {
      const accessRef = db.collection("accessLearningMaterials").doc(studentId);
      const accessDoc = await accessRef.get();
      if (!accessDoc.exists) {
        await accessRef.set({ studentId, subjectIds: [subjectId] });
      } else {
        const existingIds = accessDoc.data().subjectIds || [];
        if (!existingIds.includes(subjectId)) {
          existingIds.push(subjectId);
          await accessRef.update({ subjectIds: existingIds });
        }
      }
      res.status(200).json({ message: "Subject ID added successfully" });
    } catch (error) {
      console.error("Error adding subject ID:", error);
      res.status(500).json({ error: "Failed to add subject ID" });
    }
  } else if (req.method === 'GET') {
    // Get access learning materials
    const { studentId } = req.query;
    try {
      const accessRef = db.collection("accessLearningMaterials").doc(studentId);
      const accessDoc = await accessRef.get();
      if (!accessDoc.exists) {
        return res.status(200).json({ subjectIds: [] });
      }
      res.status(200).json(accessDoc.data());
    } catch (error) {
      console.error("Error fetching access learning materials:", error);
      res.status(500).json({ error: "Failed to fetch access learning materials" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}