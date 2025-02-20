// api/universityInfo.js
import { db, handleFirestoreError } from './firestore';

export default async function handler(req, res) {
  if (req.method === "GET") {
    // Get university info
    try {
      const universityInfoRef = db.collection("universityInfo").doc("Tandag");
      const universityInfoDoc = await universityInfoRef.get();

      if (!universityInfoDoc.exists) {
        await universityInfoRef.set({ branch: "Tandag", info: "Default university info" });
        return res.status(200).json({ branch: "Tandag", info: "Default university info" });
      }

      return res.status(200).json(universityInfoDoc.data());
    } catch (error) {
      return handleFirestoreError(res, error);
    }
  }

  if (req.method === "PUT") {
    // Update university info
    const { info } = req.body;

    try {
      const universityInfoRef = db.collection("universityInfo").doc("Tandag");
      const universityInfoDoc = await universityInfoRef.get();

      if (!universityInfoDoc.exists) {
        await universityInfoRef.set({ branch: "Tandag", info });
        return res.status(200).json({ message: "University info created successfully" });
      }

      await universityInfoRef.update({ info });
      return res.status(200).json({ message: "University info updated successfully" });
    } catch (error) {
      return handleFirestoreError(res, error);
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}