"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";

const schema = z.object({
  date: z.iso.date(),
  flow: z.enum(["none", "spotting", "light", "medium", "heavy"]),
  symptoms: z.array(z.string().max(40)).max(12).default([]),
});

export async function logCycleDay(input: z.infer<typeof schema>) {
  const { date, flow, symptoms } = schema.parse(input);
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("cycle_days")
    .upsert({ user_id: user.id, log_date: date, flow, symptoms }, { onConflict: "user_id,log_date" });
  if (error) throw new Error(`Could not save that: ${error.message}`);

  revalidatePath("/today");
  revalidatePath("/progress");
}
