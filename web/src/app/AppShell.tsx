import { NavLink, Outlet } from "react-router-dom";

import { VersionBadge } from "@/app/VersionBadge";
import { visualizationDefinitions } from "@/registry/visualizationRegistry";

export function AppShell() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-brand">Zest</span>
        {visualizationDefinitions.map((definition) => (
          <NavLink
            key={definition.id}
            to={definition.routePath}
            end={definition.routePath === "/"}
            className={({ isActive }) => `app-nav-link${isActive ? " active" : ""}`}
          >
            {definition.title}
          </NavLink>
        ))}
        <VersionBadge />
      </header>
      <main style={{ minHeight: 0, minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}
