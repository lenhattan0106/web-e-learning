"use client"

import * as React from "react"
import {
  IconCamera,
  IconDashboard,
  IconFileAi,
  IconFileDescription,
  IconHelp,
  IconSearch,
  IconSettings,
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
      url: "/dashboard",
      icon: IconDashboard,
    },
  ],
  navClouds: [
    {
      title: "Chụp ảnh",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Đề xuất đang hoạt động",
          url: "#",
        },
        {
          title: "Đã lưu trữ",
          url: "#",
        },
      ],
    },
    {
      title: "Đề xuất",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Đề xuất đang hoạt động",
          url: "#",
        },
        {
          title: "Đã lưu trữ",
          url: "#",
        },
      ],
    },
    {
      title: "Lời nhắc",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Đề xuất đang hoạt động",
          url: "#",
        },
        {
          title: "Đã lưu trữ",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Cài đặt",
      url: "#",
      icon: IconSettings,
    },
    {
      title: "Trợ giúp",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Tìm kiếm",
      url: "#",
      icon: IconSearch,
    },
  ],

}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <Image src={Logo} alt="Logo" className="size-8"></Image>
                <span className="text-base font-semibold">NT E-Learning.</span>
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
        <NavUser/>
      </SidebarFooter>
    </Sidebar>
  )
}