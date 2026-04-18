"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  MessageSquare,
  Calendar,
  Bot,
  Users,
  Wrench,
  Settings,
  FolderKanban,
  ListTodo,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const tAuth = useTranslations("auth");
  const locale = useLocale();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {}
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  // Don't show navbar on auth pages (except profile-setup), public quote request pages, or homepage
  const isProfileSetup = pathname?.includes("/auth/profile-setup");
  const isHomepage = pathname === "/" || pathname?.match(/^\/[a-z]{2}$/);
  if (
    isHomepage ||
    (pathname?.startsWith("/auth") && !isProfileSetup) ||
    pathname?.startsWith("/quote-request")
  ) {
    return null;
  }

  const navLinks = [
    {
      href: `/${locale}/dashboard`,
      label: t("dashboard"),
      icon: LayoutDashboard,
    },
    { href: `/${locale}/leads`, label: t("leads"), icon: MessageSquare },
    { href: `/${locale}/quotes`, label: t("quotes"), icon: FileText },
    { href: `/${locale}/invoices`, label: t("invoices"), icon: Receipt },
    { href: `/${locale}/calendar`, label: t("calendar"), icon: Calendar },
    { href: `/${locale}/clients`, label: t("clients"), icon: Users },
    { href: `/${locale}/crew`, label: "Crew", icon: Wrench },
    { href: `/${locale}/projects`, label: t("projects"), icon: FolderKanban },
    { href: `/${locale}/tasks`, label: t("tasks"), icon: ListTodo },
  ];

  const actionLinks = [
    {
      href: `/${locale}/actions/scheduling`,
      label: "Generate Lead",
      icon: Bot,
    },
  ];

  const settingsLink = {
    href: `/${locale}/settings`,
    label: t("settings"),
    icon: Settings,
  };

  const uniqueLinksByHref = <T extends { href: string }>(
    links: Array<T | undefined>,
  ) => {
    const seen = new Set<string>();
    return links.filter((link): link is T => {
      if (!link || seen.has(link.href)) return false;
      seen.add(link.href);
      return true;
    });
  };

  const mobilePrimaryLinks = uniqueLinksByHref([
    navLinks.find((link) => link.href === `/${locale}/dashboard`),
    navLinks.find((link) => link.href === `/${locale}/quotes`),
    navLinks.find((link) => link.href === `/${locale}/calendar`),
    navLinks.find((link) => link.href === `/${locale}/clients`),
    navLinks.find((link) => link.href === `/${locale}/leads`),
    navLinks.find((link) => link.href === `/${locale}/tasks`),
    navLinks.find((link) => link.href === `/${locale}/crew`),
    navLinks.find((link) => link.href === `/${locale}/invoices`),
    navLinks.find((link) => link.href === `/${locale}/projects`),
  ]);
  const mobileMenuLinks = uniqueLinksByHref([
    ...mobilePrimaryLinks,
    ...actionLinks,
    settingsLink,
  ]);

  const getMobilePageTitle = () => {
    if (!pathname) return "";
    const allLinks = [...navLinks, ...actionLinks, settingsLink];
    const exact = allLinks.find((link) => pathname === link.href);
    if (exact) return exact.label;
    const nested = allLinks
      .filter(
        (link) =>
          link.href !== `/${locale}/dashboard` &&
          pathname.startsWith(`${link.href}/`),
      )
      .sort((a, b) => b.href.length - a.href.length)[0];
    if (nested) return nested.label;
    if (pathname.includes("/billing")) return "Billing";
    if (pathname.includes("/request")) return "Requests";
    if (pathname.includes("/admin")) return "Admin";
    return t("dashboard");
  };

  if (loading) {
    return (
      <>
        {/* Desktop skeleton sidebar */}
        <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 w-16 border-r border-border bg-card">
          <div className="p-3 flex items-center justify-center">
            <div className="h-8 w-8 bg-muted animate-pulse rounded-lg" />
          </div>
        </aside>
        {/* Mobile skeleton */}
        <nav className="md:hidden border-b border-border bg-card">
          <div className="flex h-12 items-center justify-between px-3">
            <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          </div>
        </nav>
      </>
    );
  }

  if (!user) {
    return null;
  }

  // Show only logo on profile-setup page
  if (isProfileSetup) {
    return (
      <nav className="border-b border-border bg-card sticky top-0 z-40 print:hidden md:hidden">
        <div className="container mx-auto px-3">
          <div className="flex h-12 items-center">
            <Link
              href={`/${locale}/dashboard`}
              className="flex items-center gap-2"
            >
              <img
                src="/logo.png"
                alt="Logo"
                className="w-7 h-7 object-contain"
              />
              <span className="text-lg font-bold bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 bg-clip-text text-transparent">
                ContractorOps AI
              </span>
            </Link>
          </div>
        </div>
      </nav>
    );
  }

  const companyName = user.contractor_profile?.company_name || user.email || "";

  // Determine the current sidebar width for consistent rendering
  const sidebarWidth = collapsed ? "w-16" : "w-60";
  return (
    <TooltipProvider delayDuration={0}>
      {/* ===== MOBILE TOP HEADER ===== */}
      <header className="sticky top-0 z-[60] border-b border-sky-200/70 bg-sky-50/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-sky-50/85 md:hidden print:hidden">
        <div className="relative flex h-14 items-center justify-between px-4">
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="group flex h-10 w-10 items-center justify-center rounded-lg border border-sky-200 bg-white text-sky-700 shadow-sm transition-colors active:bg-sky-100"
          >
            <span className="relative h-4 w-5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ${
                  mobileMenuOpen ? "translate-y-[7px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[7px] h-0.5 rounded-full bg-current transition-all duration-300 ${
                  mobileMenuOpen ? "w-0 opacity-0" : "w-4 opacity-100"
                }`}
              />
              <span
                className={`absolute bottom-0 left-0 h-0.5 w-5 rounded-full bg-current transition-transform duration-300 ${
                  mobileMenuOpen ? "-translate-y-[7px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>

          <h1 className="pointer-events-none absolute left-1/2 max-w-[58vw] -translate-x-1/2 truncate text-center text-[17px] font-bold capitalize tracking-tight text-slate-950">
            {getMobilePageTitle()}
          </h1>

          <Link
            href={`/${locale}/dashboard`}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-sky-200/80"
          >
            <img
              src="/logo.png"
              alt="ContractorOps AI"
              className="h-7 w-7 object-contain"
            />
          </Link>
        </div>
      </header>

      <div
        className={`fixed inset-x-0 top-14 bottom-0 z-[70] md:hidden print:hidden ${
          mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <button
          type="button"
          aria-label="Close menu"
          className={`absolute inset-y-0 right-0 w-[70vw] bg-slate-950/15 backdrop-blur-[1px] transition-opacity duration-300 ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />
        <aside
          className={`absolute inset-y-0 left-0 flex w-[30vw] flex-col overflow-hidden border-r border-sky-200 bg-white shadow-2xl transition-transform duration-300 ease-out ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex-1 space-y-2 overflow-y-auto p-2 pt-3">
            {mobileMenuLinks
              .filter((link) => link.href !== settingsLink.href)
              .map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== `/${locale}/dashboard` &&
                    Boolean(pathname?.startsWith(`${link.href}/`)));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-lg px-1 text-center transition-all ${
                      isActive
                        ? "bg-sky-600 text-white shadow-sm"
                        : mobilePrimaryLinks.some(
                              (primary) => primary.href === link.href,
                            )
                          ? "bg-sky-50 text-sky-800 ring-1 ring-sky-100 active:bg-sky-100"
                          : "text-slate-600 active:bg-sky-50"
                    }`}
                    title={link.label}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="max-w-full truncate text-[10px] font-semibold leading-tight">
                      {link.label}
                    </span>
                  </Link>
                );
              })}
          </div>
          <div className="mt-auto space-y-2 border-t border-slate-100 p-2">
            {(() => {
              const isSettingsActive =
                pathname === settingsLink.href ||
                Boolean(pathname?.startsWith(`${settingsLink.href}/`));
              const Icon = settingsLink.icon;
              return (
                <Link
                  href={settingsLink.href}
                  className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-lg px-1 text-center transition-all ${
                    isSettingsActive
                      ? "bg-sky-600 text-white shadow-sm"
                      : "text-slate-600 active:bg-sky-50"
                  }`}
                  title={settingsLink.label}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="max-w-full truncate text-[10px] font-semibold leading-tight">
                    {settingsLink.label}
                  </span>
                </Link>
              );
            })()}
            <button
              type="button"
              onClick={logout}
              className="flex min-h-[58px] w-full flex-col items-center justify-center gap-1 rounded-lg px-1 text-center text-rose-600 active:bg-rose-50"
            >
              <LogOut className="h-5 w-5" />
              <span className="max-w-full truncate text-[10px] font-semibold leading-tight">
                {tAuth("logout")}
              </span>
            </button>
          </div>
        </aside>
      </div>

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 border-r border-border bg-card print:hidden transition-all duration-300 ease-in-out ${sidebarWidth}`}
      >
        {/* Logo / Brand */}
        <div
          className={`flex items-center h-14 border-b border-border shrink-0 ${collapsed ? "justify-center px-2" : "px-4"}`}
        >
          <Link
            href={`/${locale}/dashboard`}
            className="flex items-center gap-2.5 min-w-0"
          >
            <img
              src="/logo.png"
              alt="Logo"
              className="w-7 h-7 shrink-0 object-contain"
            />
            {!collapsed && (
              <span className="text-[15px] font-bold bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 bg-clip-text text-transparent truncate leading-tight">
                ContractorOps AI
              </span>
            )}
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {navLinks.map((link) => {
            let isActive = false;
            if (link.href === `/${locale}/dashboard`) {
              isActive = pathname === link.href;
            } else {
              isActive = pathname?.startsWith(link.href) || false;
            }
            const Icon = link.icon;

            const linkContent = (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                  collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
                } ${
                  isActive
                    ? "bg-sky-500/10 text-sky-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{link.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={link.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {link.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}

          {/* Actions section */}
          {!collapsed && (
            <div className="pt-3 mt-3 border-t border-border">
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {t("actions")}
              </p>
            </div>
          )}
          {collapsed && <div className="pt-2 mt-2 border-t border-border" />}

          {actionLinks.map((link) => {
            const isActive = pathname?.startsWith(link.href);
            const Icon = link.icon;

            const linkContent = (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
                  collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
                } ${
                  isActive
                    ? "bg-sky-500/10 text-sky-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{link.label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={link.href}>
                  <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {link.label}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkContent;
          })}
        </nav>

        {/* Bottom section: user info, settings, collapse toggle */}
        <div className="shrink-0 border-t border-border">
          {/* Company / user */}
          {!collapsed && (
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-medium text-foreground truncate">
                {companyName}
              </p>
              {user.contractor_profile?.company_name && user.email && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {user.email}
                </p>
              )}
            </div>
          )}

          {/* Settings */}
          {(() => {
            const isSettingsActive = pathname?.startsWith(
              `/${locale}/settings`,
            );
            const settingsLink = (
              <Link
                href={`/${locale}/settings`}
                className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors mx-2 my-1.5 ${
                  collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"
                } ${
                  isSettingsActive
                    ? "bg-sky-500/10 text-sky-700"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Settings className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && (
                  <span className="truncate">{t("settings")}</span>
                )}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip>
                  <TooltipTrigger asChild>{settingsLink}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    {t("settings")}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return settingsLink;
          })()}

          {/* Collapse toggle */}
          <button
            onClick={toggleCollapsed}
            className={`flex items-center gap-3 w-full text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors mx-0 px-2 py-3 border-t border-border ${
              collapsed ? "justify-center" : "px-5"
            }`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight className="h-[18px] w-[18px] shrink-0" />
            ) : (
              <>
                <ChevronsLeft className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}

/** Returns the CSS class for the content area's left margin, matching the sidebar width. */
export function useSidebarMargin(): string {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "true") setCollapsed(true);
    } catch {}

    // Listen for storage changes so the margin updates in sync
    const handler = () => {
      try {
        const val = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
        setCollapsed(val === "true");
      } catch {}
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  if (!mounted) return "";
  return collapsed ? "md:ml-16" : "md:ml-60";
}
