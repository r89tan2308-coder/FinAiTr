import { type ReactNode } from "react";
import { appRoutes, type AppRoute, type RouteId } from "../app/routes";

interface AppShellProps {
  activeRoute: AppRoute;
  currentRouteId: RouteId;
  onRouteChange: (routeId: RouteId) => void;
  children: ReactNode;
}

export function AppShell({
  activeRoute,
  currentRouteId,
  onRouteChange,
  children,
}: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="side-nav" aria-label="Primary navigation">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            F
          </div>
          <div>
            <p className="brand-name">FinAiTr</p>
            <p className="brand-note">Local MVP</p>
          </div>
        </div>
        <nav className="nav-list">
          {appRoutes.map((route) => (
            <button
              className="nav-button"
              data-active={route.id === currentRouteId}
              key={route.id}
              onClick={() => onRouteChange(route.id)}
              type="button"
            >
              <route.icon aria-hidden="true" size={20} strokeWidth={2.1} />
              <span>{route.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <div className="app-frame">
        <header className="top-bar">
          <div>
            <p className="eyebrow">{activeRoute.eyebrow}</p>
            <h1>{activeRoute.label}</h1>
          </div>
          <div className="sync-pill">Offline</div>
        </header>

        <main className="page-content">{children}</main>

        <nav className="bottom-nav" aria-label="Primary navigation">
          {appRoutes.map((route) => (
            <button
              aria-label={route.label}
              className="bottom-nav-button"
              data-active={route.id === currentRouteId}
              key={route.id}
              onClick={() => onRouteChange(route.id)}
              title={route.label}
              type="button"
            >
              <route.icon aria-hidden="true" size={21} strokeWidth={2.1} />
              <span>{route.shortLabel}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
