import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/vanti/wordmark";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in or create your Vanti account" },
      {
        name: "description",
        content:
          "Log in to Vanti or create an account and start with a $10,000.00 virtual balance. Virtual money only.",
      },
      { property: "og:title", content: "Sign in or create your Vanti account" },
      {
        property: "og:description",
        content: "Create a Vanti account and start with a $10,000.00 virtual balance.",
      },
    ],
  }),
  component: AuthPage,
});

const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const handle = username.trim();
        if (!USERNAME_RE.test(handle)) {
          toast.error("Username must be 3–20 characters: letters, numbers or underscores.");
          return;
        }
        const { data: taken, error: lookupError } = await supabase
          .from("profiles")
          .select("username")
          .eq("username", handle.toLowerCase())
          .maybeSingle();
        if (lookupError) throw lookupError;
        if (taken) {
          toast.error("That username is already taken.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username: handle.toLowerCase(), display_name: handle },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSentConfirmation(true);
          return;
        }
        toast.success("Welcome to Vanti — $10,000.00 virtual balance granted.");
        navigate({ to: "/home", replace: true });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      navigate({ to: "/home", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4 py-12">
      <Link to="/" className="mb-8">
        <Wordmark className="text-2xl" />
      </Link>

      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-sm">
        {sentConfirmation ? (
          <div className="space-y-3 text-center">
            <h1 className="text-lg font-semibold text-foreground">Confirm your email</h1>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to <span className="font-medium">{email}</span>. Open it
              to activate your account and claim your $10,000.00 virtual balance.
            </p>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setSentConfirmation(false);
                setMode("login");
              }}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-foreground">
              {mode === "login" ? "Sign in to Vanti" : "Create your account"}
            </h1>
            <p className="mt-1 text-meta text-muted-foreground">
              Every account starts with a <span className="num">$10,000.00</span> virtual balance.
              Virtual money only — no deposits, ever.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="marketmaker_01"
                    autoComplete="username"
                    required
                  />
                  <p className="text-meta text-muted-foreground">
                    3–20 characters. Letters, numbers and underscores.
                  </p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="mt-4 w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {mode === "login"
                ? "New to Vanti? Create an account"
                : "Already have an account? Sign in"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}