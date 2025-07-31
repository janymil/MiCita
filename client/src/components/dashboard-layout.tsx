import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Calendar,
  DollarSign,
  Eye,
  Globe,
  LayoutDashboard,
  LogOut,
  Moon,
  Network,
  Package,
  Search,
  Settings,
  Star,
  Sun,
  Users
} from "lucide-react";
import { ReactNode } from "react";
import { Link, useLocation } from "wouter";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Citas", href: "/dashboard/citas", icon: Calendar },
  { name: "Calendario", href: "/dashboard/calendario", icon: Calendar },
  { name: "Clientes", href: "/dashboard/clientes", icon: Users },
  { name: "Servicios", href: "/dashboard/servicios", icon: Package },
  { name: "Reseñas", href: "/dashboard/resenas", icon: Star },
  { name: "Finanzas", href: "/dashboard/finanzas", icon: DollarSign },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Networking", href: "/dashboard/networking", icon: Network },
  { name: "Micrositio", href: "/dashboard/micrositio", icon: Globe },
  { name: "Configuración", href: "/dashboard/configuracion", icon: Settings },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  // Fetch business data to get the business name
  const { data: businesses } = useQuery({
    queryKey: ["/api/dashboard/businesses"],
  });

  const currentBusiness = businesses && Array.isArray(businesses) ? businesses[0] : null;
  const businessName = currentBusiness?.name || "Mi Cita";

  // Fetch business settings to get micrositio customUrl and profileImage
  const { data: businessSettings } = useQuery({
    queryKey: [`/api/dashboard/businesses/${currentBusiness?.id}/settings`],
    enabled: Boolean(currentBusiness?.id),
  }) as { data?: { customUrl?: string; profileImage?: string } | undefined };

  // Get today's date and day
  const today = new Date();
  const dayName = today.toLocaleDateString('es-ES', { weekday: 'long' });
  const formattedDate = today.toLocaleDateString('es-ES', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });

  // Helper function to get user initials
  const getUserInitials = () => {
    if (user?.displayName) {
      return user.displayName
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return '?';
  };

  return (
    <div className="flex h-screen theme-bg">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 theme-sidebar overflow-y-auto shadow-lg border-r theme-border">
          <div className="flex items-center flex-shrink-0 px-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 theme-primary rounded-lg flex items-center justify-center">
                <Search className="text-white w-4 h-4" />
              </div>
              <span className="text-xl font-bold">{businessName}</span>
            </Link>
          </div>

          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <div className={cn(
                      "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "theme-nav-active text-white"
                        : "theme-nav-inactive hover:theme-nav-hover"
                    )}>
                      <item.icon className={cn(
                        "mr-3 h-5 w-5 flex-shrink-0",
                        isActive ? "text-white" : "theme-text-secondary group-hover:theme-text-primary"
                      )} />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex-shrink-0 flex border-t theme-border p-4">
            {/* Removed user profile from sidebar - now in header */}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        {/* Enhanced Header */}
        <div className="theme-card border-b theme-border px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - empty for now */}
            <div></div>
            
            {/* Center - Today's date */}
            <div className="text-center">
              <p className="text-sm font-medium theme-text-primary capitalize">
                {dayName}
              </p>
              <p className="text-xs theme-text-secondary">
                {formattedDate}
              </p>
            </div>

            {/* Right side - Profile and Actions */}
            <div className="flex items-center space-x-3">
              {/* Ver Micrositio Button - only show if customUrl exists */}
              {businessSettings?.customUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(`/${businessSettings.customUrl}`, '_blank');
                  }}
                  className="theme-text-secondary hover:theme-text-primary"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Micrositio
                </Button>
              )}

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="theme-text-secondary hover:theme-text-primary"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              {/* User Profile */}
              <div className="flex items-center space-x-3">
                {/* Profile Avatar */}
                <div className="relative">
                  {businessSettings?.profileImage ? (
                    <img
                      src={businessSettings.profileImage}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full theme-primary flex items-center justify-center">
                      <span className="text-sm font-medium leading-none text-white">
                        {getUserInitials()}
                      </span>
                    </div>
                  )}
                </div>

                {/* User Info - Hidden on mobile */}
                <div className="hidden sm:block">
                  <p className="text-sm font-medium theme-text-primary">
                    {user?.displayName || user?.email}
                  </p>
                </div>

                {/* Logout Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="theme-text-secondary hover:theme-text-primary"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none theme-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
