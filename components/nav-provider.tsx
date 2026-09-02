"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RouterProvider } from "react-aria-components"

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NonNullable<Parameters<ReturnType<typeof useRouter>["push"]>[1]>
  }
}

export function NavProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <RouterProvider navigate={router.push} useHref={(href) => href}>
      {children}
    </RouterProvider>
  )
}
