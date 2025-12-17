import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

export const statement = {
  ...defaultStatements, // Giữ lại các permissions mặc định của user/session
  course: ["create", "update", "delete", "view"], // Permissions cho khóa học
  enrollment: ["view"], // Teacher chỉ xem enrollments của courses mình tạo
} as const;


export const ac = createAccessControl(statement);

// Định nghĩa role teacher với đầy đủ quyền quản lý khóa học
export const teacher = ac.newRole({
  course: ["create", "update", "delete", "view"],
  enrollment: ["view"],
});

// Định nghĩa role admin với đầy đủ quyền của better-auth
export const admin = ac.newRole({
  ...adminAc.statements, 
});

export const user = ac.newRole({
  course: ["view"],
});