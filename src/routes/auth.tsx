import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useBrand, useDocTitle } from "@/lib/brand";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Accesso staff" },
      { name: "description", content: "Area riservata allo staff dello studio." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const brand = useBrand();
  useDocTitle("Accesso staff");
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "reset">(() =>
    typeof window !== "undefined" && window.location.hash.includes("type=recovery")
      ? "reset"
      : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Da link di recupero: resta qui per impostare la nuova password.
    if (window.location.hash.includes("type=recovery")) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("reset");
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        const { data: session } = await supabase.auth.getSession();
        if (session.session) navigate({ to: "/dashboard" });
        else toast.success("Controlla la tua email per confermare l'account.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast.success("Controlla la tua email per reimpostare la password.");
        setMode("signin");
      } else if (mode === "reset") {
        if (newPassword.length < 6) throw new Error("Scegli almeno 6 caratteri.");
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        toast.success("Password aggiornata.");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Accesso non riuscito");
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error("Accesso con Google non riuscito");
    }
  };

  return (
    <div className="gradient-blush flex min-h-screen items-center justify-center px-5 py-12">
      <div className="surface-card w-full max-w-md p-8">
        <Link to="/" className="eyebrow">
          ← {brand.name}
        </Link>
        <h1 className="mt-4 font-display text-4xl">
          {mode === "signin" && "Area riservata"}
          {mode === "signup" && "Crea il tuo accesso"}
          {mode === "forgot" && "Recupera password"}
          {mode === "reset" && "Nuova password"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Riservata allo staff dello studio.</p>

        <div className="mt-7 space-y-3">
          {mode === "signup" && (
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nome e cognome"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary/60"
            />
          )}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary/60"
          />
          {(mode === "signin" || mode === "signup") && (
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Password"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary/60"
            />
          )}
          {mode === "reset" && (
            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              placeholder="Nuova password (min. 6 caratteri)"
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary/60"
            />
          )}
          <button
            onClick={submit}
            disabled={loading}
            className="silk w-full rounded-full bg-primary px-6 py-3.5 text-[0.7rem] tracking-[0.24em] uppercase text-primary-foreground disabled:opacity-50"
          >
            {mode === "signin" && "Accedi"}
            {mode === "signup" && "Registrati"}
            {mode === "forgot" && "Invia link di recupero"}
            {mode === "reset" && "Imposta nuova password"}
          </button>
          {(mode === "signin" || mode === "signup") && (
            <button
              onClick={google}
              className="silk w-full rounded-full border border-border px-6 py-3.5 text-[0.7rem] tracking-[0.24em] uppercase hover:bg-accent/40"
            >
              Continua con Google
            </button>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          {(mode === "signin" || mode === "signup") && (
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="silk text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {mode === "signin" ? "Non hai un accesso? Registrati" : "Hai già un accesso? Accedi"}
            </button>
          )}
          {mode === "signin" && (
            <button
              onClick={() => setMode("forgot")}
              className="silk text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Password dimenticata?
            </button>
          )}
          {(mode === "forgot" || mode === "reset") && (
            <button
              onClick={() => setMode("signin")}
              className="silk text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Torna all'accesso
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
