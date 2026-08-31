import { Suspense } from "react";
import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 pt-safe pb-10">
      <div className="text-center">
        <div className="mx-auto flex size-12 items-center justify-center bg-[var(--accent)]">
          <Dumbbell className="size-6 text-bg" aria-hidden />
        </div>
        <p className="hand mt-5 text-[32px] leading-none">Muscle Mommy</p>
      </div>

      <div className="mt-8">
        <Suspense fallback={<div className="h-40" aria-hidden />}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-[13px] text-ink-faint">Your data is yours.</p>
    </main>
  );
}
