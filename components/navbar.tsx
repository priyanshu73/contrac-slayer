"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Calendar,
  CalendarClock,
  Users,
  Wrench,
  Settings,
  FolderKanban,
  ListTodo,
  LogOut,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Zap,
} from "lucide-react";
import type { LucideProps } from "lucide-react";
import { forwardRef, useState, useEffect } from "react";

const PhoneAIIcon = forwardRef<SVGSVGElement, LucideProps>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="5" width="12" height="17" rx="2" />
      <path d="M8 18.5h.01" />
      <path d="M19 2l1.5 3.5L24 7l-3.5 1.5L19 12l-1.5-3.5L14 7l3.5-1.5z" />
    </svg>
  ),
);
PhoneAIIcon.displayName = "PhoneAIIcon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";
const SIDEBAR_GROUPS_KEY = "sidebar_groups_open";

function getLocalizedRoute(pathname: string | null | undefined): string {
  return pathname?.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/";
}

export function Navbar() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("navigation");
  const tAuth = useTranslations("auth");
  const locale = useLocale();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    sales: true,
    work: true,
    "ai-agents": true,
  });

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === "true") setCollapsed(true);
      const groupsStored = localStorage.getItem(SIDEBAR_GROUPS_KEY);
      if (groupsStored) {
        const parsed = JSON.parse(groupsStored);
        if (parsed && typeof parsed === "object") {
          setOpenGroups((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch {}
  }, []);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(SIDEBAR_GROUPS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

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

  const dashboardLink = {
    href: `/${locale}/dashboard`,
    label: t("dashboard"),
    icon: LayoutDashboard,
  };

  const navGroups = [
    {
      id: "sales",
      label: "Sales",
      links: [
        { href: `/${locale}/leads`, label: t("leads"), icon: MessageSquare },
        { href: `/${locale}/quotes`, label: t("quotes"), icon: FileText },
        { href: `/${locale}/clients`, label: t("clients"), icon: Users },
        {
          href: `/${locale}/actions/scheduling`,
          label: t("scheduling"),
          icon: CalendarClock,
        },
      ],
    },
    {
      id: "work",
      label: "Work",
      links: [
        { href: `/${locale}/projects`, label: t("projects"), icon: FolderKanban },
        { href: `/${locale}/tasks`, label: t("tasks"), icon: ListTodo },
        { href: `/${locale}/calendar`, label: t("calendar"), icon: Calendar },
        { href: `/${locale}/crew`, label: "Crew", icon: Wrench },
      ],
    },
    {
      id: "ai-agents",
      label: "AI Agents",
      links: [
        {
          href: `/${locale}/lead-generator-agent`,
          label: t("leadGeneratorAgent"),
          icon: Zap,
        },
        {
          href: `/${locale}/frontline`,
          label: t("yourFrontline"),
          icon: PhoneAIIcon,
        },
      ],
    },
  ];

  const allNavLinks = [dashboardLink, ...navGroups.flatMap((g) => g.links)];

  const settingsLink = {
    href: `/${locale}/settings`,
    label: t("settings"),
    icon: Settings,
  };

  const currentRoute = getLocalizedRoute(pathname);
  const getPageTitle = () => {
    if (currentRoute === "/dashboard") return t("dashboard");
    if (currentRoute === "/leads") return t("leads");
    if (currentRoute.startsWith("/leads/")) return "Lead Details";
    if (currentRoute === "/proposals/new") return "Create Proposal";
    if (currentRoute === "/quotes/new") return "New Quote";
    if (currentRoute === "/quotes/copy") return "Copy Quote";
    if (currentRoute.match(/^\/quotes\/[^/]+\/proposal$/)) return "Proposal Builder";
    if (currentRoute.match(/^\/quotes\/[^/]+\/edit$/)) return "Edit Quote";
    if (currentRoute.startsWith("/quotes/")) return "Quote Details";
    if (currentRoute === "/quotes") return t("quotes");
    if (currentRoute.startsWith("/invoices/") && currentRoute.endsWith("/customer")) return "Customer Invoice";
    if (currentRoute.startsWith("/invoices/")) return "Invoice Details";
    if (currentRoute === "/invoices") return t("invoices");
    if (currentRoute.startsWith("/calendar/")) return "Booking Details";
    if (currentRoute === "/calendar") return t("calendar");
    if (currentRoute === "/clients/new") return "New Client";
    if (currentRoute.startsWith("/clients/")) return "Client Details";
    if (currentRoute === "/clients") return t("clients");
    if (currentRoute === "/lead-generator-agent/new") return "New Campaign";
    if (currentRoute.startsWith("/lead-generator-agent/")) return "Campaign Details";
    if (currentRoute === "/lead-generator-agent") return t("leadGeneratorAgent");
    if (currentRoute === "/frontline") return t("yourFrontline");
    if (currentRoute.startsWith("/crew/")) return "Crew Details";
    if (currentRoute === "/crew") return "Crew";
    if (currentRoute.startsWith("/projects/trade/")) return "Trade Scope";
    if (currentRoute.startsWith("/projects/")) return "Project Details";
    if (currentRoute === "/projects") return t("projects");
    if (currentRoute === "/tasks") return t("tasks");
    if (currentRoute === "/actions/scheduling") return t("scheduling");
    if (currentRoute.startsWith("/settings")) return t("settings");
    if (currentRoute.startsWith("/billing")) return "Billing";
    if (currentRoute.startsWith("/admin")) return "Admin";
    if (currentRoute.startsWith("/privacy")) return "Privacy";
    if (currentRoute.startsWith("/request/settings")) return "Request Settings";
    if (currentRoute.startsWith("/request")) return "Quote Request";
    if (currentRoute.startsWith("/availability")) return "Availability";
    return "Dashboard";
  };

  const pageTitle = getPageTitle();

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
    allNavLinks.find((link) => link.href === `/${locale}/dashboard`),
    allNavLinks.find((link) => link.href === `/${locale}/leads`),
    allNavLinks.find((link) => link.href === `/${locale}/quotes`),
    allNavLinks.find((link) => link.href === `/${locale}/clients`),
    allNavLinks.find((link) => link.href === `/${locale}/projects`),
    allNavLinks.find((link) => link.href === `/${locale}/tasks`),
    allNavLinks.find((link) => link.href === `/${locale}/calendar`),
    allNavLinks.find((link) => link.href === `/${locale}/crew`),
  ]);
  const mobileMenuLinks = uniqueLinksByHref([
    ...mobilePrimaryLinks,
    allNavLinks.find((link) => link.href === `/${locale}/actions/scheduling`),
  ]);

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

  // Show only the current page title on profile-setup.
  if (isProfileSetup) {
    return (
      <nav className="nav-typography border-b border-border bg-card sticky top-0 z-40 print:hidden md:hidden">
        <div className="container mx-auto px-3">
          <div className="flex h-12 items-center">
            <Link
              href={`/${locale}/dashboard`}
              className="min-w-0"
            >
              <span className="mobile-app-page-title truncate text-[17px] font-[700] text-slate-950">
                Profile Setup
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
      <header className="mobile-app-header nav-typography sticky top-0 z-[60] bg-white/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/85 md:hidden print:hidden">
        <div className="relative flex h-14 items-center justify-between px-4">
          <button
            type="button"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="group flex h-10 w-10 items-center justify-center text-slate-700 transition-colors active:text-slate-950"
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
          <div className="mobile-app-page-title absolute left-1/2 max-w-[calc(100%-7rem)] -translate-x-1/2 truncate whitespace-nowrap text-[17px] font-[700] text-slate-950">
            {pageTitle}
          </div>
          <Link
            href={settingsLink.href}
            className="flex h-10 w-10 items-center justify-center text-slate-700 transition-colors active:text-slate-950"
            aria-label={settingsLink.label}
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div
        className={`fixed inset-x-0 top-[calc(3.5rem+env(safe-area-inset-top))] bottom-0 z-[70] md:hidden print:hidden ${
          mobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <button
          type="button"
          aria-label="Close menu"
          className={`absolute inset-y-0 right-0 w-full bg-black/45 backdrop-blur-[2px] transition-opacity duration-300 ${
            mobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileMenuOpen(false)}
        />
        <aside
          className={`nav-typography absolute inset-y-0 left-0 flex w-[min(82vw,340px)] flex-col overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,#111111_0%,#090909_48%,#171717_100%)] text-white shadow-[20px_0_50px_rgba(0,0,0,0.35)] transition-transform duration-300 ease-out ${
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
            {mobileMenuLinks.map((link) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== `/${locale}/dashboard` &&
                    Boolean(pathname?.startsWith(`${link.href}/`)));
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`group flex min-h-[52px] items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all active:scale-[0.99] ${
                      isActive
                        ? "bg-[rgba(255,255,255,0.96)] text-neutral-950 shadow-[0_12px_28px_rgba(0,0,0,0.28)]"
                        : "text-white/78 hover:bg-white/8 hover:text-white active:bg-white/12"
                    }`}
                    title={link.label}
                  >
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? "bg-black text-white"
                          : "bg-white/8 text-white/72 group-hover:bg-white/12 group-hover:text-white"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                    </span>
                    <span className={`min-w-0 truncate text-[14px] leading-tight tracking-[0] ${isActive ? "font-bold" : "font-semibold"}`}>
                      {link.label}
                    </span>
                  </Link>
                );
              })}
          </div>
          <div className="mt-auto border-t border-white/10 bg-white/[0.03] px-3 py-3">
            <button
              type="button"
              onClick={logout}
              className="flex min-h-[52px] w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-rose-200 transition-all hover:bg-rose-500/10 hover:text-rose-100 active:scale-[0.99] active:bg-rose-500/15"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/12 text-rose-200">
                <LogOut className="h-[18px] w-[18px] shrink-0" />
              </span>
              <span className="min-w-0 truncate text-[14px] font-bold leading-tight tracking-[0]">
                {tAuth("logout")}
              </span>
            </button>
          </div>
        </aside>
      </div>

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside
        className={`nav-typography hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40 border-r border-border bg-card print:hidden transition-all duration-300 ease-in-out ${sidebarWidth}`}
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
              <span className="truncate bg-gradient-to-r from-sky-600 via-blue-600 to-blue-700 bg-clip-text text-[15px] font-extrabold leading-tight tracking-[0] text-transparent">
                ContractorOps AI
              </span>
            )}
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {(() => {
            const renderLink = (link: {
              href: string;
              label: string;
              icon: typeof LayoutDashboard;
            }) => {
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
                  className={`flex items-center gap-3 rounded-lg text-[13.5px] font-semibold leading-none tracking-[0] transition-colors ${
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
            };

            return (
              <>
                {renderLink(dashboardLink)}

                {navGroups.map((group) => {
                  const isOpen = openGroups[group.id] ?? true;

                  if (collapsed) {
                    return (
                      <div key={group.id} className="pt-2 mt-2 border-t border-border space-y-1">
                        {group.links.map(renderLink)}
                      </div>
                    );
                  }

                  return (
                    <div key={group.id} className="pt-3 mt-3 border-t border-border">
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between px-3 mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground/60 hover:text-foreground transition-colors"
                      >
                        <span>{group.label}</span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${
                            isOpen ? "" : "-rotate-90"
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="space-y-1">
                          {group.links.map(renderLink)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            );
          })()}
        </nav>

        {/* Bottom section: user info, settings, collapse toggle */}
        <div className="shrink-0 border-t border-border">
          {/* Company / user */}
          {!collapsed && (
            <div className="px-4 py-3 border-b border-border">
              <p className="truncate text-xs font-bold text-foreground">
                {companyName}
              </p>
              {user.contractor_profile?.company_name && user.email && (
                <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
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
                className={`mx-2 my-1.5 flex items-center gap-3 rounded-lg text-[13.5px] font-semibold leading-none tracking-[0] transition-colors ${
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
            className={`mx-0 flex w-full items-center gap-3 border-t border-border px-2 py-3 text-[13.5px] font-semibold leading-none tracking-[0] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
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
