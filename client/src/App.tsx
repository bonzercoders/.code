import { type ComponentType, useEffect, useState } from "react"

import { AppLayout } from "@/components/page/AppLayout"
import { type AppRoute } from "@/lib/navigation"
import { AgentsPage } from "@/pages/Agents/AgentsPage"
import { CharactersPage } from "@/pages/Characters/CharactersPage"
import { HomePage } from "@/pages/Home/HomePage"
import { SettingsPage } from "@/pages/Settings/SettingsPage"
import { VoicesPage } from "@/pages/Voices/VoicesPage"

const DEFAULT_ROUTE: AppRoute = "/home"

const routeComponents = {
  "/home": HomePage,
  "/agents": AgentsPage,
  "/characters": CharactersPage,
  "/voices": VoicesPage,
  "/settings": SettingsPage,
} satisfies Record<AppRoute, ComponentType>

function normalizePathname(pathname: string): string {
  if (pathname === "/") {
    return DEFAULT_ROUTE
  }

  return pathname.endsWith("/") && pathname.length > 1
    ? pathname.slice(0, -1).toLowerCase()
    : pathname.toLowerCase()
}

function resolveRoute(pathname: string): AppRoute {
  const normalizedPathname = normalizePathname(pathname)

  if (normalizedPathname in routeComponents) {
    return normalizedPathname as AppRoute
  }

  return DEFAULT_ROUTE
}

function getInitialRoute(): AppRoute {
  return resolveRoute(window.location.pathname)
}

function getInitialSidebarState(): boolean {
  return window.localStorage.getItem("app-sidebar-collapsed") === "true"
}

function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(getInitialRoute)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(getInitialSidebarState)

  useEffect(() => {
    const canonicalRoute = resolveRoute(window.location.pathname)

    if (window.location.pathname !== canonicalRoute) {
      window.history.replaceState(null, "", canonicalRoute)
    }

    const handlePopstate = () => {
      setCurrentRoute(resolveRoute(window.location.pathname))
    }

    window.addEventListener("popstate", handlePopstate)

    return () => {
      window.removeEventListener("popstate", handlePopstate)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem("app-sidebar-collapsed", String(isSidebarCollapsed))
  }, [isSidebarCollapsed])

  const ActivePage = routeComponents[currentRoute]

  const handleNavigate = (nextRoute: AppRoute) => {
    if (nextRoute === currentRoute) {
      return
    }

    window.history.pushState(null, "", nextRoute)
    setCurrentRoute(nextRoute)
  }

  return (
    <AppLayout
      currentRoute={currentRoute}
      isSidebarCollapsed={isSidebarCollapsed}
      onNavigate={handleNavigate}
      onToggleSidebar={() => setIsSidebarCollapsed((previous) => !previous)}
    >
      <ActivePage />
    </AppLayout>
  )
}

export default App