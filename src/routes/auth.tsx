import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Accesso staff — Studio Nails" },
      { name: "description", content: "Area riservata a nail artist e proprietario." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

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
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Accesso con Google non riuscito");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="gradient-blush flex min-h-screen items-center justify-center px-5 py-12">
      <div className="surface-card w-full max-w-md p-8">
        <Link to="/" className="eyebrow">
          ← Studio Nails
        </Link>
        <h1 className="mt-4 font-display text-4xl">
          {mode === "signin" ? "Area riservata" : "Crea il tuo accesso"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Riservata alla nail artist e al proprietario dello studio.
        </p>

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
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary/60"
          />
          <button
            onClick={submit}
            disabled={loading}
            className="silk w-full rounded-full bg-primary px-6 py-3.5 text-[0.7rem] tracking-[0.24em] uppercase text-primary-foreground disabled:opacity-50"
          >
            {mode === "signin" ? "Accedi" : "Registrati"}
          </button>
          <button
            onClick={google}
            className="silk w-full rounded-full border border-border px-6 py-3.5 text-[0.7rem] tracking-[0.24em] uppercase hover:bg-accent/40"
          >
            Continua con Google
          </button>
        </div>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="silk mt-6 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {mode === "signin" ? "Non hai un accesso? Registrati" : "Hai già un accesso? Accedi"}
        </button>
      </div>
    </div>
  );
}
