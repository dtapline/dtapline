import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpCircleIcon,
  FolderIcon,
  GlobeIcon,
  HelpCircleIcon,
  LayoutDashboardIcon,
  SettingsIcon,
} from "lucide-react";
import * as React from "react";
import { useCurrentUser } from "@/lib/hooks/use-user";

const data = {
  navMain: [
    {
      title: "Dashboard",
      to: "/",
      icon: LayoutDashboardIcon,
    },
    {
      title: "Projects",
      to: "/project",
      icon: FolderIcon,
    },
    {
      title: "Environments",
      to: "/environments",
      icon: GlobeIcon,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: SettingsIcon,
    },
    {
      title: "Get Help",
      url: "#",
      icon: HelpCircleIcon,
    },
  ],
};

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
            <SidebarMenuButton asChild>
              <Link to="/">
                <ArrowUpCircleIcon className="h-5 w-5" />
                <span className="text-base font-semibold">CloudMatrix</span>
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
        {isLoading ? (
          <div className="p-2 text-sm text-muted-foreground">Loading...</div>
        ) : user ? (
          <NavUser
            user={{
              name: user.name,
              email: user.email,
              avatar: getInitials(user.name),
            }}
          />
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
