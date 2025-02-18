import { db, handleFirestoreError } from '../lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'PUT') {
    const { info } = req.body;

    try {
      const universityInfoRef = db.collection("universityInfo").doc("Tandag");
      const universityInfoDoc = await universityInfoRef.get();

      if (!universityInfoDoc.exists) {
        await universityInfoRef.set({ branch: "Tandag", info });
        return res.status(200).json({ message: "University info created successfully" });
      }

      await universityInfoRef.update({ info });
      res.status(200).json({ message: "University info updated successfully" });
    } catch (error) {
      handleFirestoreError(res, error);
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}