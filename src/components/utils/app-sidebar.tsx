import * as React from "react"
import { useLocation, Link } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { LayoutDashboard, ClipboardList, UserPlus, Settings, FileText, MapPin, BarChart3, BookOpen } from "lucide-react"
import Logo from "@/assets/safespacelogo.png"


// This is sample data.
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/admin-dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Analystics",
      url: "/admin-dashboard/analytics",
      icon: BarChart3, BookOpen,
    },
    {
      title: "Incident Map",
      url: "/admin-dashboard/incident-map",
      icon: MapPin,
    }, {
      title: "Report Management",
      url: "/admin-dashboard/reports",
      icon: ClipboardList,
    },
    {
      title: "Support Service Approvals",
      url: "/admin-dashboard/support-service-approvals",
      icon: FileText,
    },
    {
      title: "Resources Management",
      url: "/admin-dashboard/resources",
      icon: BookOpen,
    },
    {
      title: "Community Management",
      url: "/admin-dashboard/community",
      icon: UserPlus,
    },
    {
      title: "Admins Management",
      url: "/admin-dashboard/admins",
      icon: UserPlus,
    },
    {
      title: "System Settings",
      url: "/admin-dashboard/settings",
      icon: Settings,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const currentPath = location.pathname
  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="justify-center pt-20 pb-15">
              <a href="/admin-dashboard" className="flex items-center justify-center">
                <div className="flex flex-col gap-0.5 leading-none">
                  <img src={Logo} className="w-32 h-48 object-contain" alt="logo" />
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {data.navMain.map((item) => {
              const isMainActive = item.url !== "#" && currentPath === item.url

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isMainActive}>
                    {item.url !== "#" ? (
                      <Link
                        to={item.url}
                        className={`flex items-center text-sm font-medium rounded-md px-3 py-1.5 transition-colors duration-200"
                          }`}
                      >
                        {item.icon && <item.icon className="w-4 h-4 mr-2" />}
                        {item.title}
                      </Link>
                    ) : (
                      <span className="flex items-center text-sm font-medium px-3 py-1.5">
                        {item.icon && <item.icon className="w-4 h-4 mr-2" />}
                        {item.title}
                      </span>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
