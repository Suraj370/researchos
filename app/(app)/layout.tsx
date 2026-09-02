import { AppHeader } from "@/components/layout/app-header"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { WorkflowStoreProvider } from "@/lib/workflow-store"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkflowStoreProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <div className="flex-1 p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </WorkflowStoreProvider>
  )
}
