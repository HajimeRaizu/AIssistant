// api/upload.js
import { db, handleFirestoreError } from './firestore';
import multer from 'multer';
import XLSX from 'xlsx';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, __dirname);
  },
  filename: function (req, file, cb) {
    cb(null, "users.xlsx");
  },
});

const upload = multer({ storage: storage });

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === "POST") {
    upload.single("file")(req, res, async (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to upload file" });
      }

      try {
        const filePath = `${__dirname}/users.xlsx`;
        const workbook = XLSX.readFile(filePath);
        const sheet_name_list = workbook.SheetNames;
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);

        const batch = db.batch();

        // Use a query parameter to differentiate between students and instructors
        const { type } = req.query;

        if (type === "students") {
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
          return res.status(200).json({ message: "Students uploaded successfully" });
        } else if (type === "instructors") {
          const instructorsRef = db.collection("instructors");

          data.forEach((row) => {
            const newInstructorRef = instructorsRef.doc();
            const instructorId = newInstructorRef.id;

            batch.set(newInstructorRef, {
              email: row.email,
              name: row.name,
              instructorId: instructorId,
            });
          });

          await batch.commit();
          return res.status(200).json({ message: "Instructors uploaded successfully" });
        } else {
          return res.status(400).json({ error: "Invalid upload type" });
        }
      } catch (error) {
        console.error("Error uploading data:", error);
        return res.status(500).json({ error: "Failed to upload data" });
      }
    });
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}