
import { google } from "@ai-sdk/google";
import { streamText, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { z } from "zod"; // Keep zod import if needed for inline schemas or tool types
import { searchCoursesTool } from "@/lib/ai/tools/search-courses";
import { getSystemStatsTool } from "@/lib/ai/tools/get-system-stats";
import { getMyProgressTool } from "@/lib/ai/tools/get-my-progress";
import { searchDiscountsTool } from "@/lib/ai/tools/search-discounts";

// Allow long-running requests
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    // 1. Mock Session/User ID (Replace with real auth in production)
    const userId = "user_id_test"; 

    // 2. Validate Env
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 });
    }

    // 3. Stream using Multi-step Agent
    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: `You are a smart and helpful AI Tutor for the "DATN_ELearning" platform.
Your goal is to help students learn effectively by answering questions about courses, lessons, and their progress.

## USER CONTEXT
- Current User ID: "${userId}"
- Only this user can check their own progress.

## SECURITY & ACCESS RULES
- If the user asks about "my progress" or "what courses I have", use the 'getMyProgress' tool and pass the userId "${userId}".
- If the user asks about "how many courses" or "system stats", use 'getSystemStats'.
- If the user asks for "coupons" or "discounts", use 'searchDiscounts'.
- If the user asks about specific course content, definitions, or "how to" topics, **ALWAYS** call 'searchCourses' first.

## RAG KNOWLEDGE BASE INSTRUCTIONS
- Use 'searchCourses' to find relevant lessons.
- Answer in **Vietnamese** (Tiếng Việt).
- If you find relevant lessons, Cite them clearly with links (e.g., "[Tên Bài Học](/courses/slug)").
- If the tool returns no results, politely define the concept using your general knowledge but mention that this specific content isn't in the database yet.
- If a user asks about a course you found via stats but explicit content is missing, explain that the course exists but detail is unavailable.

## TONE & STYLE
- Professional, encouraging, and concise.
- Use Markdown for bolding key terms and creating lists.
`,
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(3), // Increased steps for free queries
      tools: {
        searchCourses: searchCoursesTool,
        getSystemStats: getSystemStatsTool,
        getMyProgress: getMyProgressTool,
        searchDiscounts: searchDiscountsTool
      },
    });

    return result.toUIMessageStreamResponse();

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("🔥 Chat Route Error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
