import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ClipboardList, Plus, User, Settings, LogOut, UserCircle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AppHeaderProps {
  onCreateSurvey: () => void;
}

export function AppHeader({ onCreateSurvey }: AppHeaderProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    // Clear authentication tokens
    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");
    
    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });
    
    // Redirect to login page
    setLocation("/login");
  };

  const handleProfileClick = () => {
    setLocation("/profile");
  };

  const handleSettingsClick = () => {
    setLocation("/settings");
  };

  const handleAdminClick = () => {
    setLocation("/admin");
  };

  // Check if user is admin (in real app, get from auth context)
  const userRole = localStorage.getItem("userRole");
  const isAdmin = userRole === "admin";

  const navItems = [
    { key: "dashboard", label: "Dashboard", href: "/" },
    { key: "surveys", label: "Surveys", href: "/surveys" },
    { key: "air-monitoring", label: "Air Monitoring", href: "/air-monitoring" },
    { key: "reports", label: "Reports", href: "/reports" },
    { key: "field-tools", label: "Field Tools", href: "/field-tools" },
    { key: "templates", label: "Templates", href: "/templates" },
    { key: "settings", label: "Settings", href: "/settings" },
  ];

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ClipboardList className="text-primary text-2xl" data-testid="app-logo" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100" data-testid="app-title">
                SiteSense
              </h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`pb-4 px-1 text-sm font-medium transition-colors ${
                    location === item.href || (item.href === "/" && location === "/")
                      ? "text-primary border-b-2 border-primary"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                  data-testid={`nav-${item.key}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              onClick={onCreateSurvey}
              className="bg-primary text-white hover:bg-blue-700"
              data-testid="button-create-survey"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Survey
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                  data-testid="button-user-menu"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm font-medium">John Inspector</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={handleProfileClick} data-testid="menu-profile">
                  <UserCircle className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSettingsClick} data-testid="menu-settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={handleAdminClick} data-testid="menu-admin">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} data-testid="menu-logout" className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
