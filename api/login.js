import admin from "firebase-admin";
const type= process.env.FIREBASE_TYPE;
const project_id= process.env.FIREBASE_PROJECT_ID;
const private_key_id= process.env.FIREBASE_PRIVATE_KEY_ID;
const private_key= process.env.FIREBASE_PRIVATE_KEY;
const client_email= process.env.FIREBASE_CLIENT_EMAIL;
const client_id= process.env.FIREBASE_CLIENT_ID;
const auth_uri= process.env.FIREBASE_AUTH_URI;
const token_uri= process.env.FIREBASE_TOKEN_URI;
const auth_provider_x509_cert_url= process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL;
const client_x509_cert_url= process.env.FIREBASE_CLIENT_X509_CERT_URL;
const universe_domain= process.env.FIREBASE_UNIVERSE_DOMAIN;
// Ensure Firebase Admin is only initialized once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      "type": type,
      "project_id": project_id,
      "private_key_id": private_key_id,
      "private_key": private_key,
      "client_email": client_email,
      "client_id": client_id,
      "auth_uri": auth_uri,
      "token_uri": token_uri,
      "auth_provider_x509_cert_url": auth_provider_x509_cert_url,
      "client_x509_cert_url": client_x509_cert_url,
      "universe_domain": universe_domain
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  // Allow only POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { studentId, password } = req.body;

    // Query Firestore for studentId
    const usersSnapshot = await db.collection("students").where("studentId", "==", studentId).get();

    if (usersSnapshot.empty) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Get user data
    const userDoc = usersSnapshot.docs[0];
    const user = userDoc.data();

    // Validate password
    if (user.password === password) {
      return res.status(200).json({
        message: "Login successful",
        user: {
          id: userDoc.id,
          name: user.name,
          studentId: user.studentId,
        },
      });
    } else {
      return res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error", details: error.message });
  }
}
