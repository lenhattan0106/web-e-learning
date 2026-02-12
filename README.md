# DATN E-Learning Platform

Dự án Đồ án Tốt nghiệp E-Learning Platform, xây dựng bằng Next.js 15, Prisma, TailwindCSS và các công nghệ hiện đại khác.

## 📦 Yêu cầu

- [Node.js](https://nodejs.org/) (Phiên bản 18.x trở lên)
- [pnpm](https://pnpm.io/) (Khuyến nghị sử dụng pnpm để quản lý gói nhanh và hiệu quả)

## 🚀 Hướng dẫn Cài đặt & Chạy (Dành cho Giảng viên/Reviewer)

Dự án này đã được tối ưu hóa dung lượng bằng cách loại bỏ `node_modules` và `.next`. Vui lòng làm theo các bước sau để khôi phục và chạy dự án:

### 1. Cài đặt thư viện

Mở terminal tại thư mục gốc của dự án và chạy lệnh:

```bash
pnpm install
```

> **Lưu ý:** Lệnh này sẽ tự động tải tất cả các thư viện cần thiết dựa trên file `pnpm-lock.yaml` và chạy `prisma generate` để khởi tạo client cơ sở dữ liệu.

### 2. Cấu hình Môi trường

Dự án cần các biến môi trường để hoạt động. File `.env.example` đã được cung cấp làm mẫu.
Vui lòng tạo file `.env` và điền các giá trị tương ứng (nếu có yêu cầu từ sinh viên cung cấp file .env riêng).

### 3. Chạy dự án

Chạy server phát triển:

```bash
pnpm dev
```

Truy cập [http://localhost:3000](http://localhost:3000) để xem ứng dụng.

## 🛠 Công nghệ sử dụng

- **Framework:** Next.js 15 (App Router)
- **Database:** PostgreSQL (kết nối qua Prisma ORM)
- **Styling:** TailwindCSS, Shadcn UI
- **Authentication:** Better Auth
- **Realtime:** Pusher
- **Payment:** VNPAY
- **AI:** Google Generative AI (Gemini)
- **Storage:** AWS S3 Compatible Storage

## 📝 Cấu trúc thư mục nộp

- `app/`: Mã nguồn chính của ứng dụng
- `components/`: Các component tái sử dụng
- `lib/`: Các hàm tiện ích và cấu hình
- `prisma/`: Schema cơ sở dữ liệu
- `public/`: Tài nguyên tĩnh (ảnh, icon)
