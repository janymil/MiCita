import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/services/ai-assistant";
import { aiAssistant, ChatContext } from "@/services/ai-assistant";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Book,
  Calendar,
  ChevronDown,
  DollarSign,
  Eye,
  Gift,
  Globe,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageCircle,
  Moon,
  Network,
  Package,
  Settings,
  Star,
  Sun,
  Ticket,
  User,
  Users
} from "lucide-react";
import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { MicitaLogo } from "@/components/brand";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: "Hoy", href: "/dashboard/hoy", icon: Home },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Citas", href: "/dashboard/citas", icon: Calendar },
  { name: "Calendario", href: "/dashboard/calendario", icon: Calendar },
  { name: "Clientes", href: "/dashboard/clientes", icon: Users },
  { name: "Servicios", href: "/dashboard/servicios", icon: Package },
  { name: "Reseñas", href: "/dashboard/resenas", icon: Star },
  { name: "Finanzas", href: "/dashboard/finanzas", icon: DollarSign },
  { name: "Promos", href: "/dashboard/promos", icon: Megaphone },
  { name: "Lealtad", href: "/dashboard/loyalty", icon: Gift },
  { name: "Bonos", href: "/dashboard/packages", icon: Ticket },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Networking", href: "/dashboard/networking", icon: Network },
  { name: "Micrositio", href: "/dashboard/micrositio", icon: Globe },
  { name: "Configuración", href: "/dashboard/configuracion", icon: Settings },
];

// Owners live on their phone: the five screens they touch all day get a
// thumb-reachable tab bar. Everything else stays in the desktop sidebar.
const mobileNavigation = [
  "/dashboard/hoy",
  "/dashboard/citas",
  "/dashboard/clientes",
  "/dashboard/finanzas",
  "/dashboard/servicios",
]
  .map((href) => navigation.find((item) => item.href === href))
  .filter((item): item is (typeof navigation)[number] => Boolean(item));

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme, setIsDashboard, currentTheme } = useTheme();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Set dashboard context when component mounts
  useEffect(() => {
    setIsDashboard(true);
    return () => setIsDashboard(false);
  }, [setIsDashboard]);

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
    if (user?.name) {
      return user.name
        .split(' ')
        .map((name) => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return '?';
  };

  // Handle AI chat
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsLoading(true);

    try {
      // Prepare context for AI
      const context: ChatContext = {
        userId: String(user?.id ?? ''),
        businessId: currentBusiness?.id,
        userDisplayName: user?.name || user?.email || 'Usuario',
        businessName: currentBusiness?.name || businessName
      };

      // Get AI response
      const aiResponse = await aiAssistant.sendMessage(
        userMessage.content,
        context,
        chatMessages
      );

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu consulta. Por favor, intenta de nuevo.',
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen theme-bg">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 theme-sidebar overflow-y-auto shadow-lg border-r theme-border">
          <div className="flex items-center flex-shrink-0 px-4 pt-2">
            <MicitaLogo href="/" size="sm" showTagline />
          </div>

          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <div className={cn(
                      "group flex items-center px-3 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                      isActive
                        ? "theme-nav-active text-white shadow-brand"
                        : "theme-nav-inactive hover:theme-nav-hover hover:translate-x-0.5"
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

            {/* Right side - AI Chat, Profile and Actions */}
            <div className="flex items-center space-x-3">
              {/* AI Chat Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChatOpen(!isChatOpen)}
                className="theme-text-secondary hover:theme-text-primary relative"
                title="Asistente AI"
              >
                <MessageCircle className="h-5 w-5" />
                {chatMessages.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                )}
              </Button>

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

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 px-3 py-2">
                    {/* Profile Avatar */}
                    <div className="flex items-center space-x-2">
                      {businessSettings?.profileImage ? (
                        <img
                          src={businessSettings.profileImage}
                          alt="Profile"
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full theme-primary flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {getUserInitials()}
                          </span>
                        </div>
                      )}
                      <span className="hidden sm:block text-sm font-medium theme-text-primary">
                        {user?.name || user?.email}
                      </span>
                      <ChevronDown className="h-4 w-4 theme-text-secondary" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/configuracion" className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      Mi Perfil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/configuracion" className="flex items-center">
                      <Settings className="h-4 w-4 mr-2" />
                      Configuración
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/documentation" className="flex items-center">
                      <Book className="h-4 w-4 mr-2" />
                      Documentación y Ayuda
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logout();
                      window.location.href = "/login";
                    }}
                    className="flex items-center text-red-600 focus:text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Cerrar Sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none theme-bg pb-16 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom tabs */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t theme-border theme-card">
          <div className="grid grid-cols-5">
            {mobileNavigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
                      isActive ? "theme-text-primary" : "theme-text-secondary",
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* AI Chat Interface */}
        {isChatOpen && (
          <div className="fixed bottom-4 right-4 w-96 h-96 theme-card border theme-border rounded-lg shadow-2xl z-50 flex flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b theme-border">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 theme-primary" />
                <h3 className="font-semibold theme-text-primary">Asistente AI</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChatOpen(false)}
                className="theme-text-secondary hover:theme-text-primary"
              >
                ×
              </Button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center theme-text-secondary text-sm">
                  <p className="font-medium mb-2">¡Hola! Soy tu asistente AI de MiCita.</p>
                  <p className="mb-3">Puedo ayudarte con:</p>
                  <ul className="mt-2 text-left space-y-1">
                    <li>• Uso y navegación de la plataforma</li>
                    <li>• Consultas sobre tus datos de negocio</li>
                    <li>• Reportes financieros y análisis</li>
                    <li>• Configuración de funciones</li>
                    <li>• Resolución de dudas generales</li>
                  </ul>
                  <p className="mt-3 text-xs opacity-75">
                    Pregúntame cualquier cosa sobre tu negocio o la aplicación
                  </p>
                </div>
              ) : (
                chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "p-3 rounded-lg max-w-[85%]",
                      message.role === 'user'
                        ? "ml-auto theme-primary text-white"
                        : "mr-auto theme-secondary"
                    )}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex items-center space-x-2 theme-text-secondary">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span className="text-sm">Pensando...</span>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t theme-border">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Escribe tu pregunta..."
                  className="flex-1 px-3 py-2 border theme-border rounded-md theme-bg theme-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isLoading}
                  size="sm"
                >
                  Enviar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
