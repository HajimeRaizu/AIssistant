import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const instructorEmail = req.query.instructorEmail;

    try {
      let query = db.collection("learningMaterials");
      if (instructorEmail) {
        query = query.where("instructorEmail", "==", instructorEmail);
      }

      const exercisesSnapshot = await query.get();
      const exercises = exercisesSnapshot.docs.map((doc) => ({
        docId: doc.id,
        ...doc.data(),
      }));

      const organizedLearningMaterials = exercises.reduce((acc, material) => {
        const { subjectName, subtopicCode } = material;

        if (!acc[subjectName]) {
          acc[subjectName] = {};
        }

        if (!acc[subjectName][subtopicCode]) {
          acc[subjectName][subtopicCode] = material;
        }

        return acc;
      }, {});

      res.status(200).json(organizedLearningMaterials);
    } catch (error) {
      console.error("Error fetching learning materials:", error);
      res.status(500).json({ error: "Failed to fetch learning materials" });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}