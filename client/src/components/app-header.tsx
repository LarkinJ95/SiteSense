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
import { ClipboardList, Plus, User, Settings, LogOut, UserCircle, Shield, Cloud, Sun, CloudRain, Wind } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";

interface AppHeaderProps {
  onCreateSurvey: () => void;
}

export function AppHeader({ onCreateSurvey }: AppHeaderProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: session, isPending } = authClient.useSession();
  const [weatherPreview, setWeatherPreview] = useState<{
    conditions: string;
    high: number | null;
    low: number | null;
  } | null>(null);
  const [now, setNow] = useState(() => new Date());
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

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let isActive = true;

    const getCoords = async () => {
      const stored = localStorage.getItem("last-weather-coords");
      if (stored) {
        try {
          return JSON.parse(stored) as { lat: number; lon: number };
        } catch {
          // ignore parse errors
        }
      }
      if (!navigator.geolocation) return null;
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            maximumAge: 5 * 60 * 1000,
            timeout: 8000,
          });
        });
        return { lat: position.coords.latitude, lon: position.coords.longitude };
      } catch {
        return null;
      }
    };

    const loadWeatherPreview = async () => {
      const coords = await getCoords();
      if (!coords) return;
      try {
        const [currentResponse, forecastResponse] = await Promise.all([
          fetch(`/api/weather/current?lat=${encodeURIComponent(coords.lat)}&lon=${encodeURIComponent(coords.lon)}`),
          fetch(`/api/weather/forecast?lat=${encodeURIComponent(coords.lat)}&lon=${encodeURIComponent(coords.lon)}`),
        ]);
        if (!currentResponse.ok || !forecastResponse.ok) return;
        const current = await currentResponse.json();
        const forecast = await forecastResponse.json();
        const todayKey = new Date().toDateString();
        const temps = Array.isArray(forecast?.list)
          ? forecast.list
              .filter((item: any) => new Date(item.dt * 1000).toDateString() === todayKey)
              .map((item: any) => Number(item?.main?.temp))
              .filter((value: number) => Number.isFinite(value))
          : [];
        const high = temps.length ? Math.round(Math.max(...temps)) : null;
        const low = temps.length ? Math.round(Math.min(...temps)) : null;
        const conditions = current?.weather?.[0]?.main || "Unknown";
        if (isActive) {
          setWeatherPreview({ conditions, high, low });
        }
      } catch {
        // ignore weather errors in header preview
      }
    };

    loadWeatherPreview();
    const interval = window.setInterval(loadWeatherPreview, 30 * 60 * 1000);
    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, []);

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
              <ClipboardList className="text-primary text-2xl" data-testid="app-logo" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100" data-testid="app-title">
                AbateIQ
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <Link href="/login">
                <Button variant="ghost" className="text-sm">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button className="text-sm">Create account</Button>
              </Link>
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
              <ClipboardList className="text-primary text-2xl" data-testid="app-logo" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100" data-testid="app-title">
                AbateIQ
              </h1>
            </div>
            <div className="hidden md:flex items-center space-x-6 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-2">
                {weatherPreview ? (
                  <>
                    {getWeatherIcon(weatherPreview.conditions)}
                    <span className="font-medium">{weatherPreview.conditions}</span>
                    <span>
                      {weatherPreview.high ?? "--"}° / {weatherPreview.low ?? "--"}°
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
