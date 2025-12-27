
import { tool } from "ai";
import { z } from "zod";

export const recordUserFeedbackTool = tool({
  description: "Record user feedback, suggestions, or complaints. Use this AUTOMATICALLY when a user expresses an opinion about the system, asks for features, or complains.",
  inputSchema: z.object({
    userId: z.string(),
    feedbackType: z.enum(["BUG", "FEATURE_REQUEST", "COMPLAINT", "OTHER"]).describe("Category of the feedback"),
    content: z.string().describe("The actual feedback content from the user"),
  }),
  execute: async ({ userId, feedbackType, content }) => {
    // In a real production app, this would save to a 'Feedback' or 'SystemLog' table.
    // Since we don't have a migration for that yet, we log to server console
    // so it can be picked up by monitoring tools (e.g., Vercel Logs).
    
    const timestamp = new Date().toISOString();
    console.log(`[FEEDBACK_COLLECTOR] ${timestamp} | User: ${userId} | Type: ${feedbackType} | Content: ${content}`);
    
    return { 
        success: true, 
        message: "Thank you! Your feedback has been recorded and sent to our development team." 
    };
  },
});
