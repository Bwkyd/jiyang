"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Menu, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";

interface HeaderProps {
  userName: string;
  userRole: string;
}

export function Header({ userName, userRole }: HeaderProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  return (
    <header className="h-14 border-b flex items-center justify-between px-4 bg-background sticky top-0 z-10">
      <div className="flex items-center gap-2">
        {/* Mobile menu */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <SheetContent side="left" className="p-0 w-56">
            <Sidebar userRole={userRole} />
          </SheetContent>
        </Sheet>
      </div>

      {/* User menu - simple custom dropdown */}
      <div className="relative" ref={menuRef}>
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm hidden sm:inline">{userName}</span>
        </Button>

        {userMenuOpen && (
          <div className="absolute right-0 mt-2 w-40 bg-background border rounded-md shadow-lg py-1 z-50">
            <div className="px-3 py-2 text-xs text-muted-foreground border-b">
              {userRole === "admin" ? "管理员" : "商务"}
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start px-3 py-2 h-auto text-sm"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
