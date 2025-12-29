"use client"

import * as React from "react"
import {
  IconChartBar,
  IconDashboard,
  IconDiscount,
  IconHelp,
  IconListDetails,
  IconSettings,
  IconUsers,
  IconMessage,
} from "@tabler/icons-react"

import Logo from "@/public/logo e-learning.png"
import { NavMain } from "@/components/sidebar/nav-main"
import { NavSecondary } from "@/components/sidebar/nav-secondary"
import { NavUser } from "@/components/sidebar/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Link from "next/link"
import Image from "next/image"

const data = {
  navMain: [
    {
      title: "Bảng điều khiển",
      url: "/teacher",
      icon: IconDashboard,
    },
    {
      title: "Khóa học",
      url: "/teacher/courses",
      icon: IconListDetails,
    },
     {
      title: "Mã giảm giá",
      url: "/teacher/coupon",
      icon: IconDiscount,
    },
     {
      title: "Tin nhắn",
      url: "/teacher/chat",
      icon: IconMessage,
    },
  ],
  navSecondary: [
    {
      title: "Cài đặt",
      url: "/settings",
      icon: IconSettings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/teacher">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Image src={Logo} alt="Logo" width={32} height={32} />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">NT E-Learning</span>
                  <span className="truncate text-xs">Teacher Dashboard</span>
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
  )
}