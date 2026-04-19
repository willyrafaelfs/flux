const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in .env.local");
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const result = await genAI.listModels();
    
    console.log("✅ Successfully connected to Gemini API!");
    console.log("\nAvailable Models:");
    result.models.forEach(model => {
      console.log(`- ${model.name} (${model.displayName})`);
      console.log(`  Methods: ${model.supportedGenerationMethods.join(", ")}`);
    });
  } catch (error) {
    console.error("❌ Error listing models:", error.message);
    if (error.message.includes("API key expired")) {
        console.error("👉 Your API key is expired. Please generate a new one at https://aistudio.google.com/");
    }
  }
}

listModels();
