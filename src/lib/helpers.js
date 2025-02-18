// lib/helpers.js
const handleFirestoreError = (res, error) => {
    console.error("Firestore Error:", error);
    res.status(500).json({ error: "Firestore operation failed" });
  };
  
  const generateUniqueId = () => {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  };
  
  module.exports = { handleFirestoreError, generateUniqueId };