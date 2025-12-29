
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaultDanhMucs = [
  { name: "Lập trình", children: ["Back-end", "Front-end", "Mobile", "DevOps"] },
  { name: "Kinh doanh", children: ["Marketing", "Sale", "Quản trị"] },
  { name: "Thiết kế", children: ["UI/UX", "Graphic Design"] },
  { name: "Ngoại ngữ", children: ["Tiếng Anh", "Tiếng Nhật"] },
];

const defaultCapDos = [
  { name: "Người mới", code: "NGUOI_MOI" }, // Maps to NguoiMoi
  { name: "Trung cấp", code: "TRUNG_CAP" }, // Maps to TrungCap
  { name: "Nâng cao", code: "NANG_CAO" },   // Maps to NangCao
];

const defaultTrangThais = [
  { name: "Bản nháp", code: "BanNhap" },           // Maps to BanNhap
  { name: "Đã xuất bản", code: "BanChinhThuc" },    // Maps to BanChinhThuc
  { name: "Lưu trữ", code: "BanLuuTru" },         // Maps to BanLuuTru
];

function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

async function main() {
  console.log("🚀 Bắt đầu quá trình seed dữ liệu tiếng Việt...");

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Seed Cấp Độ
      console.log("📦 Seeding Cấp độ...");
      const capDoMap = new Map<string, string>(); // code -> id
      
      for (const item of defaultCapDos) {
        let capDo = await tx.capDo.findUnique({
          where: { maCapDo: item.code }
        });

        if (!capDo) {
          capDo = await tx.capDo.create({
            data: {
              tenCapDo: item.name,
              maCapDo: item.code
            }
          });
          console.log(`  + Đã tạo cấp độ: ${item.name}`);
        }
        capDoMap.set(item.code, capDo.id);
      }

      // 2. Seed Trạng Thái
      console.log("📦 Seeding Trạng thái...");
      const trangThaiMap = new Map<string, string>(); // code -> id

      for (const item of defaultTrangThais) {
        let tt = await tx.trangThaiKhoaHoc.findUnique({
          where: { maTrangThai: item.code }
        });

        if (!tt) {
          tt = await tx.trangThaiKhoaHoc.create({
            data: {
              tenTrangThai: item.name,
              maTrangThai: item.code
            }
          });
          console.log(`  + Đã tạo trạng thái: ${item.name}`);
        }
        trangThaiMap.set(item.code, tt.id);
      }

      // 3. Seed Danh Mục (Có đệ quy cha-con)
      console.log("📦 Seeding Danh mục...");
      const danhMucMap = new Map<string, string>(); // name -> id (for migration lookup)

      for (const parent of defaultDanhMucs) {
        const parentSlug = slugify(parent.name);
        
        // Tạo hoặc lấy cha
        let parentCat = await tx.danhMuc.findUnique({ where: { duongDan: parentSlug } });
        if (!parentCat) {
          parentCat = await tx.danhMuc.create({
            data: {
              tenDanhMuc: parent.name,
              duongDan: parentSlug,
            }
          });
          console.log(`  + Đã tạo danh mục cha: ${parent.name}`);
        }
        danhMucMap.set(parent.name, parentCat.id);

        // Tạo các con
        if (parent.children) {
          for (const childName of parent.children) {
            const childSlug = slugify(childName);
            let childCat = await tx.danhMuc.findUnique({ where: { duongDan: childSlug } });
            
            if (!childCat) {
              childCat = await tx.danhMuc.create({
                data: {
                  tenDanhMuc: childName,
                  duongDan: childSlug,
                  idDanhMucCha: parentCat.id
                }
              });
              console.log(`    - Đã tạo danh mục con: ${childName}`);
            }
            danhMucMap.set(childName, childCat.id);
          }
        }
      }

      // 4. Migrate Dữ liệu Khóa học Hiện tại
      console.log("🔄 Đang chuyển đổi (migrate) dữ liệu khóa học cũ...");
      const courses = await tx.khoaHoc.findMany();
      let migratedCount = 0;

      for (const course of courses) {
        const updateData: any = {};

        // === Cấp Độ ===
        // Map old Enum to new ID
        if (course.capDo === "NguoiMoi") updateData.idCapDo = capDoMap.get("NGUOI_MOI");
        else if (course.capDo === "TrungCap") updateData.idCapDo = capDoMap.get("TRUNG_CAP");
        else if (course.capDo === "NangCao") updateData.idCapDo = capDoMap.get("NANG_CAO");

        // === Trạng Thái ===
        // Map old Enum to new ID
        if (course.trangThai === "BanNhap") updateData.idTrangThai = trangThaiMap.get("BanNhap");
        else if (course.trangThai === "BanChinhThuc") updateData.idTrangThai = trangThaiMap.get("BanChinhThuc");
        else if (course.trangThai === "BanLuuTru") updateData.idTrangThai = trangThaiMap.get("BanLuuTru");

        // === Danh Mục ===
        // Map string string to ID. If not found, create new root category
        if (course.danhMuc) {
            let catId = danhMucMap.get(course.danhMuc);
            if (!catId) {
                // Thử tìm trong DB lần nữa (phòng khi seed ở trên chưa cover hết)
                const slug = slugify(course.danhMuc);
                const existing = await tx.danhMuc.findUnique({ where: { duongDan: slug }});
                if (existing) {
                    catId = existing.id;
                } else {
                     // Tạo mới danh mục gốc
                    const newCat = await tx.danhMuc.create({
                        data: {
                            tenDanhMuc: course.danhMuc,
                            duongDan: slug
                        }
                    });
                    catId = newCat.id;
                    console.log(`  ! Đã tạo danh mục mới từ dữ liệu cũ: ${course.danhMuc}`);
                }
            }
            updateData.idDanhMuc = catId;
        }

        if (Object.keys(updateData).length > 0) {
          await tx.khoaHoc.update({
            where: { id: course.id },
            data: updateData
          });
          migratedCount++;
        }
      }

      console.log(`✅ Đã migrate thành công ${migratedCount} khóa học.`);

    }, {
      maxWait: 10000,
      timeout: 20000
    });

    console.log("🎉 Hoàn tất quá trình seed và migrate.");
  } catch (error) {
    console.error("❌ Lỗi xảy ra:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
