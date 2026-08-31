"use client";

import { useState, useTransition } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FieldRow, Input } from "@/components/ui/field";
import { setPassword } from "@/lib/actions/settings";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [value, setValue] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, startTransition] = useTransition();

  const mismatch = confirm.length > 0 && value !== confirm;

  return (
    <div className="space-y-4">
      <p className="text-[15px] leading-relaxed text-ink-soft">
        {hasPassword
          ? "Change the password you sign in with."
          : "Set a password and you never have to wait for an email again. The mail server on this plan only allows a couple of messages an hour, which is why links keep failing."}
      </p>

      <FieldRow label="Password" htmlFor="new-password" hint="At least 8 characters.">
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Something your phone can remember"
        />
      </FieldRow>

      <FieldRow label="Again" htmlFor="confirm-password">
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </FieldRow>

      {mismatch ? (
        <p role="alert" className="text-[15px] text-[var(--bad)]">
          Those two do not match.
        </p>
      ) : null}

      <Button
        variant="glitter"
        size="lg"
        block
        loading={pending}
        disabled={value.length < 8 || value !== confirm}
        onClick={() =>
          startTransition(async () => {
            try {
              await setPassword(value);
              setValue("");
              setConfirm("");
              toast.success("Password set. Use it to sign in from now on.");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not set that.");
            }
          })
        }
      >
        <KeyRound className="size-4" aria-hidden />
        {hasPassword ? "Change password" : "Set password"}
      </Button>
    </div>
  );
}
