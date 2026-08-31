"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FieldRow, Input } from "@/components/ui/field";
import { SessionFromHash } from "./session-from-hash";

/**
 * Password first, email link second.
 *
 * The email path is unreliable here for reasons that have nothing to do with
 * this app: the project's built-in mail is rate limited to a couple of
 * messages an hour, and a link opened in a different browser than the one that
 * asked for it cannot always complete. A password has none of those failure
 * modes, works on every device, and iOS fills it in after the first time.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/today";
  const callbackError = searchParams.get("error");

  const [mode, setMode] = useState<"password" | "link">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const remembered = window.localStorage.getItem("mm:email");
      if (remembered) setEmail(remembered);
    } catch {
      // Private browsing. Typing it again is the fallback.
    }
  }, []);

  function remember(value: string) {
    try {
      window.localStorage.setItem("mm:email", value);
    } catch {
      // Not worth failing a sign-in over.
    }
  }

  async function signInWithPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("working");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setStatus("idle");
      setError(
        signInError.message.toLowerCase().includes("invalid login")
          ? "That email and password do not match. If you have never set a password, use the email link instead."
          : signInError.message,
      );
      return;
    }

    remember(email.trim());
    router.replace(next.startsWith("/") ? next : "/today");
    router.refresh();
  }

  async function sendLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("working");

    const supabase = createClient();
    const { error: linkError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (linkError) {
      setStatus("idle");
      setError(
        linkError.message.toLowerCase().includes("rate limit")
          ? "The mail server here only allows a couple of emails an hour. Wait a few minutes, or sign in with a password."
          : linkError.message,
      );
      return;
    }

    remember(email.trim());
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <SessionFromHash />
        <CheckCircle2 className="size-6 text-[var(--good)]" aria-hidden />
        <p className="font-display text-lg text-ink">Check your email</p>
        <p className="max-w-[30ch] text-[15px] text-ink-soft">
          Open the link on this phone, in this browser.
        </p>
        <Button variant="ghost" size="sm" onClick={() => setStatus("idle")}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={mode === "password" ? signInWithPassword : sendLink} className="space-y-4">
      <SessionFromHash />

      {callbackError && callbackError !== "missing_code" ? (
        <p role="alert" className="border border-[var(--bad)] px-4 py-3 text-[15px] text-ink">
          {decodeURIComponent(callbackError)}
        </p>
      ) : null}

      <FieldRow label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FieldRow>

      {mode === "password" ? (
        <FieldRow label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            minLength={8}
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FieldRow>
      ) : null}

      {error ? (
        <p role="alert" className="text-[15px] text-[var(--bad)]">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="glitter"
        size="lg"
        block
        loading={status === "working"}
        disabled={email.trim().length < 3 || (mode === "password" && password.length < 8)}
      >
        {status === "working" ? null : mode === "password" ? (
          <KeyRound className="size-4" aria-hidden />
        ) : (
          <Mail className="size-4" aria-hidden />
        )}
        {mode === "password" ? "Sign in" : "Email me a link"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "password" ? "link" : "password");
          setError(null);
        }}
        className="w-full cursor-pointer text-[14px] text-ink-faint underline"
      >
        {mode === "password" ? "Email me a link instead" : "Use a password instead"}
      </button>
    </form>
  );
}
