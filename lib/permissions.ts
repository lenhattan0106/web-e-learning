import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

export const statement = {
  ...defaultStatements, // Giữ lại các permissions mặc định của user/session
  course: ["create", "update", "delete", "view"], // Permissions cho khóa học
  enrollment: ["view"], // Teacher chỉ xem enrollments của courses mình tạo
} as const;


export const ac = createAccessControl(statement);

export const teacher = ac.newRole({
  course: ["create", "update", "delete", "view"],
  enrollment: ["view"],
});


export const admin = ac.newRole({
  ...adminAc.statements, 
  course: ["view"], // Admin chỉ xem courses như user
  enrollment: ["view"], // Admin xem enrollments để track doanh thu và phí sàn
});

export const user = ac.newRole({
  course: ["view"],
});