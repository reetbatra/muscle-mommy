import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRoutine } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import { Screen } from "@/components/screen";
import { SplitEditor } from "@/components/lift/split-editor";
import type { Exercise } from "@/lib/domain/types";

export const metadata: Metadata = { title: "Edit your split" };
export const dynamic = "force-dynamic";

export default async function EditSplitPage() {
  const { supabase, user } = await requireUser();
  const [days, { data: library }] = await Promise.all([
    getRoutine(),
    supabase
      .from("exercises")
      .select("id, user_id, name, muscle_group, equipment")
      .or(`user_id.is.null,user_id.eq.${user.id}`)
      .order("name"),
  ]);

  return (
    <Screen>
      <div className="pt-5">
        <Link
          href="/lift"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-ink-soft transition-colors duration-200 hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Split
        </Link>
      </div>

      <header className="pt-3 pb-5">
        <h1 className="font-display text-[27px] leading-tight font-semibold text-ink">
          Edit your split
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          Reorder, swap and retune anything. The rep ceiling and the load type are what the
          progression engine reads, so those two are worth getting right.
        </p>
      </header>

      <SplitEditor days={days} library={(library ?? []) as Exercise[]} />
    </Screen>
  );
}
