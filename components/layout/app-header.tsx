"use client"

import { usePathname } from "next/navigation"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"

const SECTION_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  research: "Research",
  workflows: "Workflows",
  sources: "Sources",
  reports: "Reports",
  settings: "Settings",
}

function useSectionLabel(pathname: string) {
  const segment = pathname.split("/").filter(Boolean)[0] ?? "dashboard"
  return SECTION_LABELS[segment] ?? "ResearchFlow"
}

export function AppHeader() {
  const pathname = usePathname()
  const label = useSectionLabel(pathname)
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <SidebarTrigger />
      <div className="h-4 w-px bg-border" />
      <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle theme"
          onPress={() =>
            setTheme(resolvedTheme === "dark" ? "light" : "dark")
          }
        >
          <Sun className="hidden dark:block" />
          <Moon className="block dark:hidden" />
        </Button>
      </div>
    </header>
  )
}
