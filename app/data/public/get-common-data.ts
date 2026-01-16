import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";

export const getCategoriesCached = unstable_cache(
  async () => {
    return prisma.danhMuc.findMany({
      orderBy: { tenDanhMuc: "asc" },
      where: { idDanhMucCha: null },
      include: {
        danhMucCon: {
          orderBy: { tenDanhMuc: "asc" },
          include: {
            danhMucCon: {
              orderBy: { tenDanhMuc: "asc" },
            },
          },
        },
      },
    });
  },
  ["categories-list"],
  {
    revalidate: 3600, // 1 hour
    tags: ["categories"],
  }
);

export const getLevelsCached = unstable_cache(
  async () => {
    return prisma.capDo.findMany({
      orderBy: { tenCapDo: "asc" },
    });
  },
  ["levels-list"],
  {
    revalidate: 3600, // 1 hour
    tags: ["levels"],
  }
);
