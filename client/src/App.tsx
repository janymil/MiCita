import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { MicrositeThemeProvider } from "@/contexts/MicrositeThemeContext";
import NotFound from "@/pages/not-found";
import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { ProtectedRoute } from "@/components/protected-route";

// Public pages
import BusinessLandingPage from "@/pages/business-landing";
import BusinessMicrosite from "@/pages/business-microsite";

// Auth pages
import AuthCallback from "@/pages/auth/callback";
import ForgotPassword from "@/pages/auth/forgot-password";
import Login from "@/pages/auth/login";
import OtpLogin from "@/pages/auth/otp-login";
import Register from "@/pages/auth/register";
import ResetPassword from "@/pages/auth/reset-password";
import VerifyEmail from "@/pages/auth/verify-email";

// Dashboard pages
import Analytics from "@/pages/dashboard/analytics";
import Appointments from "@/pages/dashboard/appointments";
import Calendar from "@/pages/dashboard/calendar";
import Clients from "@/pages/dashboard/clients";
import CreateBusiness from "@/pages/dashboard/create-business";
import Finanzas from "@/pages/dashboard/finanzas";
import Dashboard from "@/pages/dashboard/index";
import MicrositioBuilder from "@/pages/dashboard/micrositio";
import Reviews from "@/pages/dashboard/reviews";
import Services from "@/pages/dashboard/services";
import Settings from "@/pages/dashboard/settings";
import Documentation from "@/pages/documentation";
import Networking from "@/pages/networking";

// Admin pages
import AdminScrapingPage from "@/pages/admin-scraping";
import AdminBusinesses from "@/pages/admin/businesses";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminLogin from "@/pages/admin/login";
import AdminOpenStreetBusinesses from "@/pages/admin/openstreet-businesses";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={BusinessLandingPage} />
      <Route path="/business" component={BusinessLandingPage} />

      {/* Auth routes */}
      <Route path="/login" component={Login} />
      <Route path="/registro" component={Register} />
      <Route path="/otp" component={OtpLogin} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/auth/callback" component={AuthCallback} />

      {/* Dashboard routes (authenticated) */}
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/citas">
        <ProtectedRoute>
          <Appointments />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/calendario">
        <ProtectedRoute>
          <Calendar />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/clientes">
        <ProtectedRoute>
          <Clients />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/servicios">
        <ProtectedRoute>
          <Services />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/resenas">
        <ProtectedRoute>
          <Reviews />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/analytics">
        <ProtectedRoute>
          <Analytics />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/finanzas">
        <ProtectedRoute>
          <Finanzas />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/configuracion">
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/create-business">
        <ProtectedRoute>
          <CreateBusiness />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/micrositio">
        <ProtectedRoute>
          <MicrositioBuilder />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard/networking">
        <ProtectedRoute>
          <Networking />
        </ProtectedRoute>
      </Route>

      {/* Documentation route */}
      <Route path="/documentation" component={Documentation} />

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
          <MicrositeThemeProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </MicrositeThemeProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
