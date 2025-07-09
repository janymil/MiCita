import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Package, 
  BarChart3, 
  Settings, 
  LogOut,
  Search,
  DollarSign,
  Network
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Citas", href: "/dashboard/citas", icon: Calendar },
  { name: "Calendario", href: "/dashboard/calendario", icon: Calendar },
  { name: "Clientes", href: "/dashboard/clientes", icon: Users },
  { name: "Servicios", href: "/dashboard/servicios", icon: Package },
  { name: "Finanzas", href: "/dashboard/finanzas", icon: DollarSign },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Networking", href: "/dashboard/networking", icon: Network },
  { name: "Configuración", href: "/dashboard/configuracion", icon: Settings },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto shadow-lg">
          <div className="flex items-center flex-shrink-0 px-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 peru-gradient rounded-lg flex items-center justify-center">
                <Search className="text-white w-4 h-4" />
              </div>
              <span className="text-xl font-bold text-gray-900">Mi Cita</span>
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
                        ? "bg-red-100 text-red-900"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}>
                      <item.icon className={cn(
                        "mr-3 h-5 w-5 flex-shrink-0",
                        isActive ? "text-red-500" : "text-gray-400 group-hover:text-gray-500"
                      )} />
                      {item.name}
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <div className="flex-shrink-0 w-full group block">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="inline-block h-8 w-8 rounded-full bg-red-600 flex items-center justify-center">
                    <span className="text-sm font-medium leading-none text-white">
                      {user?.name.charAt(0)}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {user?.name}
                    </p>
                    <p className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                      Ver perfil
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
