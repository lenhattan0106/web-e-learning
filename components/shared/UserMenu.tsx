"use client";

import {
  BookOpen,
  Home,
  LayoutDashboard,
  FileEdit,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useSignOut } from "@/hooks/use-signout";
import { cn } from "@/lib/utils";

type Role = "user" | "teacher" | "admin";

interface UserMenuProps {
  variant?: "navbar" | "dashboard";
  showHomeButton?: boolean;
  className?: string; 
}

export function UserMenu({
  variant = "navbar",
  className,
}: UserMenuProps) {
  const { data: session, isPending } = authClient.useSession();
  const handleSignOut = useSignOut();

  if (isPending || !session) {
    return null;
  }

  const role = session.user.role as Role;
  const userName =
    session.user.name && session.user.name.length > 0
      ? session.user.name
      : session.user.email.split("@")[0];
  const userImage =
    session.user.image ?? `https://avatar.vercel.sh/${session.user.email}`;

  // Generate menu items based on role
  const getMenuItems = () => {
    const common = [
      { icon: Home, label: "Trang chủ", href: "/" },
      { icon: BookOpen, label: "Khóa học", href: "/courses" },
      { icon: Settings, label: "Cài đặt", href: "/settings" },
    ];
    return common;
  };

  const menuItems = getMenuItems();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "navbar" ? "ghost" : "ghost"}
          className={cn(
            "relative h-auto p-0 hover:bg-transparent",
            variant === "dashboard" && "gap-2",
            className
          )}
        >
          <Avatar className={variant === "dashboard" ? "h-8 w-8" : "h-9 w-9"}>
            <AvatarImage src={userImage} alt={userName} />
            <AvatarFallback>{userName[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          {variant === "dashboard" && (
            <ChevronDown className="h-4 w-4 opacity-60" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-sm">{userName}</span>
          <span className="truncate font-normal text-xs text-muted-foreground">
            {session.user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {menuItems.map((item) => (
            <DropdownMenuItem key={item.href} asChild>
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Đăng xuất</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
