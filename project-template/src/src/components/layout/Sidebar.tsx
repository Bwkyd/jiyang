"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScanBarcode,
  Package,
  Users,
  Settings,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "工作台", href: "/dashboard", icon: LayoutDashboard },
  { label: "扫码寄样", href: "/samples/new", icon: ScanBarcode },
  { label: "寄样管理", href: "/samples", icon: Package },
  { label: "达人管理", href: "/talents", icon: Users },
  { label: "账号管理", href: "/admin/users", icon: UserCog, adminOnly: true },
  { label: "设置", href: "/settings", icon: Settings, adminOnly: true },
];

export function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname();

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || userRole === "admin"
  );

  // Check if pathname matches the route - use exact match only
  const isActive = (href: string) => {
    // Handle dashboard specially - also match root path
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    // Exact match only - don't match /samples when on /samples/new
    return pathname === href;
  };

  return (
    <aside className="hidden md:flex flex-col w-56 border-r bg-muted/30 h-screen sticky top-0">
      <div className="p-4 border-b">
        <h1 className="font-bold text-lg">样衣管理</h1>
        <p className="text-xs text-muted-foreground">寄样追踪系统</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
