import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { captureInviteCodeFromLocation } from "@/lib/inviteLink";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Privacy from "./pages/Privacy.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import AuthUpdatePassword from "./pages/AuthUpdatePassword.tsx";
import RecoveryRouter from "./components/RecoveryRouter";

// Persist invite from shared links before React mounts screens.
captureInviteCodeFromLocation();

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <RecoveryRouter />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/join" element={<Index />} />
          <Route path="/join/:code" element={<Index />} />
          <Route path="/personvern" element={<Privacy />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/update-password" element={<AuthUpdatePassword />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

