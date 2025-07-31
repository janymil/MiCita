import { QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import { queryClient } from "./lib/queryClient";

// Public pages
import Home from "./pages/Home";
import Search from "./pages/Search";
import BusinessMicrosite from "./pages/BusinessMicrosite";
import NotFound from "./pages/NotFound";

// UI providers
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/buscar" component={Search} />
      
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
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;