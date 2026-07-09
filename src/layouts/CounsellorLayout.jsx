// src/layouts/CounsellorLayout.jsx
import React, { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useSession } from "../hooks/useSession";

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        classNames(
          "block rounded-xl px-3 py-2 text-sm font-medium transition",
          isActive
            ? "bg-[var(--brand-primary)] text-white"
            : "text-[var(--text-primary)] hover:bg-[var(--bg-app)]"
        )
      }
    >
      {label}
    </NavLink>
  );
}

const NAV = [
  { to: "/counsellor/caseload", label: "My Caseload" },
];

function SidebarNav({ onNavigate }) {
  return (
    <>
      <nav className="space-y-1 px-3">
        {NAV.map((item) => (
          <NavItem key={item.to} to={item.to} label={item.label} onClick={onNavigate} />
        ))}
      </nav>
      {/* Placeholder for future nav items (reports, notes, …) */}
      <div className="mt-4 border-t border-[var(--border)] px-6 pt-4">
        <div className="text-xs text-[var(--text-muted)]">More tools coming soon</div>
      </div>
    </>
  );
}

export default function CounsellorLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { sessionUser, logout } = useSession();

  // Close drawer on route change (mobile)
  React.useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const footer = (
    <>
      <div className="text-xs text-[var(--text-muted)]">Signed in</div>
      <div className="truncate text-sm font-medium">
        {sessionUser?.full_name || "Counsellor"}
      </div>
      <button
        type="button"
        onClick={logout}
        className="mt-2 rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-medium hover:bg-[var(--bg-app)]"
      >
        Logout
      </button>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)]">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 border-b border-[var(--border)] bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
          >
            ☰
          </button>

          <div className="text-sm font-semibold">Counsellor Portal</div>

          <div className="w-[42px]" />
        </div>
      </div>

      {/* Layout grid */}
      <div className="mx-auto flex max-w-[1400px]">
        {/* Desktop sidebar */}
        <aside className="hidden h-screen w-[260px] shrink-0 border-r border-[var(--border)] bg-white md:flex md:flex-col">
          <div className="px-5 py-4">
            <div className="text-sm font-semibold">Counsellor Portal</div>
            <div className="mt-1 text-xs text-[var(--text-muted)]">
              Guide your assigned students
            </div>
          </div>

          <div className="flex-1">
            <SidebarNav />
          </div>

          <div className="border-t border-[var(--border)] px-5 py-4">{footer}</div>
        </aside>

        {/* Mobile drawer */}
        {open ? (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-black/30"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[280px] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
                <div className="text-sm font-semibold">Counsellor Portal</div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="py-3">
                <SidebarNav onNavigate={() => setOpen(false)} />
              </div>

              <div className="absolute bottom-0 w-full border-t border-[var(--border)] px-4 py-4">
                {footer}
              </div>
            </div>
          </div>
        ) : null}

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
