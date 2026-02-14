import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useSession } from "@/lib/auth-client"
import { createRootRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { useEffect } from "react"

function RootComponent() {
  const location = useLocation()
  const navigate = useNavigate()
  const { data: session, isPending } = useSession()

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/signup"]
  const isPublicRoute = publicRoutes.includes(location.pathname)

  useEffect(() => {
    // Don't do anything while session is loading
    if (isPending) return

    // If user is not authenticated and trying to access protected route, redirect to login
    if (!session && !isPublicRoute) {
      navigate({ to: "/login" })
    }

    // If user is authenticated and trying to access login/signup, redirect to dashboard
    if (session && isPublicRoute) {
      navigate({ to: "/" })
    }
  }, [session, isPending, isPublicRoute, navigate])

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // For public routes (login/signup), render without sidebar
  if (isPublicRoute) {
    return (
      <>
        <Outlet />
        <TanStackRouterDevtools position="bottom-right" />
      </>
    )
  }

  // For authenticated routes, render with sidebar
  return (
    <>
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <Outlet />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}

export const Route = createRootRoute({
  component: RootComponent
})
