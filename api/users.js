// api/users.js
import { db, handleFirestoreError } from './firestore';

export default async function handler(req, res) {
  const { userId, instructorId } = req.query;

  if (req.method === "GET") {
    // Get all users
    if (!userId && !instructorId) {
      try {
        const usersSnapshot = await db.collection("students").get();
        const users = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          email: doc.data().email,
          name: doc.data().name,
          password: doc.data().password,
        }));
        return res.status(200).json(users);
      } catch (error) {
        return handleFirestoreError(res, error);
      }
    }

    // Get all instructors
    if (instructorId) {
      try {
        const instructorsSnapshot = await db.collection("instructors").get();
        const instructors = instructorsSnapshot.docs.map((doc) => ({
          id: doc.id,
          email: doc.data().email,
          name: doc.data().name,
          instructorId: doc.data().instructorId,
        }));
        return res.status(200).json(instructors);
      } catch (error) {
        return handleFirestoreError(res, error);
      }
    }
  }

  if (req.method === "POST") {
    // Add a single user
    const { name, email } = req.body;

    try {
      const studentsRef = db.collection("students");
      const newStudentRef = studentsRef.doc();
      const studentId = newStudentRef.id;
      const defaultPassword = "N3msuP4zzword";

      await newStudentRef.set({
        email: email,
        name: name,
        studentId: studentId,
        password: defaultPassword,
      });

      return res.status(200).json({ message: "User added successfully", studentId });
    } catch (error) {
      return handleFirestoreError(res, error);
    }
  }

  if (req.method === "PUT") {
    // Update user information
    const { name, email } = req.body;

    try {
      const userRef = db.collection("students").doc(userId);
      await userRef.update({ name, email });
      return res.status(200).json({ message: "User updated successfully" });
    } catch (error) {
      return handleFirestoreError(res, error);
    }
  }

  if (req.method === "DELETE") {
    // Delete a user
    try {
      await db.collection("students").doc(userId).delete();
      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      return handleFirestoreError(res, error);
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}