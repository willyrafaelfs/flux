require('dotenv').config({ path: '.env.local' });

async function diagnose() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY not found in .env.local");
    return;
  }

  console.log("🔍 Checking availability for API Key starting with:", apiKey.substring(0, 8) + "...");

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      console.error("❌ API Error:", JSON.stringify(data, null, 2));
      return;
    }

    console.log("✅ Connection Successful!");
    console.log("\nModels available for your key:");
    if (data.models) {
        data.models.forEach(m => {
            console.log(`- ${m.name}`);
        });
    } else {
        console.log("No models found. This usually means the API is enabled but no models are assigned to this tier/region.");
    }
  } catch (e) {
    console.error("❌ Network Error:", e.message);
  }
}

diagnose();
