import { useState, useRef } from "react";
import {
  useAdminGetPendingOrders,
  useAdminDeliverOrder,
  getAdminGetPendingOrdersQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Send, Clock, Upload, X, Image as ImageIcon, Inbox } from "lucide-react";
import { toast } from "sonner";

type PendingOrder = {
  id: number;
  userId: number;
  userPseudo: string;
  userEmail: string;
  productId: number;
  productName: string;
  productEmoji: string;
  price: number;
  createdAt: string;
  digitalContent?: string | null;
  digitalImageUrl?: string | null;
};

export function AdminOrders() {
  const qc = useQueryClient();
  const { data, isLoading } = useAdminGetPendingOrders({
    query: { queryKey: getAdminGetPendingOrdersQueryKey() },
  });
  const deliver = useAdminDeliverOrder();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<PendingOrder | null>(null);
  const [credentials, setCredentials] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const items = (data?.items ?? []) as PendingOrder[];

  const openDeliver = (order: PendingOrder) => {
    setSelected(order);
    setCredentials(order.digitalContent ?? "");
    setImageUrl(order.digitalImageUrl ?? "");
    setDialogOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("nexoshop_token");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setImageUrl(url);
      toast.success("Image téléversée !");
    } catch {
      toast.error("Erreur de téléversement");
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!selected) return;
    if (!credentials.trim()) {
      toast.error("Le contenu de livraison est obligatoire");
      return;
    }
    try {
      await deliver.mutateAsync({
        id: selected.id,
        data: {
          credentials: credentials.trim(),
          deliveryImageUrl: imageUrl.trim() || null,
        },
      });
      toast.success(`Commande #${selected.id} envoyée à ${selected.userPseudo}`);
      qc.invalidateQueries({ queryKey: getAdminGetPendingOrdersQueryKey() });
      setDialogOpen(false);
    } catch {
      toast.error("Erreur lors de l'envoi");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/20 animate-pulse border border-border/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Header info */}
      <div className="flex items-center gap-2 px-1">
        <Clock className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium">{items.length} commande{items.length > 1 ? "s" : ""} en attente</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground border border-dashed border-border rounded-xl">
          <Inbox className="w-10 h-10 opacity-40" />
          <span className="text-sm">Aucune commande en attente</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((order) => (
            <Card key={order.id} className="bg-card/60 border-amber-500/20">
              <CardContent className="p-3 flex flex-col gap-2.5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-xl shrink-0">
                    {order.productEmoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{order.productName}</p>
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-amber-500/40 text-amber-500">
                        #{order.id}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {order.userPseudo} <span className="opacity-60">· {order.userEmail}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(order.createdAt).toLocaleString("fr-FR")} · {order.price.toFixed(2)}€
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                  onClick={() => openDeliver(order)}
                >
                  <Send className="w-3.5 h-3.5 mr-1.5" />
                  Envoyer la commande
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Deliver dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Envoyer #{selected?.id} — {selected?.productName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3 py-2">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Contenu de livraison *
              </Label>
              <Textarea
                value={credentials}
                onChange={(e) => setCredentials(e.target.value)}
                placeholder="Identifiants, code, instructions..."
                className="bg-background border-border/60 min-h-[120px] text-sm"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Ce texte sera affiché au client.
              </p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Image (optionnel)
              </Label>
              {imageUrl && (
                <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border/50 bg-muted/20 mb-2">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-border/60 text-sm"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                {imageUrl ? (
                  <ImageIcon className="w-4 h-4 mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {uploading ? "Téléversement..." : imageUrl ? "Changer l'image" : "Ajouter une image"}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button
              variant="outline"
              className="flex-1 border-border"
              onClick={() => setDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              onClick={handleSend}
              disabled={deliver.isPending || !credentials.trim()}
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              {deliver.isPending ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
