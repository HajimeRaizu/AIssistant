export default async function handler(req, res) {
  console.log('Received request:', req.method);
  
  if (req.method === 'POST') {
    const { studentId, password } = req.body;
    console.log('studentId:', studentId); // Log incoming data

    try {
      const usersSnapshot = await db.collection("students").where("studentId", "==", studentId).get();
      console.log('Fetched users snapshot:', usersSnapshot);

      if (usersSnapshot.empty) {
        console.log('No user found with this studentId');
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const userDoc = usersSnapshot.docs[0];
      const user = userDoc.data();

      if (user.password === password) {
        console.log('Login successful');
        res.status(200).json({
          message: "Login successful",
          user: {
            id: userDoc.id,
            name: user.name,
            studentId: user.studentId,
          },
        });
      } else {
        console.log('Password mismatch');
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      console.error('Error during database query:', error);
      res.status(500).json({ error: "Internal server error" });
    }
  } else {
    console.log('Invalid HTTP method');
    res.status(405).json({ error: "Method not allowed" });
  }
}
