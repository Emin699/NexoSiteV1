import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { Layout } from "@/components/layout";

// Pages
import Home from "@/pages/home";
import ProductDetail from "@/pages/product-detail";
import Cart from "@/pages/cart";
import Wallet from "@/pages/wallet";
import Profile from "@/pages/profile";
import Wheel from "@/pages/wheel";
import Loyalty from "@/pages/loyalty";
import Jackpot from "@/pages/jackpot";
import Tiers from "@/pages/tiers";
import Referral from "@/pages/referral";
import ReviewsPage from "@/pages/reviews";
import OrdersPage from "@/pages/orders";
import Admin from "@/pages/admin";
import AuthPage from "@/pages/auth";
import Support from "@/pages/support";
import SupportTicketDetail from "@/pages/support-ticket";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppContent() {
  const { isReady, handleAuth } = useAuth();

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

  return (
    <Switch>
      {/* Auth page is the only route rendered outside the main layout. */}
      <Route path="/auth">
        <AuthPage onAuth={handleAuth} />
      </Route>
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/product/:id" component={ProductDetail} />
            <Route path="/cart" component={Cart} />
            <Route path="/wallet" component={Wallet} />
            <Route path="/profile" component={Profile} />
            <Route path="/wheel" component={Wheel} />
            <Route path="/loyalty" component={Loyalty} />
            <Route path="/jackpot" component={Jackpot} />
            <Route path="/tiers" component={Tiers} />
            <Route path="/referral" component={Referral} />
            <Route path="/reviews" component={ReviewsPage} />
            <Route path="/orders" component={OrdersPage} />
            <Route path="/support" component={Support} />
            <Route path="/support/:id" component={SupportTicketDetail} />
            <Route path="/admin" component={Admin} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
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
        <SonnerToaster
          position="top-center"
          theme="dark"
          richColors
          closeButton
          duration={3500}
          expand
          toastOptions={{
            style: {
              background: "rgba(17, 20, 32, 0.95)",
              border: "1px solid rgba(139, 92, 246, 0.35)",
              color: "#f4f4f5",
              backdropFilter: "blur(12px)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(139, 92, 246, 0.15)",
              fontWeight: 500,
            },
            className: "font-sans",
          }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
