import { Suspense } from "react";
import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 pt-safe pb-10">
      <div className="text-center">
        <div className="glitter-fill mx-auto flex size-14 items-center justify-center rounded-2xl">
          <Dumbbell className="size-7 text-white" aria-hidden />
        </div>
        <h1 className="font-display mt-5 text-3xl font-bold">
          <span className="glitter-text">Muscle Mommy</span>
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Enter your email and we send you a link. No password to forget.
        </p>
      </div>

      <div className="card mt-7 p-6">
        <Suspense fallback={<div className="h-40" aria-hidden />}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="mt-6 text-center text-xs leading-relaxed text-ink-faint">
        Your data is yours. Nothing here is shared with anyone else.
      </p>
    </main>
  );
}
