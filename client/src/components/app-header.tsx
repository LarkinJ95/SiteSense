import { useEffect, useState } from "react";
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
import { ClipboardList, Plus, User, Settings, LogOut, UserCircle, Shield, Cloud, Sun, CloudRain, Wind, Droplets, Thermometer, Wrench, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { useWeather } from "@/hooks/use-weather";
import { BrandMark } from "@/components/brand-mark";

interface AppHeaderProps {
  onCreateSurvey: () => void;
}

export function AppHeader({ onCreateSurvey }: AppHeaderProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: session, isPending } = authClient.useSession();
  const { weather, getCurrentWeather } = useWeather();
  const [now, setNow] = useState(() => new Date());
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("last-weather-coords");
    if (stored) {
      try {
        const coords = JSON.parse(stored) as { lat: number; lon: number };
        if (typeof coords?.lat === "number" && typeof coords?.lon === "number") {
          getCurrentWeather(coords.lat, coords.lon);
          return;
        }
      } catch {
        // ignore parse errors
      }
    }
    getCurrentWeather();
  }, [getCurrentWeather]);

  const getWeatherIcon = (conditions: string) => {
    const normalized = conditions.toLowerCase();
    if (normalized.includes("rain") || normalized.includes("shower") || normalized.includes("drizzle")) {
      return <CloudRain className="h-4 w-4 text-blue-500" />;
    }
    if (normalized.includes("wind")) {
      return <Wind className="h-4 w-4 text-gray-500" />;
    }
    if (normalized.includes("clear") || normalized.includes("sun")) {
      return <Sun className="h-4 w-4 text-yellow-500" />;
    }
    return <Cloud className="h-4 w-4 text-gray-400" />;
  };

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
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BrandMark className="h-7 w-auto" title="AbateIQ" />
            </div>
            <div className="hidden md:flex items-center space-x-6 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-2">
                {weather ? (
                  <>
                    {getWeatherIcon(weather.conditions)}
                    <span className="font-medium">{weather.conditions}</span>
                    <span className="flex items-center gap-1">
                      <Thermometer className="h-3 w-3 text-red-400" />
                      {weather.temperature}°F
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Droplets className="h-3 w-3 text-blue-400" />
                      {weather.humidity}%
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Wind className="h-3 w-3 text-gray-400" />
                      {weather.windSpeed} mph
                    </span>
                  </>
                ) : (
                  <span className="text-gray-400">Weather unavailable</span>
                )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {now.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                  <span>{now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
                </div>
              </div>
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
