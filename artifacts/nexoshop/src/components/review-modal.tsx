import { useRef, useState } from "react";
import { useSubmitReview } from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Star, Gift, ImagePlus, X, Loader2 } from "lucide-react";

interface ReviewModalProps {
  open: boolean;
  onClose: () => void;
  productId: number;
  productName: string;
}

export function ReviewModal({ open, onClose, productId, productName }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submitReview = useSubmitReview();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop volumineuse (max 5 Mo)");
      return;
    }
    setUploading(true);
    try {
      const token = localStorage.getItem("nexoshop_token") || "";
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/reviews/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec de l'upload");
      }
      const data: { url: string } = await res.json();
      setImageUrl(data.url);
      toast.success("Image ajoutée");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Veuillez sélectionner une note");
      return;
    }
    try {
      await submitReview.mutateAsync({
        data: { productId, rating, comment, imageUrl: imageUrl ?? null },
      });
      toast.success("Avis envoyé ! +1 tour de roue offert !", {
        description: "Rendez-vous dans Profil > Roue du destin",
        duration: 5000,
      });
      setRating(0);
      setComment("");
      setImageUrl(null);
      onClose();
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error;
      toast.error(msg || "Erreur lors de l'envoi de l'avis");
    }
  };

  const handleSkip = () => {
    setRating(0);
    setComment("");
    setImageUrl(null);
    onClose();
  };

  const displayRating = hoverRating || rating;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Votre avis compte !</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 py-2">
          {/* Product name */}
          <p className="text-sm text-muted-foreground text-center">
            Comment évaluez-vous <span className="text-foreground font-medium">"{productName}"</span> ?
          </p>

          {/* Stars */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`w-9 h-9 transition-colors ${
                    star <= displayRating
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Rating label */}
          {displayRating > 0 && (
            <p className="text-center text-sm font-medium text-primary animate-in fade-in">
              {displayRating === 1 && "Très déçu"}
              {displayRating === 2 && "Pas terrible"}
              {displayRating === 3 && "Correct"}
              {displayRating === 4 && "Bien !"}
              {displayRating === 5 && "Excellent !"}
            </p>
          )}

          {/* Comment */}
          <Textarea
            placeholder="Laissez un commentaire (optionnel)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="bg-background border-border/60 resize-none text-sm"
            rows={3}
            maxLength={500}
          />

          {/* Image upload */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {imageUrl ? (
              <div className="relative inline-block">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="max-h-32 rounded-lg border border-border/60"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  aria-label="Retirer l'image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-dashed border-border/60 text-muted-foreground hover:text-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi...
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-4 h-4 mr-2" /> Ajouter une photo (optionnel)
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Reward banner */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
            <Gift className="w-5 h-5 text-primary shrink-0" />
            <p className="text-xs text-primary/90">
              En échange de votre avis, vous recevez <strong>+1 tour de roue gratuit</strong> !
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 text-muted-foreground"
              onClick={handleSkip}
            >
              Passer
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-gradient-to-r from-primary to-secondary border-none"
              onClick={handleSubmit}
              disabled={submitReview.isPending || rating === 0}
            >
              {submitReview.isPending ? "Envoi..." : "Envoyer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
