import { google } from "@ai-sdk/google";
import { embed } from "ai";

export async function generateEmbedding(value: string): Promise<number[]> {
  const input = value.replaceAll("\n", " ");
  
  const { embedding } = await embed({
    model: google.textEmbeddingModel("text-embedding-004"),
    value: input,
  });

  return embedding;
}
