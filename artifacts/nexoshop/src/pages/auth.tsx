import { useState, useEffect } from "react";
import { useAuthRegister, useAuthLogin, useAuthVerifyEmail, useAuthResendCode } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, Lock, User, Eye, EyeOff, ShieldCheck, ArrowLeft, RefreshCw, Info } from "lucide-react";
import { useLocation } from "wouter";

interface AuthPageProps {
  onAuth: (token: string | null | undefined, firstName: string, email: string) => void;
}

type Mode = "login" | "register" | "verify";

export default function AuthPage({ onAuth }: AuthPageProps) {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Verification state
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [pendingFirstName, setPendingFirstName] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Referral code captured from ?ref= in the URL.
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const authRegister = useAuthRegister();
  const authLogin = useAuthLogin();
  const authVerify = useAuthVerifyEmail();
  const authResend = useAuthResendCode();

  // Capture ?ref= from the URL (and remember it across the session).
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("nexoshop_ref");
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("ref");
      if (fromUrl && /^\d+$/.test(fromUrl)) {
        sessionStorage.setItem("nexoshop_ref", fromUrl);
        setReferralCode(fromUrl);
        setMode("register");
        // Clean the URL so the param is not kept after navigation.
        params.delete("ref");
        const newSearch = params.toString();
        const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : "") + window.location.hash;
        window.history.replaceState({}, "", newUrl);
      } else if (stored && /^\d+$/.test(stored)) {
        setReferralCode(stored);
      }
    } catch {
      // sessionStorage may be unavailable (private mode); ignore.
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const goToVerify = (userId: number, name: string, mail: string) => {
    setPendingUserId(userId);
    setPendingFirstName(name);
    setPendingEmail(mail);
    setCode("");
    setResendCooldown(60);
    setMode("verify");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        if (!firstName.trim()) {
          toast.error("Le prénom est requis");
          return;
        }
        const res = await authRegister.mutateAsync({
          data: { email, password, firstName, ...(referralCode ? { referralCode } : {}) },
        });
        if (res.needsVerification) {
          toast.success("Code envoyé sur ton email !");
          goToVerify(res.userId, res.firstName, res.email);
        } else {
          onAuth(res.token, res.firstName, res.email);
          toast.success(`Bienvenue ${res.firstName} !`);
          setLocation("/");
        }
      } else if (mode === "login") {
        const res = await authLogin.mutateAsync({ data: { email, password } });
        if (res.needsVerification) {
          toast.message("Vérifie ton email pour continuer");
          goToVerify(res.userId, res.firstName, res.email);
        } else {
          onAuth(res.token, res.firstName, res.email);
          toast.success(`Bon retour ${res.firstName} !`);
          setLocation("/");
        }
      }
    } catch (e: unknown) {
      const errData = (e as { data?: { error?: string; needsVerification?: boolean; userId?: number; firstName?: string; email?: string } })?.data;
      // Login of unverified user → 403 with verification info
      if (errData?.needsVerification && errData.userId) {
        toast.message("Vérifie ton email pour continuer");
        goToVerify(errData.userId, errData.firstName ?? "", errData.email ?? email);
        return;
      }
      const msg = errData?.error || (mode === "login" ? "Email ou mot de passe incorrect" : "Erreur lors de l'inscription");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUserId || code.length !== 6) {
      toast.error("Saisis les 6 chiffres reçus par email");
      return;
    }
    setLoading(true);
    try {
      const res = await authVerify.mutateAsync({ data: { userId: pendingUserId, code } });
      onAuth(res.token, res.firstName, res.email);
      toast.success(`Bienvenue ${res.firstName} ! Email vérifié 🎉`);
      setLocation("/");
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error || "Code incorrect";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingUserId || resendCooldown > 0) return;
    try {
      await authResend.mutateAsync({ data: { userId: pendingUserId } });
      toast.success("Nouveau code envoyé !");
      setResendCooldown(60);
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error || "Impossible d'envoyer le code";
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-background text-foreground px-4 py-6">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-[80px]" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          {mode === "verify" ? (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          ) : (
            <img
              src="/nexoshop-icon.png"
              alt="NexoShop"
              className="w-16 h-16 rounded-2xl shadow-lg shadow-primary/30 select-none"
              draggable={false}
            />
          )}
          <div className="text-center">
            <img
              src="/nexoshop-logo.png"
              alt="NexoShop"
              className="h-7 w-auto mx-auto select-none"
              draggable={false}
            />
            <p className="text-xs text-muted-foreground mt-1">Digital Goods · Instant Delivery</p>
          </div>
        </div>

        <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-6 shadow-xl">
          {mode === "verify" ? (
            <form onSubmit={handleVerify} className="flex flex-col gap-4">
              <button
                type="button"
                onClick={() => setMode("login")}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground -mt-1 mb-1 self-start"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Retour
              </button>
              <div className="text-center mb-1">
                <h2 className="text-lg font-bold">Vérifie ton email</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Code envoyé à <span className="text-primary font-medium">{pendingEmail}</span>
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="code" className="text-xs text-muted-foreground uppercase tracking-wider">
                  Code à 6 chiffres
                </Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  placeholder="000000"
                  className="text-center text-2xl font-mono tracking-[0.5em] font-bold bg-background border-border/60 focus:border-primary h-14"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoFocus
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md shadow-primary/20 border-none h-11 font-semibold"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Vérification...
                  </span>
                ) : (
                  "Vérifier"
                )}
              </Button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed mt-1"
              >
                <RefreshCw className="w-3 h-3" />
                {resendCooldown > 0 ? `Renvoyer le code dans ${resendCooldown}s` : "Renvoyer le code"}
              </button>

              <p className="text-[11px] text-muted-foreground/70 text-center mt-1">
                Pense à vérifier tes spams si tu ne reçois rien.
              </p>
            </form>
          ) : (
            <>
              <div className="flex rounded-xl bg-muted/30 p-1 mb-6 gap-1">
                {(["login", "register"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setMode(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      mode === t
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "login" ? "Connexion" : "Inscription"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {mode === "register" && (
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
                        required={mode === "register"}
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
                  {mode === "register" && (
                    <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground/90 mt-1 leading-snug">
                      <Info className="w-3 h-3 mt-0.5 shrink-0 text-primary/70" />
                      <span>
                        Utilise un email <span className="text-foreground font-medium">valide</span> — un code de vérification va y être envoyé.
                      </span>
                    </p>
                  )}
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
                      placeholder={mode === "register" ? "6 caractères minimum" : "Votre mot de passe"}
                      className="pl-9 pr-10 bg-background border-border/60 focus:border-primary"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
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
                      {mode === "login" ? "Connexion..." : "Inscription..."}
                    </span>
                  ) : mode === "login" ? (
                    "Se connecter"
                  ) : (
                    "Créer mon compte"
                  )}
                </Button>
              </form>

              <p className="text-center text-xs text-muted-foreground mt-4">
                {mode === "login" ? "Pas encore de compte ? " : "Déjà inscrit ? "}
                <button
                  className="text-primary hover:underline"
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                >
                  {mode === "login" ? "S'inscrire" : "Se connecter"}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
