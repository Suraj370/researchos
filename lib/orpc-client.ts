import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { RouterClient } from "@orpc/server"

import type { Router } from "@/lib/orpc/router"

// RPCLink needs an absolute URL (it does its own `new URL(...)` resolution
// internally, unlike fetch() which accepts relative paths). This module is
// only ever used client-side, but it's still imported into the SSR bundle of
// "use client" components, so guard the `window`-dependent origin lookup.
const url = typeof window !== "undefined" ? `${window.location.origin}/rpc` : "http://localhost/rpc"

const link = new RPCLink({
  url,
})

export const orpc: RouterClient<Router> = createORPCClient(link)
