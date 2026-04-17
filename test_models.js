// Use built-in fetch
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_google_gemini_api_key_here') {
     console.log("No valid API key present");
     return;
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.models) {
    console.log(data.models.map(m => m.name).join(', '));
  } else {
    console.log("Error fetching models", data);
  }
}
listModels();
