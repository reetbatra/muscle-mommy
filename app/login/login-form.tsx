"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { FieldRow, Input } from "@/components/ui/field";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/today";

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("sending");

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });

    if (signInError) {
      setStatus("idle");
      setError(signInError.message);
      return;
    }
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-[var(--mint)]">
          <CheckCircle2 className="size-6" aria-hidden />
        </div>
        <p className="font-display text-base font-semibold text-ink">Check your email</p>
        <p className="max-w-[32ch] text-sm text-ink-soft">
          We sent a link to {email}. Open it on your phone so the app lands on the right device.
        </p>
        <Button variant="ghost" size="sm" onClick={() => setStatus("idle")}>
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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

      {error ? (
        <p role="alert" className="text-sm font-medium text-[var(--coral)]">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="glitter"
        size="lg"
        block
        loading={status === "sending"}
        disabled={email.trim().length < 3}
      >
        {status === "sending" ? null : <Mail className="size-4" aria-hidden />}
        Send my link
      </Button>
    </form>
  );
}
