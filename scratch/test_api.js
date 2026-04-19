const fs = require('fs');

async function testApi() {
  const formData = new FormData();
  // Create a dummy text file to act as the image just to see what the API returns.
  // The API relies on generating content from the image, so this might fail at generation but we'll see the exact error.
  const blob = new Blob(["dummy image data"], { type: "image/jpeg" });
  formData.append("file", blob, "dummy.jpg");

  try {
    const response = await fetch('http://localhost:3000/api/gemini', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Fetch failed:", error.message);
  }
}

testApi();
