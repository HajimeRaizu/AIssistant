import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'PUT') {
    const { docId } = req.query;
    const { content, questions, answers } = req.body;

    try {
      const exerciseRef = db.collection("learningMaterials").doc(docId);
      const exerciseDoc = await exerciseRef.get();

      if (!exerciseDoc.exists) {
        return res.status(404).json({ error: "Document not found" });
      }

      await exerciseRef.update({ content, questions, answers });
      res.status(200).json({ message: "Exercise updated successfully" });
    } catch (error) {
      console.error("Error updating exercise:", error);
      res.status(500).json({ error: "Failed to update exercise" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}