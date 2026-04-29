import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { hasAuthToken } from "@/hooks/use-auth";
import {
  useGetWallet,
  useGetTransactions,
  useInitiateCryptoRecharge,
  useGetPendingCryptoRecharges,
  useCancelPendingCryptoRecharge,
  useGetPaypalConfig,
  useCreatePaypalOrder,
  useCapturePaypalOrder,
  useGetStripeConfig,
  useCreateStripeIntent,
  useConfirmStripeIntent,
  useGetSumupConfig,
  useInitiateSumupCheckout,
  useConfirmSumupCheckout,
  getGetWalletQueryKey,
  getGetMeQueryKey,
  getGetTransactionsQueryKey,
  getGetPendingCryptoRechargesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { loadStripe, type Stripe as StripeJS } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Wallet as WalletIcon,
  Coins,
  History,
  ArrowDownToLine,
  ArrowUpRight,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  Clock,
  XCircle,
  Send,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";

const RECHARGE_AMOUNTS = [5, 10, 20, 30, 50];
const SHOW_STRIPE = false; // Basculer à true pour réactiver Stripe

export default function Wallet() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!hasAuthToken()) setLocation("/auth");
  }, [setLocation]);
  if (!hasAuthToken()) return null;

  const queryClient = useQueryClient();
  // Auto-refresh while a recharge session is active so the user sees the
  // crediting happen as soon as the watcher detects the on-chain payment.
  const [hasActiveRecharge, setHasActiveRecharge] = useState(false);
  const refetchOpts = hasActiveRecharge
    ? { query: { refetchInterval: 15_000 as const } }
    : undefined;
  const { data: wallet, isLoading: isLoadingWallet } = useGetWallet(refetchOpts);
  const { data: transactions, isLoading: isLoadingTx } = useGetTransactions(refetchOpts);
  const { data: pending } = useGetPendingCryptoRecharges(refetchOpts);
  const { data: paypalConfig } = useGetPaypalConfig();
  const { data: stripeConfig } = useGetStripeConfig();

  const initiateCrypto = useInitiateCryptoRecharge();
  const cancelPending = useCancelPendingCryptoRecharge();
  const createPaypal = useCreatePaypalOrder();
  const capturePaypal = useCapturePaypalOrder();
  const createStripe = useCreateStripeIntent();

  const { data: sumupConfig } = useGetSumupConfig();
  const initiateSumup = useInitiateSumupCheckout();
  const confirmSumup = useConfirmSumupCheckout();

  const [selectedMode, setSelectedMode] = useState<number | "custom">(10);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [paypalMode, setPaypalMode] = useState<number | "custom">(10);
  const [paypalCustomAmount, setPaypalCustomAmount] = useState<string>("");
  const [stripeMode, setStripeMode] = useState<number | "custom">(10);
  const [stripeCustomAmount, setStripeCustomAmount] = useState<string>("");
  const [stripeIntent, setStripeIntent] = useState<{
    clientSecret: string;
    intentId: string;
    amountEur: number;
  } | null>(null);

  const [sumupCheckout, setSumupCheckout] = useState<{
    id: string;
    amountEur: number;
  } | null>(null);

  const parseCustom = (v: string): number => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const selectedAmount = selectedMode === "custom" ? parseCustom(customAmount) : selectedMode;
  const paypalAmount = paypalMode === "custom" ? parseCustom(paypalCustomAmount) : paypalMode;
  const stripeAmount = stripeMode === "custom" ? parseCustom(stripeCustomAmount) : stripeMode;
  const isCryptoAmountValid = selectedAmount >= 5 && selectedAmount <= 5000;
  const isPaypalAmountValid = paypalAmount >= 5 && paypalAmount <= 5000;
  const isStripeAmountValid = stripeAmount >= 5 && stripeAmount <= 5000;

  const stripePromise = useMemo<Promise<StripeJS | null> | null>(() => {
    if (!stripeConfig?.enabled || !stripeConfig.publishableKey || !SHOW_STRIPE) return null;
    return loadStripe(stripeConfig.publishableKey);
  }, [stripeConfig?.enabled, stripeConfig?.publishableKey]);

  useEffect(() => {
    if (!sumupConfig?.enabled) return;
    if (window.hasOwnProperty("SumUpCard")) return; // Déjà chargé
    const script = document.createElement("script");
    script.src = "https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js";
    script.async = true;
    script.id = "sumup-sdk";
    document.body.appendChild(script);
    return () => {
      // On ne retire pas le script pour éviter de le recharger si l'user change de page
    };
  }, [sumupConfig?.enabled]);

  const handleStartStripe = async () => {
    try {
      const res = await createStripe.mutateAsync({ data: { amountEur: stripeAmount } });
      setStripeIntent({
        clientSecret: res.clientSecret,
        intentId: res.intentId,
        amountEur: res.amountEur,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Impossible de démarrer le paiement";
      toast.error(msg);
    }
  };

  const handleStartSumup = async () => {
    try {
      const res = await initiateSumup.mutateAsync({ amountEur: stripeAmount });
      setSumupCheckout({
        id: res.checkoutId,
        amountEur: res.amountEur,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Impossible de démarrer le paiement SumUp";
      toast.error(msg);
    }
  };
  const [rechargeSession, setRechargeSession] = useState<{
    id: number;
    address: string;
    amountLtc: number;
    amountEur: number;
    expiresAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Toggle the auto-refresh whenever there's any pending recharge (active session
  // or a previous one still waiting for its on-chain confirmation).
  useEffect(() => {
    const hasPending = (pending?.length ?? 0) > 0 || rechargeSession !== null;
    setHasActiveRecharge(hasPending);
  }, [pending, rechargeSession]);

  const invalidateWallet = () => {
    queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetTransactionsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetPendingCryptoRechargesQueryKey() });
  };

  const handleInitiateRecharge = async () => {
    try {
      const res = await initiateCrypto.mutateAsync({ data: { amountEur: selectedAmount } });
      setRechargeSession({
        id: res.sessionId,
        address: res.address,
        amountLtc: res.amountLtc,
        amountEur: res.amountEur,
        expiresAt: res.expiresAt,
      });
      invalidateWallet();
      toast.success("Session de recharge créée");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur lors de l'initiation";
      toast.error(msg);
    }
  };

  const handleCancelPending = async (id: number) => {
    try {
      await cancelPending.mutateAsync({ id });
      invalidateWallet();
      if (rechargeSession?.id === id) setRechargeSession(null);
      toast.success("Recharge annulée");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur lors de l'annulation";
      toast.error(msg);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copié dans le presse-papier");
  };

  const paypalOptions = useMemo(() => {
    if (!paypalConfig?.enabled || !paypalConfig.clientId) return null;
    return {
      clientId: paypalConfig.clientId,
      currency: "EUR",
      intent: "capture",
      ...(paypalConfig.env === "sandbox" ? {} : {}),
    };
  }, [paypalConfig]);

  if (isLoadingWallet) {
    return <div className="p-4 animate-pulse h-screen bg-card/50"></div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 animate-in fade-in">
      <h1 className="text-2xl font-bold px-1">Mon Portefeuille</h1>

      {/* Balance Card */}
      <Card className="bg-gradient-to-br from-primary/20 via-card to-secondary/20 border-primary/30 overflow-hidden relative shadow-lg shadow-primary/10">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-primary/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-40 h-40 bg-secondary/20 rounded-full blur-3xl"></div>

        <CardContent className="p-6 relative z-10">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <WalletIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Solde Actuel</span>
          </div>
          <div className="text-4xl font-mono font-bold text-foreground mb-6">
            {wallet?.balance.toFixed(2)}€
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-background/50 rounded-lg p-3 backdrop-blur-sm border border-white/5">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Coins className="w-3 h-3" /> Points
              </div>
              <div className="font-mono font-bold text-secondary">{wallet?.loyaltyPoints}</div>
            </div>
            <div className="bg-background/50 rounded-lg p-3 backdrop-blur-sm border border-white/5">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <ArrowDownToLine className="w-3 h-3" /> Total Rechargé
              </div>
              <div className="font-mono font-bold text-primary">{wallet?.totalRecharged.toFixed(2)}€</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending crypto rechargecards */}
      {pending && pending.length > 0 && (
        <Card className="bg-amber-500/5 border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-500">
              <Clock className="w-4 h-4" />
              Recharges en attente ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {pending.map((p) => {
              const exp = new Date(p.expiresAt);
              const minutes = Math.max(0, Math.floor((exp.getTime() - Date.now()) / 60000));
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-background/40 rounded-lg p-3 border border-amber-500/10"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {p.amountEur.toFixed(2)}€ — {p.amountLtc} LTC
                    </div>
                    <div className="text-xs text-muted-foreground truncate font-mono">
                      {p.address}
                    </div>
                    <div className="text-[10px] text-amber-500 mt-1">
                      Expire dans {minutes} min
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyToClipboard(p.address)}
                      title="Copier l'adresse"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCancelPending(p.id)}
                      disabled={cancelPending.isPending}
                      title="Annuler"
                    >
                      <XCircle className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="recharge" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-card border border-border/50 p-1 rounded-xl">
          <TabsTrigger value="recharge" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Recharger
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recharge" className="mt-4 space-y-4">
          {/* Crypto card */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#345D9D]/20 text-[#345D9D] flex items-center justify-center font-bold">
                  Ł
                </div>
                Crypto (Litecoin)
              </CardTitle>
              <CardDescription>Recharge automatique rapide et sans frais via LTC.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!rechargeSession ? (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {RECHARGE_AMOUNTS.map((amt) => (
                      <Button
                        key={amt}
                        variant={selectedMode === amt ? "default" : "outline"}
                        className={`h-12 ${
                          selectedMode === amt
                            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                            : "bg-background hover:bg-muted"
                        }`}
                        onClick={() => setSelectedMode(amt)}
                      >
                        {amt}€
                      </Button>
                    ))}
                    <Button
                      variant={selectedMode === "custom" ? "default" : "outline"}
                      className={`h-12 ${
                        selectedMode === "custom"
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                          : "bg-background hover:bg-muted"
                      }`}
                      onClick={() => setSelectedMode("custom")}
                    >
                      Autre
                    </Button>
                  </div>
                  {selectedMode === "custom" && (
                    <div className="space-y-1 animate-in slide-in-from-top-1 fade-in">
                      <div className="relative">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={5}
                          max={5000}
                          step="0.01"
                          placeholder="Montant en €"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          className="h-12 pr-10 text-base font-medium"
                          autoFocus
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">€</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground px-1">
                        Minimum 5€ — Maximum 5000€
                      </p>
                    </div>
                  )}
                  <Button
                    className="w-full mt-4 bg-gradient-to-r from-primary to-secondary text-white border-none rounded-xl h-12 font-medium disabled:opacity-50"
                    onClick={handleInitiateRecharge}
                    disabled={initiateCrypto.isPending || !isCryptoAmountValid}
                  >
                    {initiateCrypto.isPending ? "Génération…" : "Générer l'adresse de dépôt"}
                  </Button>
                </>
              ) : (
                <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                  <div className="bg-background rounded-xl p-4 border border-border">
                    <div className="text-sm text-muted-foreground mb-1 text-center">Envoyez exactement</div>
                    <div className="text-2xl font-mono font-bold text-center text-primary mb-4">
                      {rechargeSession.amountLtc} LTC
                    </div>

                    <div className="flex justify-center mb-4">
                      <div className="bg-white p-3 rounded-lg shadow-md">
                        <QRCodeSVG
                          value={`litecoin:${rechargeSession.address}?amount=${rechargeSession.amountLtc}`}
                          size={180}
                          level="M"
                          includeMargin={false}
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-center text-muted-foreground mb-4">
                      Scanne avec ton portefeuille Litecoin
                    </p>

                    <div className="space-y-2 mb-4">
                      <Label className="text-xs text-muted-foreground">…ou copie l'adresse :</Label>
                      <div className="flex gap-2">
                        <Input value={rechargeSession.address} readOnly className="font-mono text-xs bg-muted/50" />
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => copyToClipboard(rechargeSession.address)}
                        >
                          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-orange-500" />
                      Réseau Litecoin (LTC) uniquement
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <p className="text-sm font-medium text-primary">
                        En attente du paiement…
                      </p>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Une fois ton virement Litecoin confirmé sur le réseau (env. 2-5 min),
                      ton solde sera crédité <span className="font-semibold text-foreground">automatiquement</span>.
                      Aucune action de ta part requise.
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => setRechargeSession(null)}
                  >
                    Fermer (la session reste active en arrière-plan)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* PayPal card — en maintenance */}
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
                  P
                </div>
                PayPal
                <span className="text-[10px] uppercase tracking-wide bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded inline-flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  maintenance
                </span>
              </CardTitle>
              <CardDescription>
                Service PayPal temporairement indisponible.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3 text-sm text-amber-200">
                Pour effectuer une recharge PayPal, contacte&nbsp;
                <a
                  href="https://t.me/nexoshop6912"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline underline-offset-2 hover:text-amber-100"
                >
                  @nexoshop6912
                </a>
                &nbsp;sur Telegram.
              </div>
              <a
                href="https://t.me/nexoshop6912"
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full h-12 bg-[#229ED9] hover:bg-[#1b8ec5] text-white shadow-md shadow-[#229ED9]/20">
                  <Send className="w-4 h-4 mr-2" />
                  Contacter @nexoshop6912 sur Telegram
                </Button>
              </a>
            </CardContent>
          </Card>
          {/* SumUp (Carte bancaire) - Remplace Stripe visuellement */}
          {!SHOW_STRIPE && (
            <Card className={`bg-card/50 border-border/50 relative ${!sumupConfig?.enabled ? "opacity-70" : ""}`}>
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <PaymentBadge type="visa" />
                <PaymentBadge type="mastercard" />
              </div>
              <CardHeader className="pb-3 pr-28 sm:pr-32">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md bg-[#3063E9] text-white flex items-center justify-center font-bold text-sm">
                    Σ
                  </div>
                  Carte Bancaire (SumUp)
                </CardTitle>
                <CardDescription>
                  {sumupConfig?.enabled
                    ? "Paiement sécurisé par carte via SumUp."
                    : "Bientôt disponible — configuration serveur requise."}
                </CardDescription>
              </CardHeader>
              {(sumupConfig?.enabled ?? true) && (
                <CardContent className="space-y-4">
                  {!sumupCheckout ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {RECHARGE_AMOUNTS.map((amt) => (
                          <Button
                            key={amt}
                            variant={stripeMode === amt ? "default" : "outline"}
                            className={`h-12 ${
                              stripeMode === amt
                                ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                                : "bg-background hover:bg-muted"
                            }`}
                            onClick={() => setStripeMode(amt)}
                          >
                            {amt}€
                          </Button>
                        ))}
                        <Button
                          variant={stripeMode === "custom" ? "default" : "outline"}
                          className={`h-12 ${
                            stripeMode === "custom"
                              ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                              : "bg-background hover:bg-muted"
                          }`}
                          onClick={() => setStripeMode("custom")}
                        >
                          Autre
                        </Button>
                      </div>
                      {stripeMode === "custom" && (
                        <div className="space-y-1 animate-in slide-in-from-top-1 fade-in">
                          <div className="relative">
                            <Input
                              type="number"
                              inputMode="decimal"
                              min={5}
                              max={5000}
                              step="0.01"
                              placeholder="Montant en €"
                              value={stripeCustomAmount}
                              onChange={(e) => setStripeCustomAmount(e.target.value)}
                              className="h-12 pr-10 text-base font-medium"
                              autoFocus
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">€</span>
                          </div>
                        </div>
                      )}
                      <Button
                        className="w-full h-12 bg-[#3063E9] hover:bg-[#254eba] text-white shadow-md shadow-[#3063E9]/30"
                        disabled={!isStripeAmountValid || initiateSumup.isPending}
                        onClick={handleStartSumup}
                      >
                        {initiateSumup.isPending
                          ? "Préparation..."
                          : `Continuer — ${stripeAmount.toFixed(2)}€`}
                      </Button>
                    </>
                  ) : (
                    <SumupPaymentForm
                      checkoutId={sumupCheckout.id}
                      amountEur={sumupCheckout.amountEur}
                      onSuccess={() => {
                        invalidateWallet();
                        setSumupCheckout(null);
                      }}
                      onCancel={() => setSumupCheckout(null)}
                    />
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Stripe Original (Masqué mais conservé) */}
          {SHOW_STRIPE && (
            <Card className={`bg-card/50 border-border/50 relative ${!stripeConfig?.enabled ? "opacity-70" : ""}`}>
            {/* Payment method badges, top-right */}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              <PaymentBadge type="visa" />
              <PaymentBadge type="mastercard" />
              <PaymentBadge type="link" />
            </div>
            <CardHeader className="pb-3 pr-28 sm:pr-32">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-gradient-to-br from-[#635BFF] to-[#3a32d6] text-white flex items-center justify-center font-bold text-sm">
                  S
                </div>
                Stripe
              </CardTitle>
              <CardDescription>
                {stripeConfig?.enabled
                  ? "Carte bancaire ou Link — paiement instantané et sécurisé."
                  : "Bientôt disponible — configuration serveur requise."}
              </CardDescription>
            </CardHeader>
            {stripeConfig?.enabled && (
              <CardContent className="space-y-4">
                {!stripeIntent ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {RECHARGE_AMOUNTS.map((amt) => (
                        <Button
                          key={amt}
                          variant={stripeMode === amt ? "default" : "outline"}
                          className={`h-12 ${
                            stripeMode === amt
                              ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                              : "bg-background hover:bg-muted"
                          }`}
                          onClick={() => setStripeMode(amt)}
                        >
                          {amt}€
                        </Button>
                      ))}
                      <Button
                        variant={stripeMode === "custom" ? "default" : "outline"}
                        className={`h-12 ${
                          stripeMode === "custom"
                            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                            : "bg-background hover:bg-muted"
                        }`}
                        onClick={() => setStripeMode("custom")}
                      >
                        Autre
                      </Button>
                    </div>
                    {stripeMode === "custom" && (
                      <div className="space-y-1 animate-in slide-in-from-top-1 fade-in">
                        <div className="relative">
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={5}
                            max={5000}
                            step="0.01"
                            placeholder="Montant en €"
                            value={stripeCustomAmount}
                            onChange={(e) => setStripeCustomAmount(e.target.value)}
                            className="h-12 pr-10 text-base font-medium"
                            autoFocus
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">€</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground px-1">
                          Minimum 5€ — Maximum 5000€
                        </p>
                      </div>
                    )}
                    <Button
                      className="w-full h-12 bg-gradient-to-r from-[#635BFF] to-[#3a32d6] hover:from-[#5249f5] hover:to-[#2f28b8] text-white shadow-md shadow-[#635BFF]/30"
                      disabled={!isStripeAmountValid || createStripe.isPending}
                      onClick={handleStartStripe}
                    >
                      {createStripe.isPending
                        ? "Préparation..."
                        : isStripeAmountValid
                        ? `Continuer vers le paiement — ${stripeAmount.toFixed(2)}€`
                        : "Entrez un montant entre 5€ et 5000€"}
                    </Button>
                    <div className="rounded-md border border-border/40 bg-muted/20 px-3 py-2.5 flex gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-foreground">NexoShop n'enregistre pas tes coordonnées bancaires.</span> Le paiement est traité directement par Stripe (PCI-DSS niveau 1). Si tu préfères, tu peux utiliser une carte virtuelle ou éphémère (Revolut, N26, Lydia, PCS…).
                      </p>
                    </div>
                  </>
                ) : stripePromise ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret: stripeIntent.clientSecret,
                      appearance: {
                        theme: "night",
                        variables: {
                          colorPrimary: "#635BFF",
                          colorBackground: "#0a0a0a",
                          colorText: "#fafafa",
                          borderRadius: "8px",
                        },
                      },
                    }}
                  >
                    <StripePaymentForm
                      intentId={stripeIntent.intentId}
                      amountEur={stripeIntent.amountEur}
                      onSuccess={() => {
                        invalidateWallet();
                        setStripeIntent(null);
                      }}
                      onCancel={() => setStripeIntent(null)}
                    />
                  </Elements>
                ) : null}
              </CardContent>
            )}
          </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                Dernières Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                {isLoadingTx ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
                    ))}
                  </div>
                ) : !transactions || transactions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Aucune transaction pour le moment.
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {transactions.map((tx) => {
                      const isCredit = tx.type === "credit" || tx.type === "admin_credit";
                      return (
                      <div
                        key={tx.id}
                        className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isCredit
                                ? "bg-green-500/10 text-green-500"
                                : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {isCredit ? (
                              <ArrowDownToLine className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{tx.description}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(tx.createdAt).toLocaleDateString("fr-FR", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </div>
                        <div
                          className={`font-mono font-bold ${
                            isCredit ? "text-green-500" : "text-foreground"
                          }`}
                        >
                          {isCredit ? "+" : "-"}
                          {tx.amount.toFixed(2)}€
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SumupPaymentForm({
  checkoutId,
  amountEur,
  onSuccess,
  onCancel,
}: {
  checkoutId: string;
  amountEur: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const confirmSumup = useConfirmSumupCheckout();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const mountWidget = () => {
      // @ts-ignore
      if (window.SumUpCard) {
        // @ts-ignore
        window.SumUpCard.mount({
          id: "sumup-card-container",
          checkoutId: checkoutId,
          onResponse: async (res: any) => {
            if (res.status === "PAID" || res.status === "AUTHORIZED") {
              setSubmitting(true);
              try {
                const confirm = await confirmSumup.mutateAsync({ checkoutId });
                if (confirm.success) {
                  toast.success(`+${confirm.amountEur.toFixed(2)}€ crédités`);
                  onSuccess();
                }
              } catch (e) {
                toast.error("Erreur lors de la confirmation");
              } finally {
                setSubmitting(false);
              }
            } else if (res.status === "FAILED") {
              toast.error("Paiement échoué");
            }
          },
        });
      } else if (attempts < 10) {
        attempts++;
        setTimeout(mountWidget, 300);
      }
    };

    mountWidget();
  }, [checkoutId]);

  return (
    <div className="space-y-4">
      <div id="sumup-card-container" className="min-h-[200px] bg-white rounded-lg p-2"></div>
      {submitting && (
        <div className="flex items-center justify-center gap-2 text-primary font-medium animate-pulse">
          Vérification du paiement...
        </div>
      )}
      <Button
        variant="ghost"
        className="w-full text-xs text-muted-foreground"
        onClick={onCancel}
        disabled={submitting}
      >
        Annuler et changer le montant
      </Button>
    </div>
  );
}

function StripePaymentForm({
  intentId,
  amountEur,
  onSuccess,
  onCancel,
}: {
  intentId: string;
  amountEur: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const confirmStripe = useConfirmStripeIntent();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });
      if (error) {
        toast.error(error.message || "Paiement échoué");
        setSubmitting(false);
        return;
      }
      // Poll up to 6× over 30s in case Stripe returns "processing"
      let attempts = 0;
      while (attempts < 6) {
        const res = await confirmStripe.mutateAsync({ data: { intentId } });
        if (res.success) {
          toast.success(`+${res.amountEur.toFixed(2)}€ crédités`, { icon: "💰" });
          onSuccess();
          return;
        }
        if (!res.pending) break;
        attempts++;
        if (attempts === 1) {
          toast.loading("Paiement en cours de traitement par la banque...", { id: "stripe-pending" });
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
      toast.dismiss("stripe-pending");
      toast("Paiement en attente — ton portefeuille sera crédité dès la confirmation bancaire.", {
        icon: "⏳",
        duration: 6000,
      });
      onSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Paiement échoué";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement options={{ layout: "tabs" }} />
      <Button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full h-12 bg-gradient-to-r from-[#635BFF] to-[#3a32d6] hover:from-[#5249f5] hover:to-[#2f28b8] text-white shadow-md shadow-[#635BFF]/30"
      >
        {submitting ? "Traitement..." : `Payer ${amountEur.toFixed(2)}€`}
      </Button>
      <button
        type="button"
        onClick={onCancel}
        disabled={submitting}
        className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
      >
        Changer de montant
      </button>
    </form>
  );
}

function PaymentBadge({ type }: { type: "visa" | "mastercard" | "link" }) {
  const base = "h-5 w-9 rounded-[3px] bg-white flex items-center justify-center shadow-sm border border-black/5";
  if (type === "visa") {
    return (
      <div className={base} title="Visa">
        <span className="text-[#1a1f71] font-extrabold italic text-[9px] tracking-tight">VISA</span>
      </div>
    );
  }
  if (type === "mastercard") {
    return (
      <div className={base} title="Mastercard">
        <svg viewBox="0 0 24 16" className="h-3.5" aria-hidden="true">
          <circle cx="9" cy="8" r="6" fill="#EB001B" />
          <circle cx="15" cy="8" r="6" fill="#F79E1B" />
          <path d="M12 3.5a6 6 0 0 1 0 9 6 6 0 0 1 0-9z" fill="#FF5F00" />
        </svg>
      </div>
    );
  }
  // link (Stripe)
  return (
    <div className="h-5 w-9 rounded-[3px] bg-[#00D924] flex items-center justify-center shadow-sm" title="Link by Stripe">
      <span className="text-black font-bold text-[9px] tracking-tight lowercase">link</span>
    </div>
  );
}
