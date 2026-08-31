import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env.local", "utf8").split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// A route that answers with HTML has been swallowed by the proxy, which is a
// failure in itself.
const asJson = async (res) => {
  const body = await res.text();
  try { return JSON.parse(body); } catch { return { notJson: body.slice(0, 60) }; }
};

const email = `verify-${Date.now()}@musclemommy.test`;
let pass = 0, fail = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${name}${extra ? "  " + extra : ""}`);
  ok ? pass++ : fail++;
};

console.log("\n--- signup trigger ---");
const { data: created, error: createError } = await admin.auth.admin.createUser({
  email, email_confirm: true, user_metadata: { display_name: "Verify" },
});
if (createError) { console.error(createError); process.exit(1); }
const uid = created.user.id;

const [{ data: profile }, { data: goals }, { data: habits }] = await Promise.all([
  admin.from("profiles").select("*").eq("id", uid).maybeSingle(),
  admin.from("goals").select("*").eq("user_id", uid).maybeSingle(),
  admin.from("habits").select("*").eq("user_id", uid).order("sort_order"),
]);
check("profile row created", !!profile, profile?.display_name);
check("goals row created", !!goals, `${goals?.calorie_target} kcal`);
check("8 starter habits seeded", habits?.length === 8, habits?.map(h => h.key).join(", "));
check("brush is twice a day", habits?.find(h => h.key === "brush")?.target_per_day === 2);
check("dumbbell rack defaulted", (profile?.dumbbell_rack ?? []).length === 11, String(profile?.dumbbell_rack));
check("machine increment is 5kg", Number(profile?.machine_increment_kg) === 5);

console.log("\n--- exercise library ---");
const { count } = await admin.from("exercises").select("*", { count: "exact", head: true }).is("user_id", null);
check("library seeded", (count ?? 0) >= 94, `${count} exercises`);
const templateNames = ["Dumbbell Bench Press","Seated Cable Row","Lat Pulldown","Dumbbell Shoulder Press",
  "Single-Arm Overhead Triceps Extension","Dumbbell Curl","Banded Push-Up","Leg Press","Smith Machine Hip Thrust",
  "Leg Extension","Standing Calf Raise","Banded Pull-Up","Incline Dumbbell Press","Single-Arm Cable Row",
  "Lateral Raise","Hammer Curl","Push-Up","Dumbbell Romanian Deadlift","Bulgarian Split Squat","Seated Leg Curl",
  "Hip Abduction Machine","Seated Calf Raise"];
const { data: found } = await admin.from("exercises").select("name").is("user_id", null).in("name", templateNames);
const missing = templateNames.filter(n => !(found ?? []).some(f => f.name === n));
check("every template exercise exists", missing.length === 0, missing.join(", "));

console.log("\n--- row level security ---");
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { data: leaked } = await anon.from("habits").select("*").limit(5);
check("anon cannot read habits", (leaked ?? []).length === 0);
const { data: leakedProfiles } = await anon.from("profiles").select("*").limit(5);
check("anon cannot read profiles", (leakedProfiles ?? []).length === 0);
const { data: publicLibrary } = await anon.from("exercises").select("id").is("user_id", null).limit(5);
check("anon CAN read the shared library", (publicLibrary ?? []).length === 5);
const { error: writeError } = await anon.from("goals").update({ calorie_target: 1 }).eq("user_id", uid);
const { data: afterWrite } = await admin.from("goals").select("calorie_target").eq("user_id", uid).maybeSingle();
check("anon cannot write goals", afterWrite?.calorie_target !== 1, writeError?.message ?? "silently blocked");

console.log("\n--- ingest token ---");
const token = `mm_verify_${Date.now()}`;
const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
const hash = [...new Uint8Array(hashBuf)].map(b => b.toString(16).padStart(2, "0")).join("");
await admin.from("ingest_tokens").insert({ user_id: uid, token_hash: hash, token_prefix: token.slice(0, 8), label: "verify" });

const base = process.env.BASE_URL ?? "https://muscle-mommy.vercel.app";
const noAuth = await fetch(`${base}/api/health/ingest`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
check("rejects a request with no token", noAuth.status === 401, `got ${noAuth.status}`);

const badAuth = await fetch(`${base}/api/health/ingest`, {
  method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer mm_not_a_real_token" }, body: JSON.stringify({ date: "2026-08-31" }),
});
check("rejects a wrong token", badAuth.status === 401, `got ${badAuth.status}`);

const today = "2026-08-31";
const good = await fetch(`${base}/api/health/ingest`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ date: today, steps: "8421", active_kcal: 412, basal_kcal: 1380, weight_kg: 61.2, sleep_minutes: 431, flow: "medium" }),
});
const goodBody = await asJson(good);
check("accepts a valid push", good.status === 200, JSON.stringify(goodBody));

const { data: healthRow } = await admin.from("health_days").select("*").eq("user_id", uid).eq("log_date", today).maybeSingle();
check("steps arrive as a number from a string", healthRow?.steps === 8421, String(healthRow?.steps));
check("resting energy stored", healthRow?.basal_kcal === 1380);
const { data: cycleRow } = await admin.from("cycle_days").select("*").eq("user_id", uid).eq("log_date", today).maybeSingle();
check("cycle flow stored", cycleRow?.flow === "medium");

const partial = await fetch(`${base}/api/health/ingest`, {
  method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ date: today, steps: 9999 }),
});
const { data: merged } = await admin.from("health_days").select("*").eq("user_id", uid).eq("log_date", today).maybeSingle();
check("a steps-only push does not wipe weight", Number(merged?.weight_kg) === 61.2 && merged?.steps === 9999,
  `steps ${merged?.steps}, weight ${merged?.weight_kg}`);

const bad = await fetch(`${base}/api/health/ingest`, {
  method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ date: "not-a-date" }),
});
check("rejects a malformed date", bad.status === 422, `got ${bad.status}`);

console.log("\n--- hevy endpoints ---");
const hevyNoSession = await fetch(`${base}/api/hevy/sync`, { method: "POST" });
check("sync refuses a request with no session", hevyNoSession.status === 401, `got ${hevyNoSession.status}`);

const cronNoSecret = await fetch(`${base}/api/hevy/sync`);
check("cron refuses a request with no secret", cronNoSecret.status === 401, `got ${cronNoSecret.status}`);

const cronBadSecret = await fetch(`${base}/api/hevy/sync`, { headers: { Authorization: "Bearer nope" } });
check("cron refuses a wrong secret", cronBadSecret.status === 401, `got ${cronBadSecret.status}`);

if (env.CRON_SECRET) {
  const cronGood = await fetch(`${base}/api/hevy/sync`, {
    headers: { Authorization: `Bearer ${env.CRON_SECRET}` },
  });
  const cronBody = await asJson(cronGood);
  check("cron runs with the right secret", cronGood.status === 200, JSON.stringify(cronBody).slice(0, 90));
}

for (const table of ["hevy_connections", "hevy_workout_links", "hevy_exercise_map"]) {
  const { data: rows, error: readError } = await anon.from(table).select("*").limit(1);
  check(`anon cannot read ${table}`, (rows ?? []).length === 0, readError?.message ?? "empty");
}

console.log("\n--- public pages ---");
for (const [path, expect] of [["/", 200], ["/login", 200], ["/manifest.webmanifest", 200], ["/icons/192", 200], ["/apple-icon", 200], ["/offline", 200]]) {
  const res = await fetch(`${base}${path}`, { redirect: "manual" });
  check(`GET ${path}`, res.status === expect, `got ${res.status}`);
}
const guarded = await fetch(`${base}/today`, { redirect: "manual" });
check("GET /today redirects when signed out", [307, 302, 303].includes(guarded.status), `got ${guarded.status} to ${guarded.headers.get("location")}`);

console.log("\n--- cleanup ---");
await admin.auth.admin.deleteUser(uid);
const { data: gone } = await admin.from("profiles").select("id").eq("id", uid).maybeSingle();
check("deleting the user cascades", !gone);

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
