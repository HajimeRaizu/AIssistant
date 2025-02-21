// api/learningMaterials.js
import { db, handleFirestoreError } from './firestore';

export default async function handler(req, res) {
  const { instructorEmail, subject, docId } = req.query;

  if (req.method === "GET") {
    // Get learning materials for the logged-in instructor
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
        const { subjectName, lesson, subtopicCode } = material;

        if (!acc[subjectName]) {
          acc[subjectName] = {};
        }

        if (!acc[subjectName][lesson]) {
          acc[subjectName][lesson] = {};
        }

        if (!acc[subjectName][lesson][subtopicCode]) {
          acc[subjectName][lesson][subtopicCode] = material;
        }

        return acc;
      }, {});

      return res.status(200).json(organizedLearningMaterials);
    } catch (error) {
      console.error("Error fetching learning materials:", error);
      return res.status(500).json({ error: "Failed to fetch learning materials" });
    }
  }

  if (req.method === "POST") {
    // Upload learning materials
    try {
      const workbook = XLSX.readFile(req.file.path);
      const sheet_name_list = workbook.SheetNames;
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);

      const batch = db.batch();
      const learningMaterialsRef = db.collection("learningMaterials");

      const { instructorEmail } = req.body;

      const instructorsRef = db.collection("instructors");
      const instructorQuery = await instructorsRef.where("email", "==", instructorEmail).get();

      if (instructorQuery.empty) {
        return res.status(404).json({ error: "Instructor not found" });
      }

      const instructorDoc = instructorQuery.docs[0];
      const instructorName = instructorDoc.data().name;

      const subjectId = generateUniqueId();

      data.forEach((row) => {
        const learningMaterialData = {
          subjectId,
          subjectName: row.subject,
          lesson: row.lesson,
          subtopicCode: row["subtopic code"],
          subtopicTitle: row["subtopic title"],
          content: row.content,
          images: row.Images || null,
          questions: row.questions || null,
          answers: row.answers || null,
          instructorEmail,
          instructorName,
        };

        const learningMaterialDocRef = learningMaterialsRef.doc(generateUniqueId());
        batch.set(learningMaterialDocRef, learningMaterialData);
      });

      await batch.commit();
      return res.status(200).json({ message: "Learning materials uploaded successfully", subjectId });
    } catch (error) {
      console.error("Error uploading learning materials:", error);
      return res.status(500).json({ error: "Failed to upload learning materials" });
    }
  }

  if (req.method === "PUT") {
    // Update an exercise
    const { content, questions, answers } = req.body;

    try {
      const exerciseRef = db.collection("learningMaterials").doc(docId);
      const exerciseDoc = await exerciseRef.get();

      if (!exerciseDoc.exists) {
        return res.status(404).json({ error: "Document not found" });
      }

      await exerciseRef.update({
        content,
        questions,
        answers,
      });

      return res.status(200).json({ message: "Exercise updated successfully" });
    } catch (error) {
      console.error("Error updating exercise:", error);
      return res.status(500).json({ error: "Failed to update exercise" });
    }
  }

  if (req.method === "DELETE") {
    // Delete a subject
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
      return res.status(200).json({ message: "Subject deleted successfully" });
    } catch (error) {
      console.error("Error deleting subject:", error);
      return res.status(500).json({ error: "Failed to delete subject" });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}