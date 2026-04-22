import { Link } from "wouter";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex flex-col items-center justify-center text-center p-4">
      <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
        <AlertCircle className="w-10 h-10 text-destructive" />
      </div>
      <h1 className="text-4xl font-black mb-2">404</h1>
      <p className="text-xl text-muted-foreground mb-8">Page non trouvée</p>
      
      <p className="text-sm text-muted-foreground max-w-sm mb-8">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>

      <Link href="/" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
        Retour à l'accueil
      </Link>
    </div>
  );
}
