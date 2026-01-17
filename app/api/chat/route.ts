import { google } from "@ai-sdk/google";
import { streamText, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateSystemPrompt } from "@/lib/ai/prompts";
import { getToolsForRole, getToolNamesForRole } from "@/lib/ai/tool-registry";

// Allow long-running requests
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    // 1. Get Real Session
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    
    const userId = session?.user?.id;
    const userName = session?.user?.name || undefined;
    let userRole = "USER"; // Default role
    if (session?.user?.role === "teacher") userRole = "TEACHER";
    else if (session?.user?.role === "admin") userRole = "ADMIN";

    // Phải có userId hợp lệ
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Vui lòng đăng nhập để sử dụng Chat AI." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Fetch isPremium từ Database (không dùng session vì có thể bị cache)
    let isPremium = false;
    if (userRole !== "ADMIN") {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isPremium: true, premiumExpires: true }
      });
      
      const now = new Date();
      isPremium = Boolean(user?.isPremium && user?.premiumExpires && user.premiumExpires > now);
    } else {
      // Admin bypass Premium check
      isPremium = true;
    }


    // Chốt chặn: ADMIN được bypass, còn lại phải là Premium
    if (userRole !== "ADMIN" && !isPremium) {
      return new Response(
        JSON.stringify({
          error: "Tính năng Chat AI chỉ dành cho thành viên Premium.",
          code: "PREMIUM_REQUIRED"
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Validate Env
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 });
    }

    const lastMessage = messages[messages.length - 1];
    const text = (lastMessage as any).content || '';

    // GUARD: Math Detection
    // Detects: 5+5, 10/2, sqrt(2), sin(30)...
    const hasMath = 
      /(^|[\s(])\d+(\.\d+)?\s*[\+\-\*\/]\s*\d+(\.\d+)?([\s)]|$)/.test(text) ||
      /(sqrt|căn|log|sin|cos|tan)\s*\(?\s*\d+/i.test(text);

    // Detects explicit course intent
    const hasCourseIntent = 
      /(khóa học|tìm khóa|gợi ý khóa|danh sách khóa|lộ trình|nên học|course|học gì|bài giảng)/i.test(text);

    
    if (hasMath && !hasCourseIntent) {
      
    }


    // 4. Dynamic Tool Selection by Role (Security + Performance)
    const tools = getToolsForRole(userRole);

    console.log(`🤖 AI Chat | User: ${userName} | Role: ${userRole} | Premium: ${isPremium} | Tools: [${getToolNamesForRole(userRole).join(', ')}]`);

    // 4. Stream using Multi-step Agent with Gemini 2.5 Flash Optimizations
    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: generateSystemPrompt(userId, userRole, userName),
      messages: await convertToModelMessages(messages),
      providerOptions: {
        google: {
          thinkingBudget: 4096, // Tier 1: Cho phép AI reasoning sâu hơn
        },
      },
      
      stopWhen: stepCountIs(2), // Giữ giới hạn 2 steps
      
      // 🔥 Dynamic Tool Selection (không hardcode)
      // 🔥 Dynamic Tool Selection (không hardcode)
      tools,
      toolChoice: (hasMath && !hasCourseIntent) ? "none" : "auto",
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
