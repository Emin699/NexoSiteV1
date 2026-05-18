import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { hasAuthToken } from "@/hooks/use-auth";
import {
  useGetWallet,
  useGetTransactions,
  useInitiateCryptoRecharge,
  useGetPendingCryptoRecharges,
  useCancelPendingCryptoRecharge,
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
import { loadStripe, type Stripe as StripeJS } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Wallet as WalletIcon,
  Coins,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  Clock,
  XCircle,
  Zap,
  TrendingUp,
  ChevronRight,
  CreditCard,
  ArrowDownToLine,
} from "lucide-react";
import { toast } from "sonner";

const RECHARGE_AMOUNTS = [5, 10, 20, 30, 50];
const SHOW_STRIPE = false; // Basculer à true pour réactiver Stripe
const SUMUP_FEE = 0.02; // 2% de frais bancaires répercutés sur le client

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
  const { data: stripeConfig } = useGetStripeConfig();

  const initiateCrypto = useInitiateCryptoRecharge();
  const cancelPending = useCancelPendingCryptoRecharge();
  const createStripe = useCreateStripeIntent();

  const { data: sumupConfig } = useGetSumupConfig();
  const initiateSumup = useInitiateSumupCheckout();
  const confirmSumup = useConfirmSumupCheckout();

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

  const [expandedMethod, setExpandedMethod] = useState<"ltc" | "sumup" | null>(null);
  const toggleMethod = (m: "ltc" | "sumup") =>
    setExpandedMethod((prev) => (prev === m ? null : m));

  const parseCustom = (v: string): number => {
    const n = Number(v.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };
  const stripeAmount = stripeMode === "custom" ? parseCustom(stripeCustomAmount) : stripeMode;
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
      const res = await initiateCrypto.mutateAsync({ data: { amountEur: 0 } });
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


  if (isLoadingWallet) {
    return <div className="p-4 animate-pulse h-screen bg-card/50"></div>;
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h1 className="text-xl font-bold tracking-tight">Mon Portefeuille</h1>
        <div className="flex items-center gap-1.5" style={{ color: "#a855f7" }}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="text-[11px] font-semibold">Sécurisé</span>
        </div>
      </div>

      {/* Premium balance card */}
      <div
        className="rounded-2xl overflow-hidden relative"
        style={{ background: "linear-gradient(135deg, #1a0533 0%, #0d1a3a 60%, #001a20 100%)" }}
      >
        {/* Neon glows */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none" style={{ background: "rgba(168,85,247,0.25)", filter: "blur(50px)" }} />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full pointer-events-none" style={{ background: "rgba(6,182,212,0.2)", filter: "blur(40px)" }} />
        {/* Shiny top border */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.6), rgba(6,182,212,0.6), transparent)" }} />

        <div className="relative z-10 p-6">
          <div className="flex items-center gap-1.5 mb-1 text-white/45 text-xs">
            <Zap className="w-3 h-3" style={{ color: "#a855f7" }} />
            Solde disponible
          </div>
          <div className="font-mono font-black text-white mb-5" style={{ fontSize: 42, letterSpacing: "-0.03em", lineHeight: 1 }}>
            {wallet?.balance.toFixed(2)}<span className="text-2xl align-super" style={{ color: "#a855f7" }}>€</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
              <div className="flex items-center gap-1 text-[10px] text-white/40 mb-1">
                <Coins className="w-3 h-3" /> Points fidélité
              </div>
              <div className="font-mono font-bold text-lg" style={{ color: "#06b6d4" }}>{wallet?.loyaltyPoints}</div>
            </div>
            <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(168,85,247,0.15)" }}>
              <div className="flex items-center gap-1 text-[10px] text-white/40 mb-1">
                <ArrowDownToLine className="w-3 h-3" /> Total rechargé
              </div>
              <div className="font-mono font-bold text-lg" style={{ color: "#a855f7" }}>{wallet?.totalRecharged.toFixed(2)}€</div>
            </div>
          </div>
        </div>
      </div>

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
                    <div className="text-sm font-medium">Recharge LTC en attente</div>
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

      {/* ── RECHARGER ──────────────────────────────── */}
      <div>
        <div className="text-[11px] font-bold tracking-widest uppercase mb-3 px-1" style={{ color: "#5a4d7a" }}>
          Recharger
        </div>
        <div className="flex flex-col gap-2.5">

          {/* Litecoin row */}
          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${expandedMethod === "ltc" ? "rgba(168,85,247,0.35)" : "rgba(168,85,247,0.18)"}`, background: "rgba(168,85,247,0.05)" }}>
            <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => toggleMethod("ltc")}>
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0" style={{ boxShadow: "0 2px 8px rgba(52,93,157,0.35)" }}>
                <img src="/logos-ltc.png" alt="Litecoin" className="w-9 h-9 object-contain rounded-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">Litecoin</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>+5% bonus</span>
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#5a4d7a" }}>Crypto — sans frais</div>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 transition-transform duration-200" style={{ color: "#a855f7", transform: expandedMethod === "ltc" ? "rotate(90deg)" : "none" }} />
            </button>
            {expandedMethod === "ltc" && (
              <div className="px-4 pb-4 space-y-3 animate-in slide-in-from-top-2 fade-in">
                {!rechargeSession ? (
                  <>
                    <div className="rounded-xl bg-green-500/10 border border-green-500/30 px-3 py-2.5 flex gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        <span className="font-semibold text-green-400">+5% de bonus</span> sur toutes les recharges LTC •{" "}
                        <span className="font-semibold text-green-400">+10% de bonus</span> si ta recharge dépasse 100€ •{" "}
                        Aucun montant minimum requis.
                      </p>
                    </div>
                    <Button
                      className="w-full bg-gradient-to-r from-primary to-secondary text-white border-none rounded-xl h-12 font-medium"
                      onClick={handleInitiateRecharge}
                      disabled={initiateCrypto.isPending}
                    >
                      {initiateCrypto.isPending ? "Génération…" : "Générer un lien de paiement LTC"}
                    </Button>
                  </>
                ) : (
                  <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in">
                    <div className="bg-background rounded-xl p-4 border border-border">
                      <div className="text-sm font-medium text-center mb-1">Envoyez le montant de votre choix</div>
                      <div className="text-xs text-muted-foreground text-center mb-4">
                        Votre solde sera crédité + bonus automatiquement après confirmation
                      </div>
                      <div className="flex justify-center mb-4">
                        <div className="bg-white p-3 rounded-lg shadow-md">
                          <QRCodeSVG value={`litecoin:${rechargeSession.address}`} size={180} level="M" includeMargin={false} />
                        </div>
                      </div>
                      <p className="text-[11px] text-center text-muted-foreground mb-4">Scanne avec ton portefeuille Litecoin</p>
                      <div className="space-y-2 mb-4">
                        <Label className="text-xs text-muted-foreground">…ou copie l'adresse :</Label>
                        <div className="flex gap-2">
                          <Input value={rechargeSession.address} readOnly className="font-mono text-xs bg-muted/50" />
                          <Button variant="secondary" size="icon" onClick={() => copyToClipboard(rechargeSession.address)}>
                            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                        <ShieldAlert className="w-3 h-3 text-orange-500" /> Réseau Litecoin (LTC) uniquement
                      </div>
                    </div>
                    <div className="rounded-xl bg-green-500/10 border border-green-500/30 px-3 py-2 flex gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-green-400">+5% bonus</span> inclus • <span className="font-semibold text-green-400">+10%</span> si votre envoi dépasse 100€
                      </p>
                    </div>
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <p className="text-sm font-medium text-primary">En attente du paiement… (expire dans 1h)</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Une fois ton virement Litecoin confirmé sur le réseau (env. 2-5 min), ton solde sera crédité <span className="font-semibold text-foreground">automatiquement</span>. Aucune action de ta part requise.
                      </p>
                    </div>
                    <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setRechargeSession(null)}>
                      Fermer (la session reste active en arrière-plan)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* PayPal row — maintenance (non cliquable) */}
          <div className="rounded-2xl flex items-center gap-3 p-4" style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", opacity: 0.55 }}>
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0 p-1.5" style={{ boxShadow: "0 2px 8px rgba(0,48,135,0.3)" }}>
              <img src="/logos-paypal.png" alt="PayPal" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: "#5a4d7a" }}>PayPal</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>maintenance</span>
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#5a4d7a" }}>Temporairement indisponible</div>
            </div>
          </div>

          {/* SumUp row */}
          {!SHOW_STRIPE && (
            <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${expandedMethod === "sumup" ? "rgba(6,182,212,0.35)" : "rgba(168,85,247,0.18)"}`, background: sumupConfig?.enabled === false ? "rgba(255,255,255,0.02)" : "rgba(168,85,247,0.05)", opacity: sumupConfig?.enabled === false ? 0.65 : 1 }}>
              <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => toggleMethod("sumup")}>
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-black flex items-center justify-center shrink-0" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                  <img src="/logos-sumup.png" alt="SumUp" className="w-8 h-8 object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-foreground">Carte bancaire</span>
                    <div className="flex items-center gap-1">
                      <PaymentBadge type="visa" />
                      <PaymentBadge type="mastercard" />
                      <PaymentBadge type="applepay" />
                      <PaymentBadge type="googlepay" />
                    </div>
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "#5a4d7a" }}>Via SumUp — sécurisé</div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 transition-transform duration-200" style={{ color: "#a855f7", transform: expandedMethod === "sumup" ? "rotate(90deg)" : "none" }} />
              </button>
              {expandedMethod === "sumup" && (sumupConfig?.enabled ?? true) && (
                <div className="px-4 pb-4 space-y-4 animate-in slide-in-from-top-2 fade-in">
                  {!sumupCheckout ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        {RECHARGE_AMOUNTS.map((amt) => (
                          <Button
                            key={amt}
                            variant={stripeMode === amt ? "default" : "outline"}
                            className={`h-12 ${stripeMode === amt ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                            onClick={() => setStripeMode(amt)}
                          >
                            {amt}€
                          </Button>
                        ))}
                        <Button
                          variant={stripeMode === "custom" ? "default" : "outline"}
                          className={`h-12 ${stripeMode === "custom" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                          onClick={() => setStripeMode("custom")}
                        >
                          Autre
                        </Button>
                      </div>
                      {stripeMode === "custom" && (
                        <div className="relative animate-in slide-in-from-top-1 fade-in">
                          <Input
                            type="number" inputMode="decimal" min={5} max={5000} step="0.01"
                            placeholder="Montant en €" value={stripeCustomAmount}
                            onChange={(e) => setStripeCustomAmount(e.target.value)}
                            className="h-12 pr-10 text-base font-medium" autoFocus
                          />
                          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">€</span>
                        </div>
                      )}
                      <Button
                        className="w-full h-12 bg-[#3063E9] hover:bg-[#254eba] text-white shadow-md shadow-[#3063E9]/30"
                        disabled={!isStripeAmountValid || initiateSumup.isPending}
                        onClick={handleStartSumup}
                      >
                        {initiateSumup.isPending
                          ? "Préparation..."
                          : `Payer ${(Math.round(stripeAmount * (1 + SUMUP_FEE) * 100) / 100).toFixed(2)}€ → +${stripeAmount.toFixed(2)}€ crédités`}
                      </Button>
                    </>
                  ) : (
                    <SumupPaymentForm
                      checkoutId={sumupCheckout.id}
                      amountEur={sumupCheckout.amountEur}
                      onSuccess={() => { invalidateWallet(); setSumupCheckout(null); }}
                      onCancel={() => setSumupCheckout(null)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stripe (conservé, masqué) */}
          {SHOW_STRIPE && stripeConfig?.enabled && stripePromise && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(99,91,255,0.3)", background: "rgba(99,91,255,0.05)" }}>
              <div className="p-4 space-y-4">
                {!stripeIntent ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      {RECHARGE_AMOUNTS.map((amt) => (
                        <Button key={amt} variant={stripeMode === amt ? "default" : "outline"} className="h-12" onClick={() => setStripeMode(amt)}>{amt}€</Button>
                      ))}
                      <Button variant={stripeMode === "custom" ? "default" : "outline"} className="h-12" onClick={() => setStripeMode("custom")}>Autre</Button>
                    </div>
                    <Button className="w-full h-12 bg-gradient-to-r from-[#635BFF] to-[#3a32d6] text-white" disabled={!isStripeAmountValid || createStripe.isPending} onClick={handleStartStripe}>
                      {createStripe.isPending ? "Préparation..." : `Continuer — ${stripeAmount.toFixed(2)}€`}
                    </Button>
                  </>
                ) : (
                  <Elements stripe={stripePromise} options={{ clientSecret: stripeIntent.clientSecret, appearance: { theme: "night" } }}>
                    <StripePaymentForm intentId={stripeIntent.intentId} amountEur={stripeIntent.amountEur} onSuccess={() => { invalidateWallet(); setStripeIntent(null); }} onCancel={() => setStripeIntent(null)} />
                  </Elements>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── HISTORIQUE RÉCENT ───────────────────────── */}
      <div>
        <div className="text-[11px] font-bold tracking-widest uppercase mb-3 px-1" style={{ color: "#5a4d7a" }}>
          Historique récent
        </div>
        {isLoadingTx ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-muted/30 animate-pulse" />)}
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">Aucune transaction pour le moment.</div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(168,85,247,0.03)", border: "1px solid rgba(168,85,247,0.1)" }}>
            {transactions.slice(0, 10).map((tx, i, arr) => {
              const isCredit = tx.type === "credit" || tx.type === "admin_credit";
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(168,85,247,0.08)" : "none" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: isCredit ? "rgba(34,197,94,0.1)" : "rgba(168,85,247,0.1)", border: `1px solid ${isCredit ? "rgba(34,197,94,0.2)" : "rgba(168,85,247,0.2)"}` }}>
                    {isCredit
                      ? <TrendingUp className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />
                      : <CreditCard className="w-3.5 h-3.5" style={{ color: "#a855f7" }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{tx.description}</div>
                    <div className="text-[10px]" style={{ color: "#5a4d7a" }}>
                      {new Date(tx.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                  <div className="text-sm font-bold font-mono shrink-0" style={{ color: isCredit ? "#22c55e" : "#e2d9f3" }}>
                    {isCredit ? "+" : "-"}{tx.amount.toFixed(2)}€
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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

function PaymentBadge({ type }: { type: "visa" | "mastercard" | "link" | "applepay" | "googlepay" }) {
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
  if (type === "applepay") {
    return (
      <div className="h-5 w-9 rounded-[3px] bg-black flex items-center justify-center shadow-sm border border-white/10" title="Apple Pay">
        <svg viewBox="0 0 60 24" className="h-3" aria-hidden="true" fill="white">
          <path d="M11.3 3.1c-.7.8-1.7 1.4-2.8 1.3-.1-1.1.4-2.2 1.1-2.9.7-.8 1.8-1.4 2.7-1.4.1 1.1-.3 2.2-1 3zm1 1.6c-1.5-.1-2.8.9-3.5.9-.7 0-1.8-.8-3-.8-1.5 0-3 .9-3.7 2.3-1.6 2.8-.4 6.9 1.1 9.1.7 1.1 1.6 2.3 2.8 2.3 1.1 0 1.5-.7 2.9-.7 1.3 0 1.7.7 2.9.7 1.2 0 2-1.1 2.7-2.2.8-1.3 1.2-2.5 1.2-2.6-.1 0-2.3-.9-2.3-3.5 0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7zM21.4 1.8v17h2.6v-5.8h3.7c3.4 0 5.8-2.3 5.8-5.6 0-3.3-2.3-5.6-5.7-5.6h-6.4zm2.6 2.2h3.1c2.3 0 3.7 1.3 3.7 3.5s-1.3 3.5-3.7 3.5h-3.1V4zm15 14.9c1.7 0 3.2-.8 3.9-2.1h.1v2h2.4v-8.3c0-2.4-1.9-3.9-4.9-3.9-2.7 0-4.7 1.6-4.8 3.7h2.4c.2-1 1.1-1.7 2.4-1.7 1.5 0 2.4.7 2.4 2.1v.9l-3.2.2c-3 .2-4.6 1.4-4.6 3.5 0 2.1 1.7 3.6 4 3.6zm.7-2c-1.3 0-2.1-.6-2.1-1.6 0-1 .8-1.6 2.3-1.7l2.9-.2v1c0 1.5-1.3 2.6-3 2.6zM48.9 23.5c2.6 0 3.8-1 4.8-3.9l4.6-13H56l-3.1 9.9h-.1l-3.1-9.9H47l4.5 12.3-.2.8c-.4 1.3-1.1 1.8-2.3 1.8-.2 0-.6 0-.8-.1v2c.2.1.7.1 1 .1z"/>
        </svg>
      </div>
    );
  }
  if (type === "googlepay") {
    return (
      <div className={base} title="Google Pay">
        <svg viewBox="0 0 48 20" className="h-3.5" aria-hidden="true">
          <path d="M22.7 9.8v5.7h-1.8V1.4h4.8c1.2 0 2.3.4 3.1 1.2.9.8 1.3 1.8 1.3 3 0 1.2-.4 2.2-1.3 3-.9.8-1.9 1.2-3.1 1.2h-3zm0-6.6v4.8h3c.7 0 1.3-.2 1.8-.7s.7-1 .7-1.7c0-.7-.2-1.2-.7-1.7-.5-.5-1.1-.7-1.8-.7h-3zm11.4 2.7c1.4 0 2.4.4 3.2 1.1.8.7 1.2 1.8 1.2 3.1v6.3h-1.7v-1.3h-.1c-.7 1.1-1.7 1.6-2.9 1.6-1 0-1.9-.3-2.6-.9-.7-.6-1.1-1.4-1.1-2.3 0-1 .4-1.8 1.1-2.4.7-.6 1.7-.9 3-.9 1 0 1.9.2 2.6.6v-.4c0-.7-.3-1.2-.8-1.7-.5-.5-1.1-.7-1.8-.7-1.1 0-1.9.5-2.5 1.4l-1.6-1c.9-1.3 2.2-1.9 4-1.9zm-2.3 6.9c0 .5.2.9.6 1.2.4.3.9.5 1.4.5.8 0 1.5-.3 2.1-.9.6-.6.9-1.3.9-2.1-.6-.5-1.5-.7-2.6-.7-.8 0-1.5.2-2 .6-.4.4-.6.9-.6 1.4zm15.4-6.6L41 19.5h-1.9l2.1-4.6-3.7-8.7h2l2.7 6.5h.1l2.6-6.5h2z" fill="#3c4043"/>
          <path d="M15.6 8.6c0-.5 0-1.1-.1-1.6H8v3h4.3c-.2 1-.7 1.9-1.6 2.4v2h2.6c1.5-1.4 2.3-3.5 2.3-5.8z" fill="#4285F4"/>
          <path d="M8 16.4c2.2 0 4-.7 5.3-2l-2.6-2c-.7.5-1.6.8-2.7.8-2.1 0-3.8-1.4-4.5-3.3H1v2.1C2.3 14.6 5 16.4 8 16.4z" fill="#34A853"/>
          <path d="M3.5 9.9c-.2-.5-.3-1.1-.3-1.6 0-.6.1-1.1.3-1.6V4.6H1C.4 5.8 0 7.1 0 8.3c0 1.3.3 2.5.9 3.6l2.6-2z" fill="#FBBC05"/>
          <path d="M8 3.4c1.2 0 2.3.4 3.1 1.2l2.3-2.3C12 1 10.1.2 8 .2 5 .2 2.3 1.9 1 4.6l2.6 2C4.2 4.7 6 3.4 8 3.4z" fill="#EA4335"/>
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
