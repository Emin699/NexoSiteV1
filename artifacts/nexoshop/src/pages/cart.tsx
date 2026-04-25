import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  useGetCart, 
  useRemoveFromCart, 
  useClearCart, 
  useValidateCoupon,
  useCheckout,
  useGetPendingOrdersCount,
  useSubmitOrderCustomerInfo,
  getGetCartQueryKey,
  getGetMeQueryKey,
  getGetMeStatsQueryKey,
  getGetOrdersQueryKey,
  getGetPendingOrdersCountQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, ShoppingCart, Tag, CreditCard, ChevronLeft, CheckCircle2, Clock, Package, AlertCircle, ClipboardList, Check } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ThankYouModal } from "@/components/thank-you-modal";
import { ReviewModal } from "@/components/review-modal";

type CheckoutOrder = {
  id: number;
  productId: number;
  productName: string;
  productEmoji: string;
  price: number;
  status: string;
  credentials?: string | null;
  deliveryImageUrl?: string | null;
  customerInfoFields?: string[];
  customerInfo?: Record<string, string> | null;
};

export default function Cart() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const { data: cart, isLoading } = useGetCart();
  const { data: pendingData } = useGetPendingOrdersCount({
    query: { queryKey: getGetPendingOrdersCountQueryKey() },
  });
  const removeFromCart = useRemoveFromCart();
  const clearCart = useClearCart();
  const validateCoupon = useValidateCoupon();
  const checkout = useCheckout();

  const [resultOpen, setResultOpen] = useState(false);
  const [resultOrders, setResultOrders] = useState<CheckoutOrder[]>([]);
  const [thankYouOpen, setThankYouOpen] = useState(false);
  const [reviewProduct, setReviewProduct] = useState<{ productId: number; productName: string } | null>(null);
  const submitInfo = useSubmitOrderCustomerInfo();
  const [infoOrder, setInfoOrder] = useState<CheckoutOrder | null>(null);
  const [infoValues, setInfoValues] = useState<Record<string, string>>({});

  const openInfoDialog = (order: CheckoutOrder) => {
    setInfoOrder(order);
    const initial: Record<string, string> = {};
    for (const f of order.customerInfoFields ?? []) {
      initial[f] = order.customerInfo?.[f] ?? "";
    }
    setInfoValues(initial);
  };

  const handleSubmitInfo = async () => {
    if (!infoOrder) return;
    const fields = infoOrder.customerInfoFields ?? [];
    for (const f of fields) {
      if (!(infoValues[f] ?? "").trim()) {
        toast.error(`Le champ "${f}" est obligatoire`);
        return;
      }
    }
    try {
      await submitInfo.mutateAsync({ id: infoOrder.id, data: { info: infoValues } });
      toast.success("Infos envoyées !");
      setResultOrders((arr) =>
        arr.map((o) =>
          o.id === infoOrder.id ? { ...o, customerInfo: { ...infoValues } } : o
        )
      );
      queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
      setInfoOrder(null);
    } catch {
      toast.error("Erreur lors de l'envoi");
    }
  };

  const handleRemove = async (productId: number) => {
    try {
      await removeFromCart.mutateAsync({ productId });
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast.success("Produit retiré");
    } catch (e) {
      toast.error("Erreur lors du retrait");
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    if (!cart) return;

    try {
      const res = await validateCoupon.mutateAsync({ 
        data: { code: couponCode, cartTotal: cart.total } 
      });
      
      if (res.valid) {
        setAppliedCoupon(couponCode);
        toast.success(res.message);
        // Re-fetch cart to get updated total with coupon if backend stores it
        // Or we just rely on checkout to handle it
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      } else {
        toast.error(res.message);
      }
    } catch (e: any) {
      toast.error(e.message || "Code invalide");
    }
  };

  const handleCheckout = async () => {
    try {
      const res = await checkout.mutateAsync({ 
        data: { couponCode: appliedCoupon } 
      });
      
      if (res.success) {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetPendingOrdersCountQueryKey() });
        setResultOrders(res.orders as CheckoutOrder[]);
        setThankYouOpen(true);
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la commande (solde insuffisant ?)");
    }
  };

  const closeResult = () => {
    setResultOpen(false);
    setLocation("/orders");
  };

  const firstDelivered = resultOrders.find((o) => o.status === "delivered");

  const handleThankYouLater = () => {
    setThankYouOpen(false);
    setResultOpen(true);
  };

  const handleThankYouReview = () => {
    setThankYouOpen(false);
    if (firstDelivered) {
      setReviewProduct({
        productId: firstDelivered.productId,
        productName: firstDelivered.productName,
      });
    } else {
      setResultOpen(true);
    }
  };

  const queueCount = pendingData?.count ?? 0;
  const QUEUE_THRESHOLD = 5;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded"></div>
        <div className="h-32 bg-card rounded-xl"></div>
        <div className="h-32 bg-card rounded-xl"></div>
      </div>
    );
  }

  if ((!cart || cart.items.length === 0) && !resultOpen) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] p-4 text-center">
        <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
          <ShoppingCart className="w-10 h-10 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold mb-2">Votre panier est vide</h2>
        <p className="text-muted-foreground mb-8 max-w-[250px]">
          Découvrez nos produits digitaux et ajoutez-les à votre panier.
        </p>
        <Link href="/">
          <Button className="bg-gradient-to-r from-primary to-secondary text-white border-none rounded-full px-8">
            Parcourir la boutique
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 animate-in fade-in">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/">
          <Button variant="ghost" size="icon" className="rounded-full w-8 h-8">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Mon Panier</h1>
        <Badge variant="secondary" className="ml-auto bg-primary/20 text-primary hover:bg-primary/30">
          {cart.itemCount} articles
        </Badge>
      </div>

      <div className="space-y-3">
        {cart.items.map((item) => (
          <Card key={item.id} className="bg-card/50 border-border/50 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-card to-muted flex items-center justify-center text-2xl border border-white/5 shrink-0">
                {item.productEmoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-sm truncate">{item.productName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-primary font-medium text-sm">{item.price.toFixed(2)}€</span>
                  <span className="text-xs text-muted-foreground px-1.5 py-0.5 rounded bg-muted/50">
                    Qté: {item.quantity}
                  </span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-8 w-8 shrink-0"
                onClick={() => handleRemove(item.productId)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Code promo" 
              className="pl-9 bg-card border-border/50 focus-visible:ring-primary/50"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              disabled={!!appliedCoupon}
            />
          </div>
          <Button 
            variant={appliedCoupon ? "secondary" : "default"}
            onClick={handleApplyCoupon}
            disabled={!couponCode || !!appliedCoupon}
            className={!appliedCoupon ? "bg-primary hover:bg-primary/90 text-primary-foreground" : ""}
          >
            {appliedCoupon ? "Appliqué" : "Appliquer"}
          </Button>
        </div>

        <Card className="bg-card/80 border-primary/20 overflow-hidden shadow-lg shadow-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total</span>
              <span className="font-mono">{cart.subtotal.toFixed(2)}€</span>
            </div>
            
            {cart.discount > 0 && (
              <div className="flex justify-between text-sm text-green-500">
                <span>Réduction</span>
                <span className="font-mono">-{cart.discount.toFixed(2)}€</span>
              </div>
            )}
            
            <div className="h-px bg-border/50 w-full my-2"></div>
            
            <div className="flex justify-between items-center">
              <span className="font-bold text-lg">Total</span>
              <span className="font-mono font-bold text-2xl text-primary">{cart.total.toFixed(2)}€</span>
            </div>
          </CardContent>
          <CardFooter className="p-4 pt-0 flex-col gap-2">
            {queueCount >= QUEUE_THRESHOLD && cart.items.some((i) => i.deliveryType === "manual") && (
              <div className="w-full flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200">
                  <span className="font-semibold">File d'attente chargée</span> · {queueCount} commandes manuelles en cours. Tes commandes manuelles peuvent prendre un peu plus de temps que d'habitude.
                </p>
              </div>
            )}
            <Button 
              className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-medium text-lg rounded-xl shadow-lg shadow-primary/25 border-none"
              onClick={handleCheckout}
              disabled={checkout.isPending}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              {checkout.isPending ? "Paiement..." : "Payer maintenant"}
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Result dialog after checkout */}
      <Dialog open={resultOpen} onOpenChange={(o) => { if (!o) closeResult(); }}>
        <DialogContent className="bg-card border-border max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Commande confirmée !
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            {(() => {
              const auto = resultOrders.filter((o) => o.status === "delivered");
              const manual = resultOrders.filter((o) => o.status === "pending");
              return (
                <>
                  {/* Auto-delivered */}
                  {auto.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-green-500 font-semibold">
                        <Package className="w-3.5 h-3.5" />
                        Livré immédiatement ({auto.length})
                      </div>
                      {auto.map((o) => {
                        const needsInfo = (o.customerInfoFields?.length ?? 0) > 0;
                        const submitted = needsInfo && !!o.customerInfo && Object.keys(o.customerInfo).length > 0;
                        return (
                          <div key={o.id} className="rounded-xl bg-green-500/5 border border-green-500/20 p-3 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{o.productEmoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{o.productName}</p>
                                <p className="text-[10px] text-muted-foreground">Commande #{o.id}</p>
                              </div>
                            </div>
                            {o.credentials && (
                              <div className="rounded-lg bg-background/60 border border-border/40 p-2.5 text-xs whitespace-pre-wrap break-words font-mono">
                                {o.credentials}
                              </div>
                            )}
                            {o.deliveryImageUrl && (
                              <img
                                src={o.deliveryImageUrl}
                                alt=""
                                className="w-full max-h-48 object-contain rounded-lg border border-border/40"
                              />
                            )}
                            {needsInfo && (
                              <Button
                                size="sm"
                                variant={submitted ? "outline" : "default"}
                                className={`h-8 ${submitted
                                  ? "border-green-500/40 text-green-400 hover:bg-green-500/10"
                                  : "bg-amber-500 hover:bg-amber-600 text-black font-semibold"}`}
                                onClick={() => openInfoDialog(o)}
                              >
                                {submitted ? (
                                  <><Check className="w-3.5 h-3.5 mr-1.5" />Modifier mes infos</>
                                ) : (
                                  <><ClipboardList className="w-3.5 h-3.5 mr-1.5" />Compléter mes infos</>
                                )}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Manual pending */}
                  {manual.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-500 font-semibold">
                        <Clock className="w-3.5 h-3.5" />
                        En cours de préparation ({manual.length})
                      </div>
                      {manual.map((o) => {
                        const needsInfo = (o.customerInfoFields?.length ?? 0) > 0;
                        const submitted = needsInfo && !!o.customerInfo && Object.keys(o.customerInfo).length > 0;
                        return (
                          <div key={o.id} className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 flex flex-col gap-2">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{o.productEmoji}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{o.productName}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  Commande <span className="font-mono">#{o.id}</span>
                                </p>
                              </div>
                            </div>
                            {needsInfo && (
                              <Button
                                size="sm"
                                variant={submitted ? "outline" : "default"}
                                className={`h-8 ${submitted
                                  ? "border-green-500/40 text-green-400 hover:bg-green-500/10"
                                  : "bg-amber-500 hover:bg-amber-600 text-black font-semibold"}`}
                                onClick={() => openInfoDialog(o)}
                              >
                                {submitted ? (
                                  <><Check className="w-3.5 h-3.5 mr-1.5" />Modifier mes infos</>
                                ) : (
                                  <><ClipboardList className="w-3.5 h-3.5 mr-1.5" />Compléter mes infos</>
                                )}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                      <p className="text-xs text-muted-foreground px-1">
                        {queueCount >= QUEUE_THRESHOLD
                          ? `⏳ La file d'attente est chargée (${queueCount} commandes). Ta livraison peut prendre un peu plus de temps que d'habitude.`
                          : "Tu vas recevoir tes produits dans quelques instants."}
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <DialogFooter>
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={closeResult}
            >
              Voir mes commandes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer info form sub-dialog */}
      <Dialog open={!!infoOrder} onOpenChange={(o) => { if (!o) setInfoOrder(null); }}>
        <DialogContent className="bg-card border-border max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-amber-500" />
              <div className="flex-1 min-w-0">
                <p className="truncate">Vos infos pour cette commande</p>
                <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                  #{infoOrder?.id} · {infoOrder?.productName}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <p className="text-xs text-muted-foreground">
              Le vendeur a besoin de ces informations pour préparer votre commande.
            </p>
            {(infoOrder?.customerInfoFields ?? []).map((field) => (
              <div key={field} className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  {field} *
                </Label>
                <Input
                  value={infoValues[field] ?? ""}
                  onChange={(e) =>
                    setInfoValues((v) => ({ ...v, [field]: e.target.value }))
                  }
                  className="bg-background border-border/60"
                  placeholder={field}
                />
              </div>
            ))}
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1 border-border"
              onClick={() => setInfoOrder(null)}
            >
              Annuler
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              onClick={handleSubmitInfo}
              disabled={submitInfo.isPending}
            >
              {submitInfo.isPending ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MERCI animation */}
      <ThankYouModal
        open={thankYouOpen}
        onClose={handleThankYouLater}
        onLeaveReview={handleThankYouReview}
        productName={firstDelivered?.productName}
      />

      {/* Review modal */}
      {reviewProduct && (
        <ReviewModal
          open={true}
          onClose={() => {
            setReviewProduct(null);
            setResultOpen(true);
          }}
          productId={reviewProduct.productId}
          productName={reviewProduct.productName}
          onSubmitted={() => {
            setReviewProduct(null);
            setResultOpen(true);
          }}
        />
      )}
    </div>
  );
}
