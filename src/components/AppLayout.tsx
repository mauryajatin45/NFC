import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LogOut } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Enroll", href: "/select-order" },
  { label: "Shipments", href: "/shipments" },
  { label: "Settings", href: "/settings" },
  { label: "Help", href: "/help" },
  { label: "Admin Dashboard", href: "/admin/dashboard" },
];

export function AppLayout({ children }: AppLayoutProps) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  // Fixing the 'session' from the user copy-paste to match our 'user' context state
  const { user, logout } = useAuth(); 

  const handleLogout = async () => {
    logout();
    navigate("/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    return parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-foreground border-b border-foreground">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left: Menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                className="w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-colors"
                aria-label="Open menu"
              >
                <Menu size={22} strokeWidth={1.5} className="text-background" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 bg-foreground border-r-0">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <SheetDescription className="sr-only">Main application navigation links</SheetDescription>
              <nav className="flex flex-col h-full">
                {/* Nav Items */}
                <div className="flex-1 pt-6">
                  {navItems.map((item) => {
                    const isActive = location.pathname === item.href || 
                      (item.href === "/select-order" && location.pathname === "/enroll-nfc");
                    return (
                      <Link
                        key={item.href}
                        to={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "block px-5 py-2 text-sm transition-colors",
                          isActive
                            ? "text-background border-l-2 border-background"
                            : "text-background/60 hover:text-background"
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                {/* Avatar at bottom of nav */}
                <div className="border-t border-background/20 p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="w-full flex items-center gap-3 p-2 hover:bg-white/10 transition-colors focus:outline-none">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-background text-foreground text-xs font-medium">
                            {getInitials(user?.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="font-medium text-sm truncate text-background">{user?.name || "User"}</p>
                          <p className="text-xs text-background/60 truncate">{user?.email}</p>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" side="top" className="w-56 bg-background border border-border shadow-lg">
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                        <LogOut size={16} className="mr-2" />
                        Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </nav>
            </SheetContent>
          </Sheet>

          {/* Right: Logo */}
          <Link to="/dashboard">
            <span className="font-logo text-2xl font-semibold tracking-tight text-background">ink.</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer - API Status */}
      <footer className="border-t border-border py-3 px-4 bg-card">
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>API Operational</span>
          </div>
          <span className="text-border">|</span>
          <span>v2.4.1</span>
          <span className="text-border">|</span>
          <a href="#" className="hover:text-foreground transition-colors">Documentation</a>
          <span className="text-border">|</span>
          <a href="mailto:support@ink.com" className="hover:text-foreground transition-colors">support@ink.com</a>
        </div>
      </footer>
    </div>
  );
}
