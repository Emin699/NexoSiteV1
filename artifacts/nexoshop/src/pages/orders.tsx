import { useState } from "react";
import { Link } from "wouter";
import { useGetOrders, getGetOrdersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, Package, Clock, CheckCircle2, X, Eye } from "lucide-react";

type Order = {
  id: number;
  productName: string;
  productEmoji: string;
  price: number;
  status: string;
  credentials?: string | null;
  deliveryImageUrl?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
};

export default function Orders() {
  const { data: orders, isLoading } = useGetOrders({
    query: { queryKey: getGetOrdersQueryKey() },
  });
  const [selected, setSelected] = useState<Order | null>(null);
  const [imageOpen, setImageOpen] = useState(false);

  const list = (orders ?? []) as Order[];
  const delivered = list.filter((o) => o.status === "delivered").length;
  const pending = list.filter((o) => o.status === "pending").length;

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-8 w-40 bg-muted rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-card rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 animate-in fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full w-8 h-8">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Mes commandes</h1>
          <p className="text-xs text-muted-foreground">
            {list.length} commande{list.length > 1 ? "s" : ""} au total
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none">{delivered}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Livrées</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none">{pending}</p>
              <p className="text-[10px] text-muted-foreground mt-1">En attente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          <Package className="w-12 h-12 opacity-30" />
          <p className="text-sm">Vous n'avez encore passé aucune commande.</p>
          <Link href="/">
            <Button size="sm" className="mt-2">
              Découvrir la boutique
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((order) => {
            const isDelivered = order.status === "delivered";
            return (
              <Card
                key={order.id}
                className={`bg-card/60 ${isDelivered ? "border-green-500/20" : "border-amber-500/20"}`}
              >
                <CardContent className="p-3 flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center text-2xl shrink-0 ${isDelivered ? "bg-green-500/10" : "bg-amber-500/10"}`}>
                    {order.productEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{order.productName}</p>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1 py-0 h-4 ${isDelivered ? "border-green-500/40 text-green-500" : "border-amber-500/40 text-amber-500"}`}
                      >
                        #{order.id}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {isDelivered ? (
                        <span className="text-[10px] text-green-500 flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          Livrée
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-500 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          En cours de préparation
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        · {order.price.toFixed(2)}€
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(order.createdAt).toLocaleString("fr-FR")}
                    </p>
                  </div>
                  {isDelivered && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-8 border-green-500/40 text-green-400 hover:bg-green-500/10"
                      onClick={() => setSelected(order)}
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Voir
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Order details dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) setSelected(null); }}>
        <DialogContent className="bg-card border-border max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selected?.productEmoji}</span>
              <div className="flex-1 min-w-0">
                <p className="truncate">{selected?.productName}</p>
                <p className="text-[10px] text-muted-foreground font-normal">
                  Commande #{selected?.id}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-500 font-medium">Livrée</span>
              {selected?.deliveredAt && (
                <span className="text-muted-foreground">
                  · {new Date(selected.deliveredAt).toLocaleString("fr-FR")}
                </span>
              )}
            </div>

            {selected?.credentials && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                  Contenu de livraison
                </p>
                <div className="rounded-lg bg-background/60 border border-border/40 p-3 text-sm whitespace-pre-wrap break-words font-mono">
                  {selected.credentials}
                </div>
              </div>
            )}

            {selected?.deliveryImageUrl && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                  Image
                </p>
                <button
                  type="button"
                  onClick={() => setImageOpen(true)}
                  className="block w-full"
                >
                  <img
                    src={selected.deliveryImageUrl}
                    alt=""
                    className="w-full max-h-64 object-contain rounded-lg border border-border/40 cursor-zoom-in"
                  />
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image lightbox */}
      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="bg-black/95 border-none max-w-full max-h-[100dvh] p-0 sm:max-w-2xl">
          <button
            type="button"
            onClick={() => setImageOpen(false)}
            className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          {selected?.deliveryImageUrl && (
            <img
              src={selected.deliveryImageUrl}
              alt=""
              className="w-full h-auto max-h-[90dvh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
