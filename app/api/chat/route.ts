
import { google } from "@ai-sdk/google";
import { streamText, UIMessage, convertToModelMessages, stepCountIs } from 'ai';
import { z } from "zod"; 
import { headers } from "next/headers";
import { auth } from "@/lib/auth"; // Real Better-Auth instance
import { generateSystemPrompt } from "@/lib/ai/prompts";

import { searchCoursesTool } from "@/lib/ai/tools/search-courses";
import { getSystemStatsTool } from "@/lib/ai/tools/get-system-stats";
import { getMyProgressTool } from "@/lib/ai/tools/get-my-progress";
import { searchDiscountsTool } from "@/lib/ai/tools/search-discounts";
import { getInstructorStatsTool } from "@/lib/ai/tools/get-instructor-stats";
import { getMyCoursesTool } from "@/lib/ai/tools/get-my-courses";
import { getCourseStructureTool } from "@/lib/ai/tools/get-course-structure";
import { getDetailedInstructorDataTool } from "@/lib/ai/tools/get-detailed-instructor-data";
import { getRevenueAnalyticsTool } from "@/lib/ai/tools/get-revenue-analytics";
import { getStudentProgressTool } from "@/lib/ai/tools/get-student-progress";
import { recordUserFeedbackTool } from "@/lib/ai/tools/record-user-feedback";
import { getTeacherDashboardTool } from "@/lib/ai/tools/get-teacher-dashboard"; // Consolidated Tool

// Allow long-running requests
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    // 1. Get Real Session
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id || "guest";
    // Normalize role: "teacher" -> "TEACHER", "admin" -> "ADMIN", "user" -> "STUDENT", null -> "GUEST"
    let userRole = "GUEST";
    if (session?.user?.role === "teacher") userRole = "TEACHER";
    else if (session?.user?.role === "admin") userRole = "ADMIN"; // Admin often has Teacher privs + more
    else if (session?.user) userRole = "STUDENT";

    // 2. Validate Env
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 });
    }

    // 3. Stream using Multi-step Agent
    const result = streamText({
      model: google("gemini-2.5-flash"), // Switching to clean model
      system: generateSystemPrompt(userId, userRole),
      messages: await convertToModelMessages(messages),
      stopWhen: stepCountIs(2), // Limit to 2 steps (Optimization for Free Tier)
      tools: {
        searchCourses: searchCoursesTool,
        getSystemStats: getSystemStatsTool,
        getMyProgress: getMyProgressTool,
        searchDiscounts: searchDiscountsTool,
        getInstructorStats: getInstructorStatsTool,
        getMyCourses: getMyCoursesTool,
        getCourseStructure: getCourseStructureTool,
        // Production Tools
        getDetailedInstructorData: getDetailedInstructorDataTool,
        getRevenueAnalytics: getRevenueAnalyticsTool,
        getTeacherDashboard: getTeacherDashboardTool, // New Super Tool
        getStudentProgress: getStudentProgressTool,
        recordUserFeedback: recordUserFeedbackTool
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
