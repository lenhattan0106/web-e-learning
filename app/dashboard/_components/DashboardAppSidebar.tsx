"use client"

import * as React from "react"
import {
  IconDashboard,
  IconMessage,
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
    {
      title: "Tin nhắn",
      url: "/dashboard/chat",
      icon: IconMessage,
    },
      {
      title: "Khóa học",
      url: "/courses",
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