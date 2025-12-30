import {
  BookOpen,
  ChevronDownIcon,
  Home,
  LayoutDashboardIcon,
  LogOutIcon,
} from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { IconSettings } from "@tabler/icons-react";

type Role = "user" | "teacher" | "admin";

interface iAppProps {
  name: string;
  email: string;
  image: string;
  role: Role;
}

export function UserDropDown({ email, name, image, role }: iAppProps) {
      const router = useRouter();
      async function signOut() {
        await authClient.signOut({
          fetchOptions: {
            onSuccess: () => {
              router.push("/");
              toast.success("Đăng xuất thành công");
            },
            onError:()=>{
                toast.error("Đăng xuất thất bại");
            }
          },
        });
      }

      // Xác định đường dẫn dựa theo role
      const getDashboardPath = () => {
        if (role === "admin") return "/admin";
        if (role === "teacher") return "/teacher";
        return "/dashboard";
      };

      const getCoursesPath = () => {
        // Admin chỉ xem khóa học (không quản lý) → /courses
        // Teacher quản lý khóa học → /teacher/courses
        if (role === "teacher") return "/teacher/courses";
        return "/courses";
      };


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="h-auto p-0 hover:bg-transparent" variant="ghost">
          <Avatar>
            <AvatarImage alt="Ảnh đại diện" src={image} />
            <AvatarFallback>{name[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <ChevronDownIcon
            aria-hidden="true"
            className="opacity-60"
            size={16}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-48">
        <DropdownMenuLabel className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground text-sm">
            {name}
          </span>
          <span className="truncate font-normal text-muted-foreground text-xs">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href="/">
                <Home aria-hidden="true" className="opacity-60" size={16} />
                <span>Trang chủ</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href={getCoursesPath()}>
                <BookOpen
                  aria-hidden="true"
                  className="opacity-60"
                  size={16}
                />
                <span>Khóa học</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href={getDashboardPath()}>
                <LayoutDashboardIcon
                  aria-hidden="true"
                  className="opacity-60"
                  size={16}
                />
                <span>Bảng điều khiển</span>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href={"/settings"}>
                <IconSettings
                  aria-hidden="true"
                  className="opacity-60"
                  size={16}
                />
                <span>Cài đặt</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut}>
          <LogOutIcon aria-hidden="true" className="opacity-60" size={16} />
          <span>Đăng xuất</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
