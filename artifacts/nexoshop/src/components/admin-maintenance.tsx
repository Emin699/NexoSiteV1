import { useAdminGetMaintenance, useAdminUpdateMaintenance } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Wrench } from "lucide-react";
import { toast } from "sonner";

type Method = {
  key: "sumupEnabled" | "paypalEnabled" | "ltcEnabled";
  label: string;
  description: string;
  color: string;
};

const METHODS: Method[] = [
  { key: "sumupEnabled", label: "Carte bancaire (SumUp)", description: "Visa, Mastercard, Apple Pay, Google Pay", color: "#3063E9" },
  { key: "paypalEnabled", label: "PayPal", description: "Paiement via compte PayPal", color: "#003087" },
  { key: "ltcEnabled", label: "Litecoin (LTC)", description: "Crypto-monnaie avec bonus +5% / +10%", color: "#345D9D" },
];

export function AdminMaintenance() {
  const { data: flags, isLoading } = useAdminGetMaintenance();
  const update = useAdminUpdateMaintenance();

  const toggle = async (key: Method["key"], current: boolean) => {
    try {
      await update.mutateAsync({ [key]: !current });
      toast.success(!current ? "Activé" : "Désactivé (maintenance)");
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  if (isLoading || !flags) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/20 animate-pulse border border-border/30" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1 mb-1">
        <Wrench className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold">Maintenance des paiements</h3>
      </div>
      <p className="text-[11px] text-muted-foreground px-1 -mt-2">
        Désactive temporairement un moyen de paiement. Les utilisateurs verront "en maintenance" et ne pourront pas créer de nouvelle recharge.
      </p>

      {METHODS.map((m) => {
        const enabled = flags[m.key];
        return (
          <Card key={m.key} className="bg-card/50 border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ background: m.color, boxShadow: `0 2px 8px ${m.color}40` }}>
                <Wrench className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">{m.label}</span>
                  {enabled ? (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/30">
                      ACTIF
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      MAINTENANCE
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{m.description}</p>
              </div>
              <button
                onClick={() => toggle(m.key, enabled)}
                disabled={update.isPending}
                className="relative shrink-0 h-7 w-12 rounded-full transition-colors disabled:opacity-50"
                style={{ background: enabled ? "#22c55e" : "#525252" }}
                aria-label={`Basculer ${m.label}`}
              >
                <span
                  className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
                  style={{ transform: enabled ? "translateX(22px)" : "translateX(2px)" }}
                />
              </button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
