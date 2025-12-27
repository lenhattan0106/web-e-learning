
import { google } from "@ai-sdk/google";
import { generateText } from "ai";
import { config } from "dotenv";
import path from "path";

// Load env from root
config({ path: path.resolve(process.cwd(), ".env") });

async function testAI() {
  console.log("Testing Google AI Connection...");
  
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.error("❌ GOOGLE_GENERATIVE_AI_API_KEY is missing in process.env");
    return;
  }
  console.log("✅ API Key found (length: " + apiKey.length + ")");

  try {
    const result = await generateText({
      model: google("gemini-1.5-flash"),
      prompt: "Hello, are you working?",
    });
    console.log("✅ AI Response:", result.text);
  } catch (error) {
    console.error("❌ AI Generation failed:");
    console.error(error);
  }
}

testAI();
