import { db, handleFirestoreError } from '../lib/firebase';
import XLSX from 'xlsx';
import multer from 'multer';

const upload = multer({ dest: '/tmp/' });

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to upload file" });
      }

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
        res.status(200).json({ message: "Learning materials uploaded successfully", subjectId });
      } catch (error) {
        console.error("Error uploading learning materials:", error);
        res.status(500).json({ error: "Failed to upload learning materials" });
      }
    });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}

function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}