import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  useGetCart, 
  useRemoveFromCart, 
  useClearCart, 
  useValidateCoupon,
  useCheckout,
  getGetCartQueryKey,
  getGetMeQueryKey,
  getGetMeStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, ShoppingCart, Tag, ArrowRight, CreditCard, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Cart() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const { data: cart, isLoading } = useGetCart();
  const removeFromCart = useRemoveFromCart();
  const clearCart = useClearCart();
  const validateCoupon = useValidateCoupon();
  const checkout = useCheckout();

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
        toast.success("Commande validée avec succès !", { icon: "🎉" });
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeStatsQueryKey() });
        setLocation("/profile"); // Navigate to profile/orders
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la commande (solde insuffisant ?)");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded"></div>
        <div className="h-32 bg-card rounded-xl"></div>
        <div className="h-32 bg-card rounded-xl"></div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
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
          <CardFooter className="p-4 pt-0">
            <Button 
              className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-medium text-lg rounded-xl shadow-lg shadow-primary/25 border-none"
              onClick={handleCheckout}
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Payer maintenant
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
