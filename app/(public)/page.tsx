"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/themeToggle";
import { authClient } from "@/lib/auth-client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Home() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut({
  fetchOptions: {
    onSuccess: () => {
      router.push("/"); // redirect to login page
      toast.success('Singed out Successfully')
    },
  },
});
  }

  return (
   <>
   <section className="relative py-20">
      <div className="flex flex-col items-center text-center space-y-8">
        <Badge variant={"outline"}>
            The future of Online Education
        </Badge>
        <h1>Elevate your Learning</h1>
      </div>

   </section>
   </>
  );
}
