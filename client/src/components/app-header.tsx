import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ClipboardList, Plus, User } from "lucide-react";

interface AppHeaderProps {
  onCreateSurvey: () => void;
}

export function AppHeader({ onCreateSurvey }: AppHeaderProps) {
  const [location] = useLocation();

  const navItems = [
    { key: "dashboard", label: "Dashboard", href: "/" },
    { key: "surveys", label: "Surveys", href: "/surveys" },
    { key: "reports", label: "Reports", href: "/reports" },
    { key: "field-tools", label: "Field Tools", href: "/field-tools" },
    { key: "templates", label: "Templates", href: "/templates" },
    { key: "settings", label: "Settings", href: "/settings" },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ClipboardList className="text-primary text-2xl" data-testid="app-logo" />
              <h1 className="text-xl font-semibold text-gray-900" data-testid="app-title">
                SiteSurvey Pro
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
                      : "text-gray-500 hover:text-gray-700"
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
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
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
              <DropdownMenuContent align="end">
                <DropdownMenuItem data-testid="menu-profile">Profile</DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-settings">Settings</DropdownMenuItem>
                <DropdownMenuItem data-testid="menu-logout">Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
