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
import { User, Settings, LogOut, UserCircle, Shield, Wrench, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { BrandMark } from "@/components/brand-mark";

export function AppHeader() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: session, isPending } = authClient.useSession();
  const { data: me } = useQuery({
    queryKey: ["/api/me"],
    enabled: !!session,
  });
  const { data: profile } = useQuery({
    queryKey: ["/api/user/profile"],
    enabled: !!session,
  });
  const profileName =
    profile && typeof profile === "object"
      ? `${(profile as any).firstName || ""} ${(profile as any).lastName || ""}`.trim()
      : "";
  const displayName =
    profileName ||
    session?.user?.name ||
    session?.user?.email ||
    "User";

  const handleLogout = async () => {
    try {
      await authClient.signOut();
    } catch (error) {
      console.error("Failed to sign out:", error);
    }

    localStorage.removeItem("authToken");
    localStorage.removeItem("userRole");

    toast({
      title: "Logged out",
      description: "You have been logged out successfully.",
    });

    setLocation("/login");
  };

  const handleProfileClick = () => {
    setLocation("/profile");
  };

  const handleSettingsClick = () => {
    setLocation("/settings");
  };

  const handleEquipmentClick = () => {
    setLocation("/equipment");
  };

  const handlePersonnelClick = () => {
    setLocation("/personnel");
  };

  const handleAdminClick = () => {
    setLocation("/admin");
  };

  const isAdmin = Boolean(me && typeof me === "object" && (me as any).isAdmin);

  const navItems = [
    { key: "dashboard", label: "Dashboard", href: "/" },
    { key: "surveys", label: "Surveys", href: "/surveys" },
    { key: "air-monitoring", label: "Air Monitoring", href: "/air-monitoring" },
    { key: "field-tools", label: "Field Tools", href: "/field-tools" },
    { key: "templates", label: "Templates", href: "/templates" },
  ];

  if (!session && !isPending) {
    return (
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <BrandMark className="h-7 w-auto" title="AbateIQ" />
            </div>
            <div className="flex items-center space-x-2">
              <a href="/login">
                <Button variant="ghost" className="text-sm">Sign in</Button>
              </a>
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[auto,1fr,auto] items-center h-16 gap-4">
          <div className="flex items-center gap-2">
            <BrandMark className="h-7 w-auto" title="AbateIQ" />
          </div>

          <nav className="hidden md:flex items-center justify-evenly gap-2 min-w-0">
            {navItems.map((item) => {
              const active = location === item.href || (item.href === "/" && location === "/");
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex-1 h-16 px-3 flex items-center justify-center text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                    active
                      ? "text-primary border-primary"
                      : "text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                  data-testid={`nav-${item.key}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4 justify-self-end">
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
                  <span className="hidden md:block text-sm font-medium">{displayName}</span>
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
                <DropdownMenuItem onClick={handleEquipmentClick} data-testid="menu-equipment">
                  <Wrench className="mr-2 h-4 w-4" />
                  Equipment
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePersonnelClick} data-testid="menu-personnel">
                  <Users className="mr-2 h-4 w-4" />
                  Personnel
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
