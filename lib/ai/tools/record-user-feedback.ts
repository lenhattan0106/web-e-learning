
import { tool } from "ai";
import { z } from "zod";

export const recordUserFeedbackTool = tool({
  description: "Ghi nhận phản hồi, góp ý hoặc khiếu nại của người dùng. SỬ DỤNG TỰ ĐỘNG khi user bày tỏ ý kiến về hệ thống, yêu cầu tính năng, hoặc phàn nàn.",
  inputSchema: z.object({
    userId: z.string().describe("ID người dùng (lấy từ system context)"),
    feedbackType: z.enum(["BUG", "FEATURE_REQUEST", "COMPLAINT", "OTHER"]).describe("Loại phản hồi: BUG, FEATURE_REQUEST, COMPLAINT, OTHER"),
    content: z.string().describe("Nội dung phản hồi của người dùng"),
  }),
  execute: async ({ userId, feedbackType, content }) => {
    const timestamp = new Date().toISOString();
    console.log(`[FEEDBACK_COLLECTOR] ${timestamp} | User: ${userId} | Type: ${feedbackType} | Content: ${content}`);
    
    return { 
        success: true, 
        message: "Cảm ơn bạn! Phản hồi của bạn đã được ghi nhận và gửi đến đội ngũ phát triển." 
    };
  },
});
