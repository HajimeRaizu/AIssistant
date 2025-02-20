import { db, handleFirestoreError } from '../../lib/firestore';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Get all users
    try {
      const usersSnapshot = await db.collection("students").get();
      const users = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        email: doc.data().email,
        name: doc.data().name,
        password: doc.data().password,
      }));
      res.status(200).json(users);
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else if (req.method === 'POST') {
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
      res.status(200).json({ message: "User added successfully", studentId });
    } catch (error) {
      console.error("Error adding user:", error);
      res.status(500).json({ error: "Failed to add user" });
    }
  } else if (req.method === 'PUT') {
    // Update user information
    const { userId } = req.query;
    const { name, email } = req.body;
    try {
      const userRef = db.collection("students").doc(userId);
      await userRef.update({ name, email });
      res.status(200).json({ message: "User updated successfully" });
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else if (req.method === 'DELETE') {
    // Delete a user
    const { userId } = req.query;
    try {
      await db.collection("students").doc(userId).delete();
      res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}