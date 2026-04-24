import { useState, useMemo, useEffect } from "react";
import {
  useGetWallet,
  useGetTransactions,
  useInitiateCryptoRecharge,
  useGetPendingCryptoRecharges,
  useCancelPendingCryptoRecharge,
  useGetPaypalConfig,
  useCreatePaypalOrder,
  useCapturePaypalOrder,
  getGetWalletQueryKey,
  getGetMeQueryKey,
  getGetTransactionsQueryKey,
  getGetPendingCryptoRechargesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
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
  Clock,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const RECHARGE_AMOUNTS = [5, 10, 20, 30, 50];

export default function Wallet() {
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

  const initiateCrypto = useInitiateCryptoRecharge();
  const cancelPending = useCancelPendingCryptoRecharge();
  const createPaypal = useCreatePaypalOrder();
  const capturePaypal = useCapturePaypalOrder();

  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [paypalAmount, setPaypalAmount] = useState<number>(10);
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
                        variant={selectedAmount === amt ? "default" : "outline"}
                        className={`h-12 ${
                          selectedAmount === amt
                            ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                            : "bg-background hover:bg-muted"
                        }`}
                        onClick={() => setSelectedAmount(amt)}
                      >
                        {amt}€
                      </Button>
                    ))}
                  </div>
                  <Button
                    className="w-full mt-4 bg-gradient-to-r from-primary to-secondary text-white border-none rounded-xl h-12 font-medium"
                    onClick={handleInitiateRecharge}
                    disabled={initiateCrypto.isPending}
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

                    <div className="space-y-2 mb-4">
                      <Label className="text-xs text-muted-foreground">À l'adresse suivante :</Label>
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

          {/* PayPal card */}
          <Card className={`bg-card/50 border-border/50 ${!paypalConfig?.enabled ? "opacity-70" : ""}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
                  P
                </div>
                PayPal
                {paypalConfig?.env === "sandbox" && (
                  <span className="text-[10px] uppercase tracking-wide bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded">
                    sandbox
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                {paypalConfig?.enabled
                  ? "Paiement instantané par carte ou compte PayPal."
                  : "Bientôt disponible — configuration serveur requise."}
              </CardDescription>
            </CardHeader>
            {paypalConfig?.enabled && paypalOptions && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {RECHARGE_AMOUNTS.map((amt) => (
                    <Button
                      key={amt}
                      variant={paypalAmount === amt ? "default" : "outline"}
                      className={`h-12 ${
                        paypalAmount === amt
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                          : "bg-background hover:bg-muted"
                      }`}
                      onClick={() => setPaypalAmount(amt)}
                    >
                      {amt}€
                    </Button>
                  ))}
                </div>
                <PayPalScriptProvider options={paypalOptions} key={`${paypalOptions.clientId}-${paypalAmount}`}>
                  <PayPalButtons
                    style={{ layout: "horizontal", tagline: false, shape: "rect", height: 45 }}
                    createOrder={async () => {
                      const res = await createPaypal.mutateAsync({
                        data: { amountEur: paypalAmount },
                      });
                      return res.orderId;
                    }}
                    onApprove={async (data) => {
                      try {
                        const res = await capturePaypal.mutateAsync({
                          data: { orderId: data.orderID },
                        });
                        if (res.success) {
                          toast.success(`+${res.amountEur.toFixed(2)}€ crédités`, { icon: "💰" });
                          invalidateWallet();
                        }
                      } catch (e) {
                        const msg = e instanceof Error ? e.message : "Capture PayPal échouée";
                        toast.error(msg);
                      }
                    }}
                    onError={(err) => {
                      console.error("PayPal error", err);
                      toast.error("Erreur PayPal");
                    }}
                  />
                </PayPalScriptProvider>
              </CardContent>
            )}
          </Card>
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
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              tx.type === "credit"
                                ? "bg-green-500/10 text-green-500"
                                : "bg-red-500/10 text-red-500"
                            }`}
                          >
                            {tx.type === "credit" ? (
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
                            tx.type === "credit" ? "text-green-500" : "text-foreground"
                          }`}
                        >
                          {tx.type === "credit" ? "+" : "-"}
                          {tx.amount.toFixed(2)}€
                        </div>
                      </div>
                    ))}
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
