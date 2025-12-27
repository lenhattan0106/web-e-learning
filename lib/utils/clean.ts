import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function cleanText(html: string | null | undefined): string {
  if (!html) return "";
  
  // Strip HTML tags using regex
  const text = html.replace(/<[^>]*>/g, " ");
  
  // Normalize whitespace (remove excessive spaces, newlines, tabs)
  return text.replace(/\s+/g, " ").trim();
}
