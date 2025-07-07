import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";

// Public pages
import Home from "@/pages/home";
import Search from "@/pages/search";
import BusinessMicrosite from "@/pages/business-microsite";

// Auth pages
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";

// Dashboard pages
import Dashboard from "@/pages/dashboard/index";
import Appointments from "@/pages/dashboard/appointments";
import Clients from "@/pages/dashboard/clients";
import Services from "@/pages/dashboard/services";
import Analytics from "@/pages/dashboard/analytics";
import Settings from "@/pages/dashboard/settings";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/buscar" component={Search} />
      <Route path="/negocio/:slug" component={BusinessMicrosite} />
      
      {/* Auth routes */}
      <Route path="/login" component={Login} />
      <Route path="/registro" component={Register} />
      
      {/* Dashboard routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/citas" component={Appointments} />
      <Route path="/dashboard/clientes" component={Clients} />
      <Route path="/dashboard/servicios" component={Services} />
      <Route path="/dashboard/analytics" component={Analytics} />
      <Route path="/dashboard/configuracion" component={Settings} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
