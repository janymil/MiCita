import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import NotFound from "@/pages/not-found";

// Public pages
import Home from "@/pages/home";
import PublicSearchPage from "@/pages/public-search";
import BusinessLandingPage from "@/pages/business-landing";
import Search from "@/pages/search";
import BusinessMicrosite from "@/pages/business-microsite";

// Auth pages
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";

// Dashboard pages
import Dashboard from "@/pages/dashboard/index";
import Appointments from "@/pages/dashboard/appointments";
import Calendar from "@/pages/dashboard/calendar";
import Clients from "@/pages/dashboard/clients";
import Services from "@/pages/dashboard/services";
import Analytics from "@/pages/dashboard/analytics";
import Finanzas from "@/pages/dashboard/finanzas";
import Settings from "@/pages/dashboard/settings";
import MicrositioBuilder from "@/pages/dashboard/micrositio";
import Networking from "@/pages/networking";

// Admin pages
import AdminLogin from "@/pages/admin/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminBusinesses from "@/pages/admin/businesses";
import AdminOpenStreetBusinesses from "@/pages/admin/openstreet-businesses";
import AdminScrapingPage from "@/pages/admin-scraping";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/business" component={BusinessLandingPage} />
      <Route path="/buscar" component={Search} />

      {/* Auth routes */}
      <Route path="/login" component={Login} />
      <Route path="/registro" component={Register} />

      {/* Dashboard routes */}
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/dashboard/citas" component={Appointments} />
      <Route path="/dashboard/calendario" component={Calendar} />
      <Route path="/dashboard/clientes" component={Clients} />
      <Route path="/dashboard/servicios" component={Services} />
      <Route path="/dashboard/analytics" component={Analytics} />
      <Route path="/dashboard/finanzas" component={Finanzas} />
      <Route path="/dashboard/configuracion" component={Settings} />
      <Route path="/dashboard/networking" component={Networking} />

      {/* Admin routes */}
      <Route path="/admin" component={AdminLogin} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/businesses" component={AdminBusinesses} />
      <Route path="/admin/openstreet-businesses" component={AdminOpenStreetBusinesses} />
      <Route path="/admin/scraping" component={AdminScrapingPage} />

      {/* Business micrositio route - catch-all for business slugs */}
      <Route path="/:slug" component={BusinessMicrosite} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;