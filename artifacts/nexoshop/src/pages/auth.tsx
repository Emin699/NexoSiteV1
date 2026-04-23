import { useState } from "react";
import { useAuthRegister, useAuthLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock, User, Eye, EyeOff, ShoppingBag } from "lucide-react";

interface AuthPageProps {
  onAuth: (userId: number, firstName: string, email: string) => void;
}

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const authRegister = useAuthRegister();
  const authLogin = useAuthLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (tab === "register") {
        if (!firstName.trim()) {
          toast.error("Le prénom est requis");
          return;
        }
        const res = await authRegister.mutateAsync({
          data: { email, password, firstName },
        });
        onAuth(res.userId, res.firstName, res.email);
        toast.success(`Bienvenue ${res.firstName} !`);
      } else {
        const res = await authLogin.mutateAsync({
          data: { email, password },
        });
        onAuth(res.userId, res.firstName, res.email);
        toast.success(`Bon retour ${res.firstName} !`);
      }
    } catch (e: unknown) {
      const msg =
        (e as { data?: { error?: string } })?.data?.error ||
        (tab === "login" ? "Email ou mot de passe incorrect" : "Erreur lors de l'inscription");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background text-foreground px-4">
      {/* Background glow */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-[80px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
            <ShoppingBag className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              NexoShop
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Digital Goods · Instant Delivery</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-xl">
          {/* Tabs */}
          <div className="flex rounded-xl bg-muted/30 p-1 mb-6 gap-1">
            {(["login", "register"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  tab === t
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {tab === "register" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="firstName" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Prénom
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="Votre prénom"
                    className="pl-9 bg-background border-border/60 focus:border-primary"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required={tab === "register"}
                    autoComplete="given-name"
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="vous@exemple.com"
                  className="pl-9 bg-background border-border/60 focus:border-primary"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={tab === "register" ? "6 caractères minimum" : "Votre mot de passe"}
                  className="pl-9 pr-10 bg-background border-border/60 focus:border-primary"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={tab === "register" ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md shadow-primary/20 border-none h-11 font-semibold mt-1"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {tab === "login" ? "Connexion..." : "Inscription..."}
                </span>
              ) : tab === "login" ? (
                "Se connecter"
              ) : (
                "Créer mon compte"
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-4">
            {tab === "login" ? "Pas encore de compte ? " : "Déjà inscrit ? "}
            <button
              className="text-primary hover:underline"
              onClick={() => setTab(tab === "login" ? "register" : "login")}
            >
              {tab === "login" ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
