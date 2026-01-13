"use client";

import * as React from "react";
import {
  IconDashboard,
  IconUsers,
  IconSettings,
  IconSparkles,
  IconMessageReport,
  IconBooks,
  IconHistory,
} from "@tabler/icons-react";

import Logo from "@/public/logo e-learning.png";
import { NavMain } from "@/components/sidebar/nav-main";
import { NavSecondary } from "@/components/sidebar/nav-secondary";
import { NavUser } from "@/components/sidebar/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import Image from "next/image";

const data = {
  navMain: [
    {
      title: "Bảng điều khiển",
      url: "/admin",
      icon: IconDashboard,
    },
    {
      title: "Quản lý người dùng",
      url: "/admin/users",
      icon: IconUsers,
    },
    {
      title: "Khóa học hiện tại",
      url: "/courses",
      icon: IconBooks,
    },
    {
      title: "Quản lý AI Premium",
      url: "/admin/premium",
      icon: IconSparkles,
    },
    {
      title: "Quản lý chất lượng",
      url: "/admin/quality-control",
      icon: IconMessageReport,
    },
    {
      title: "Nhật ký xử lý",
      url: "/admin/activity-logs",
      icon: IconHistory,
    },
  ],
  navSecondary: [
    {
      title: "Cài đặt",
      url: "/settings",
      icon: IconSettings,
    },
  ],
};

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image src={Logo} alt="Logo" width={32} height={32} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">NT E-Learning</span>
                  <span className="truncate text-xs">Admin Panel</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
