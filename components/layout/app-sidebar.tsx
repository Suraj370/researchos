"use client"

import { usePathname, useRouter } from "next/navigation"
import {
  Database,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Settings,
  Waypoints,
  Workflow as WorkflowIcon,
} from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { signOut, useSession } from "@/lib/auth-client"

const NAV_ITEMS = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Research", href: "/research", icon: FlaskConical },
  { title: "Workflows", href: "/workflows", icon: WorkflowIcon },
  { title: "Sources", href: "/sources", icon: Database },
  { title: "Reports", href: "/reports", icon: FileText },
]

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const initials = parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0]?.slice(0, 2)
  return (initials || "?").toUpperCase()
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const user = session?.user

  async function handleSignOut() {
    await signOut()
    router.push("/sign-in")
    router.refresh()
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton href="/dashboard" size="lg" className="gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                <Waypoints className="size-4" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-heading text-sm font-semibold tracking-wider uppercase">
                  ResearchFlow
                </span>
                <span className="mt-1 font-mono text-[0.65rem] font-normal tracking-normal text-muted-foreground normal-case">
                  Durable AI research
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      href={item.href}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              href="/settings"
              isActive={pathname.startsWith("/settings")}
              tooltip="Settings"
            >
              <Settings />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenuTrigger>
              <SidebarMenuButton size="lg" className="gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center bg-secondary font-heading text-xs font-semibold text-secondary-foreground">
                  {user ? getInitials(user.name) : "…"}
                </span>
                <span className="flex flex-col items-start leading-none">
                  <span className="text-sm font-medium normal-case">
                    {user?.name ?? "Loading…"}
                  </span>
                  <span className="mt-1 font-mono text-[0.65rem] text-muted-foreground normal-case">
                    {user?.email ?? ""}
                  </span>
                </span>
              </SidebarMenuButton>
              <DropdownMenu
                aria-label="Account menu"
                placement="right bottom"
                className="min-w-56"
              >
                <DropdownMenuItem href="/settings">
                  <Settings />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onAction={handleSignOut}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenu>
            </DropdownMenuTrigger>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
