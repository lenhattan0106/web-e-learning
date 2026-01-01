import { prisma } from "@/lib/db";

/**
 * Generates a unique slug by appending a suffix if the base slug already exists
 * @param baseSlug - The initial slug generated from the course title
 * @param excludeId - Optional course ID to exclude from the check (for updates)
 * @returns A unique slug
 */
export async function generateUniqueSlug(
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  let uniqueSlug = baseSlug;
  let suffix = 1;

  while (true) {
    // Check if this slug exists (excluding the current course if editing)
    const existing = await prisma.khoaHoc.findUnique({
      where: { duongDan: uniqueSlug },
      select: { id: true },
    });

    // If no conflict, or the conflict is with the course we're editing, it's valid
    if (!existing || (excludeId && existing.id === excludeId)) {
      return uniqueSlug;
    }

    // Slug exists, try with suffix
    uniqueSlug = `${baseSlug}-${suffix}`;
    suffix++;

    // Safety check to prevent infinite loop (very unlikely)
    if (suffix > 1000) {
      // Add random string as fallback
      uniqueSlug = `${baseSlug}-${Date.now()}`;
      return uniqueSlug;
    }
  }
}

/**
 * Converts a string to a URL-friendly slug
 * @param text - The text to slugify
 * @returns A slugified string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD") // Normalize to decomposed form
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/đ/g, "d") // Vietnamese đ
    .replace(/Đ/g, "d") // Vietnamese Đ
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/-+/g, "-") // Replace multiple - with single -
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing -
}
