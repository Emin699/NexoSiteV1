import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";

// Pages
import Home from "@/pages/home";
import Cart from "@/pages/cart";
import Wallet from "@/pages/wallet";
import Profile from "@/pages/profile";
import Wheel from "@/pages/wheel";
import Loyalty from "@/pages/loyalty";
import Jackpot from "@/pages/jackpot";
import Tiers from "@/pages/tiers";
import Referral from "@/pages/referral";
import Admin from "@/pages/admin";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppContent() {
  const { isReady, isAuthenticated, handleAuth } = useAuth();

  if (!isReady) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background text-foreground">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
          <p className="font-mono text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthPage onAuth={handleAuth} />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/cart" component={Cart} />
        <Route path="/wallet" component={Wallet} />
        <Route path="/profile" component={Profile} />
        <Route path="/wheel" component={Wheel} />
        <Route path="/loyalty" component={Loyalty} />
        <Route path="/jackpot" component={Jackpot} />
        <Route path="/tiers" component={Tiers} />
        <Route path="/referral" component={Referral} />
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppContent />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
