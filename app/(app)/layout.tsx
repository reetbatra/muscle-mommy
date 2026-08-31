import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/app-nav";
import { HevyAutoSync } from "@/components/hevy-auto-sync";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarded_at) redirect("/onboarding");

  return (
    <div className="min-h-dvh">
      {children}
      <HevyAutoSync />
      <AppNav />
    </div>
  );
}
