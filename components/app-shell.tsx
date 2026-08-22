"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  FileText,
  Package,
  FolderOpen,
  MessageSquare,
  Users,
  Settings,
  Shield,
  Menu,
  X,
  LogOut,
  Bell,
  Building2,
  Scale,
  FileSpreadsheet,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

interface AppShellProps {
  session: any;
  children: React.ReactNode;
}

export default function AppShell({ session, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const user = session?.user;
  const isAdmin = user?.role === "admin";

  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });
  const userType = user?.userType ?? profile?.userType;
  const roleLabel = isAdmin ? "Admin" : userType === "vendor" ? "Supplier" : userType === "company" ? "Company" : "Business";

  const { data: unreadData } = useQuery({
    queryKey: ["messages", "unread"],
    queryFn: () => fetch("/api/messages/unread").then((r) => r.json()),
    enabled: !!session,
    refetchInterval: 30000,
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
    enabled: !!session,
    refetchInterval: 30000,
  });

  const unreadMessagesCount = unreadData?.count ?? 0;
  const unreadNotificationsCount = Array.isArray(notifData)
    ? notifData.filter((n: any) => !n.isRead).length
    : 0;

  type MenuItem = { label: string; href: string; icon: React.ElementType; badge?: number };
  const menuItems: MenuItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Tenders", href: "/tenders", icon: FileText },
    { label: "Bids", href: "/bids", icon: Package },
  ];
  if (userType !== "vendor") {
    menuItems.push({ label: "Comparison of Bids", href: "/comparisons", icon: Scale });
    menuItems.push({ label: "Offline Bids", href: "/offline-bids", icon: FileSpreadsheet });
  }
  menuItems.push(
    { label: "Documents", href: "/documents", icon: FolderOpen },
    { label: "Messages", href: "/messages", icon: MessageSquare, badge: unreadMessagesCount },
  );

  if (userType !== "vendor") {
    menuItems.push({ label: "Suppliers", href: "/vendors", icon: Users });
  }
  if (userType !== "company") {
    menuItems.push({ label: "Companies", href: "/companies", icon: Building2 });
  }

  if (isAdmin) {
    menuItems.push({ label: "Global Masters", href: "/admin/masters", icon: Shield });
    menuItems.push({ label: "Admin Panel", href: "/admin", icon: Shield });
  }

  const secondaryMenuItems = [{ label: "Settings", href: "/settings", icon: Settings }];

  function getPageTitle() {
    const ranked = [...menuItems, ...secondaryMenuItems]
      .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
      .sort((a, b) => b.href.length - a.href.length);
    return ranked[0]?.label ?? "ProSource";
  }

  const handleSignOut = () => {
    signOut({ callbackUrl: "/login" });
  };

  const navLinkClass = (isActive: boolean) =>
    `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative overflow-hidden ${
      isActive
        ? "bg-primary/10 text-primary shadow-[0_0_18px_-6px_rgba(200,90,58,0.35)]"
        : "text-muted-foreground hover:text-foreground hover:bg-accent"
    }`;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/80 backdrop-blur-xl print:hidden">
        {/* Brand */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-border">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-primary-foreground text-sm font-bold">PS</span>
          </div>
          <span className="font-bold text-lg tracking-tight font-[family-name:var(--font-heading)]">ProSource</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.label} href={item.href} className={navLinkClass(isActive)}>
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />}
                <item.icon className={`h-4 w-4 transition-transform duration-200 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground group-hover:scale-110"}`} />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <Separator className="my-4" />

          {secondaryMenuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link key={item.label} href={item.href} className={navLinkClass(isActive)}>
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />}
                <item.icon className={`h-4 w-4 transition-transform duration-200 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground group-hover:scale-110"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div className="p-4 border-t border-border flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{user?.displayName?.[0] ?? user?.username?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{user?.displayName ?? user?.username}</div>
            <div className="text-xs text-muted-foreground truncate uppercase font-semibold tracking-wider">{roleLabel}</div>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0 rounded-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* Mobile drawer backdrop */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden print:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-out md:hidden print:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground text-sm font-bold">PS</span>
            </div>
            <span className="font-bold text-lg tracking-tight font-[family-name:var(--font-heading)]">ProSource</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} className="rounded-full">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={navLinkClass(isActive)}
              >
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />}
                <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <Separator className="my-4" />

          {secondaryMenuItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={navLinkClass(isActive)}
              >
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary" />}
                <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{user?.displayName?.[0] ?? user?.username?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold truncate">{user?.displayName ?? user?.username}</div>
            <div className="text-xs text-muted-foreground truncate uppercase font-semibold tracking-wider">{roleLabel}</div>
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive shrink-0 rounded-full" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-border bg-card/70 backdrop-blur-xl z-10 print:hidden sticky top-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="md:hidden rounded-full" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden sm:flex flex-col">
              <h2 className="text-lg font-bold text-foreground font-[family-name:var(--font-heading)] leading-tight">{getPageTitle()}</h2>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Procurement Platform</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notification Badge */}
            <Link
              href="/dashboard"
              className="relative p-2 rounded-full hover:bg-accent text-muted-foreground transition-all duration-200 hover:text-foreground"
            >
              <Bell className="h-5 w-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full ring-2 ring-card animate-glow-pulse" />
              )}
            </Link>

            <Separator orientation="vertical" className="h-6 mx-1" />

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-3 py-1 rounded-full uppercase tracking-wider">
                {roleLabel}
              </span>
            </div>
          </div>
        </header>

        {/* Page children container */}
        <main className="flex-1 p-6 overflow-y-auto max-w-7xl w-full mx-auto print:p-0 print:max-w-none print:overflow-visible">{children}</main>
      </div>
    </div>
  );
}
