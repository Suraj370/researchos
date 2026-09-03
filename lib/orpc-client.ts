import { createORPCClient } from "@orpc/client"
import { RPCLink } from "@orpc/client/fetch"
import type { RouterClient } from "@orpc/server"

import type { Router } from "@/lib/orpc/router"

const link = new RPCLink({
  url: "/rpc",
})

export const orpc: RouterClient<Router> = createORPCClient(link)
