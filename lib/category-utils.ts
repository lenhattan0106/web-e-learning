import { prisma } from "@/lib/db";

/**
 * Helper function to get full category breadcrumb path
 * Returns string like "Kinh doanh / Marketing"
 */
export async function getCategoryBreadcrumb(categoryId: string): Promise<string> {
  const category = await prisma.danhMuc.findUnique({
    where: { id: categoryId },
    include: {
      danhMucCha: {
        select: {
          tenDanhMuc: true,
        },
      },
    },
  });

  if (!category) return "";

  if (category.danhMucCha) {
    return `${category.danhMucCha.tenDanhMuc} / ${category.tenDanhMuc}`;
  }

  return category.tenDanhMuc;
}

/**
 * Get category breadcrumb from nested structure (client-side)
 */
export function getCategoryBreadcrumbFromData(
  categoryId: string,
  categories: any[]
): string {
  for (const parent of categories) {
    if (parent.id === categoryId) {
      return parent.tenDanhMuc;
    }
    
    if (parent.danhMucCon) {
      const child = parent.danhMucCon.find((c: any) => c.id === categoryId);
      if (child) {
        return `${parent.tenDanhMuc} / ${child.tenDanhMuc}`;
      }
    }
  }
  
  return "";
}
