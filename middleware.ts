import { NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const AUTH_PAGES = ["/sign-in", "/sign-up"]

export async function middleware(request: NextRequest) {
  // Optimistic check only (cookie presence, no DB round trip - middleware runs on
  // the Edge runtime, which can't reach Postgres). Real enforcement happens in
  // every protected oRPC procedure via auth.api.getSession(), which IS DB-backed.
  const sessionCookie = getSessionCookie(request)
  const isAuthPage = AUTH_PAGES.includes(request.nextUrl.pathname)

  if (!sessionCookie && !isAuthPage) {
    const signInUrl = new URL("/sign-in", request.url)
    signInUrl.searchParams.set("redirectTo", request.nextUrl.pathname)
    return NextResponse.redirect(signInUrl)
  }

  if (sessionCookie && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard",
    "/research",
    "/workflows",
    "/workflows/:path*",
    "/sources",
    "/reports",
    "/settings",
    "/sign-in",
    "/sign-up",
  ],
}
