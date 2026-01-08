import { config } from 'dotenv';
config();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Manual body parsing for Vercel serverless compatibility
  let body = req.body;
  if (!body) {
    try {
      body = JSON.parse(await new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => data += chunk);
        req.on('end', () => resolve(data));
        req.on('error', reject);
      }));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }
  const { mood, text } = body || {};
  if (typeof mood !== 'string' || typeof text !== 'string' || !mood || !text) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const geminiRes = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `A user is feeling "${mood}". They wrote: "${text}". Respond empathetically and help them reflect.`
                }
              ]
            }
          ]
        })
      }
    );
    const data = await geminiRes.json();
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error('No response from AI');
    res.json({ text: aiText });
  } catch (err) {
    res.status(500).json({ error: 'AI service error' });
  }
}