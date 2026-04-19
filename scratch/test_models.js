const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const testModel = async (m) => {
  try {
    const model = genAI.getGenerativeModel({ model: m });
    await model.generateContent('Hi');
    console.log(`Success with: ${m}`);
  } catch(e) {
    console.log(`Failed with ${m}: ${e.message.split('\n')[0]}`);
  }
};

(async () => {
  await testModel('gemini-2.0-flash-lite');
  await testModel('gemini-1.5-pro');
  await testModel('gemini-pro-latest');
})();
