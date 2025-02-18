import admin from 'firebase-admin';
import { HfInference } from '@huggingface/inference';
import OpenAI from 'openai';

const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const apiToken = process.env.HUGGINGFACE_API_TOKEN;
const client = new HfInference(apiToken);

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

const handleFirestoreError = (res, error) => {
  console.error("Firestore Error:", error);
  res.status(500).json({ error: "Firestore operation failed" });
};

export { db, client, deepseek, handleFirestoreError };