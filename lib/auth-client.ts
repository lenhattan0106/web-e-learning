import { createAuthClient } from "better-auth/react";
import { emailOTPClient } from "better-auth/client/plugins";
import { adminClient } from "better-auth/client/plugins";
import { ac, admin, teacher, user } from "./permissions";

export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    adminClient({
      ac,
      roles: {
        admin,
        teacher,
        user,
      },
    }),
  ],
});
