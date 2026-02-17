import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from "@/components/ui/sidebar"
import { useCurrentUser } from "@/lib/hooks/use-user"
import { Link } from "@tanstack/react-router"
import { FolderIcon, GlobeIcon, HelpCircleIcon, LayoutDashboardIcon, SettingsIcon } from "lucide-react"
import * as React from "react"

const data = {
  navMain: [
    {
      title: "Dashboard",
      to: "/",
      icon: LayoutDashboardIcon
    },
    {
      title: "Projects",
      to: "/projects",
      icon: FolderIcon
    },
    {
      title: "Environments",
      to: "/environments",
      icon: GlobeIcon
    }
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/settings",
      icon: SettingsIcon
    },
    {
      title: "Get Help",
      url: "https://github.com/dtapline/dtapline/issues",
      icon: HelpCircleIcon
    }
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user, isLoading } = useCurrentUser()

  // Extract initials from name for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" className="py-4 justify-center">
              <Link to="/" className="flex justify-center">
                <img src="/logo.svg" alt="Dtapline" className="h-16 w-auto" />
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
        {isLoading ? <div className="p-2 text-sm text-muted-foreground">Loading...</div> : user ?
          (
            <NavUser
              user={{
                name: user.name,
                email: user.email,
                avatar: getInitials(user.name),
                image: user.image
              }}
            />
          ) :
          null}
      </SidebarFooter>
    </Sidebar>
  )
}
