import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      const universityInfoRef = db.collection("universityInfo").doc("Tandag");
      const universityInfoDoc = await universityInfoRef.get();

      if (!universityInfoDoc.exists) {
        await universityInfoRef.set({ branch: "Tandag", info: "Default university info" });
        return res.status(200).json({ branch: "Tandag", info: "Default university info" });
      }

      res.status(200).json(universityInfoDoc.data());
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}