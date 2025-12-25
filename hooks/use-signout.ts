"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useSignOut(){
    const router = useRouter()
     const handleSignOut =  async function signOut() {
        await authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push("/"); // redirect to login page
              toast.success("Đăng xuất tài khoản thành công");
            },
            onError:()=>{
                toast.error("Đăng xuất thất bại");
            }
          },
        });
      }
    return handleSignOut;  
}