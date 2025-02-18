export default async function handler(req, res) {
  console.log('Request method:', req.method); // Add this for debugging
  if (req.method === 'POST') {
    // Your original code here...
  } else {
    return res.status(405).json({ error: "Method not allowed" });
  }
}
