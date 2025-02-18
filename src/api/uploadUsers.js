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
        const filePath = req.file.path;
        const workbook = XLSX.readFile(filePath);
        const sheet_name_list = workbook.SheetNames;
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);

        const batch = db.batch();
        const studentsRef = db.collection("students");

        data.forEach((row) => {
          const newStudentRef = studentsRef.doc();
          const studentId = newStudentRef.id;
          const defaultPassword = "N3msuP4zzword";

          batch.set(newStudentRef, {
            email: row.email,
            name: row.name,
            studentId: studentId,
            password: defaultPassword,
          });
        });

        await batch.commit();
        res.status(200).json({ message: "Users uploaded successfully" });
      } catch (error) {
        console.error("Error uploading users:", error);
        res.status(500).json({ error: "Failed to upload users" });
      }
    });
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}