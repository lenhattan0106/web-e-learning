"use client";

import Image from "next/image";
import Link from "next/link";
import Logo from "@/public/logo e-learning.png";
import { ThemeToggle } from "@/components/ui/themeToggle";
import { authClient } from "@/lib/auth-client";
import { buttonVariants } from "@/components/ui/button";
import { UserDropDown } from "./UserDropdown";

export function Navbar() {
  const { data: session, isPending } = authClient.useSession();

  const role = session?.user.role as "user" | "teacher" | "admin" | undefined;

  // Navigation items dựa theo role
  const getNavigationItems = () => {
    if (role === "admin") {
      // Admin: quản lý users + Premium, không quản lý khóa học
      return [
        { name: "Trang chủ", href: "/" },
        { name: "Khóa học", href: "/courses" },
        { name: "Bảng điều khiển", href: "/admin" },
      ];
    }
    if (role === "teacher") {
      return [
        { name: "Trang chủ", href: "/" },
        { name: "Khóa học", href: "/teacher/courses" },
        { name: "Bảng điều khiển", href: "/teacher" },
      ];
    }
    return [
      { name: "Trang chủ", href: "/" },
      { name: "Khóa học", href: "/courses" },
      { name: "Bảng điều khiển", href: "/dashboard" },
    ];
  };

  const navigationItems = getNavigationItems();


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-[backdrop-filter]:bg-background/60">
      <div className="container flex min-h-16 items-center mx-auto px-4 md:px-4 lg:px-8">
        <Link href="/" className="flex items-center space-x-2 mr-4">
          <Image src={Logo} alt="Logo" className="size-12"></Image>
          <span className="font-bold">NT E-Learning</span>
        </Link>
        {/* Desktop navigation */}
        <nav className="hidden md:flex md:flex-1 md:items-center md:justify-between">
          <div className="flex items-center space-x-2">
            {navigationItems.map((item) => (
              <Link
                href={item.href}
                key={item.name}
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                {item.name}
              </Link>
            ))}
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle></ThemeToggle>
            {isPending ? null : session ? (
              <UserDropDown
                email={session.user.email}
                image={
                  session?.user.image ??
                  `https://avatar.vercel.sh/${session?.user.email}`
                }
                name={
                  session?.user.name && session.user.name.length > 0
                    ? session.user.name
                    : session?.user.email.split("@")[0]
                }
                role={role ?? "user"}
              ></UserDropDown>
            ) : (
              <>
                <Link
                  href="/login"
                  className={buttonVariants({
                    variant: "secondary",
                  })}
                >
                  Đăng nhập
                </Link>
                <Link href="/login" className={buttonVariants({})}>
                  Bắt đầu
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
