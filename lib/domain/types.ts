export type Profile = {
  id: string;
  display_name: string | null;
  avatar_emoji: string;
  timezone: string;
  weight_unit: "kg" | "lb";
  onboarded_at: string | null;
  created_at: string;
};

export type Goals = {
  user_id: string;
  calorie_target: number;
  maintenance_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  step_target: number;
  pages_target: number;
  weight_goal_kg: number | null;
  updated_at: string;
};

export type Habit = {
  id: string;
  user_id: string;
  key: string;
  label: string;
  hint: string | null;
  icon: string;
  category: "fuel" | "wellness" | "mind";
  target_per_day: number;
  sort_order: number;
  is_active: boolean;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  log_date: string;
  count: number;
};

export type Exercise = {
  id: string;
  user_id: string | null;
  name: string;
  muscle_group: string;
  equipment: string | null;
};

export type RoutineDay = {
  id: string;
  user_id: string;
  name: string;
  subtitle: string | null;
  day_index: number;
  accent: string;
  is_active: boolean;
};

export type RoutineExercise = {
  id: string;
  routine_day_id: string;
  exercise_id: string;
  position: number;
  target_sets: number;
  rep_low: number;
  rep_high: number;
  rest_seconds: number;
  notes: string | null;
};

export type RoutineExerciseWithExercise = RoutineExercise & { exercise: Exercise };

export type WorkoutSession = {
  id: string;
  user_id: string;
  routine_day_id: string | null;
  title: string;
  session_date: string;
  started_at: string;
  finished_at: string | null;
  feel: number | null;
  notes: string | null;
};

export type WorkoutSet = {
  id: string;
  session_id: string;
  exercise_id: string;
  set_index: number;
  weight_kg: number;
  reps: number;
  rpe: number | null;
  is_warmup: boolean;
};

export type MealItem = {
  name: string;
  portion: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
};

export type Meal = {
  id: string;
  log_date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  title: string;
  photo_path: string | null;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  items: MealItem[];
  ai_confidence: "low" | "medium" | "high" | null;
  ai_note: string | null;
  source: "photo" | "manual" | "quick";
  logged_at: string;
};

export type HealthDay = {
  user_id: string;
  log_date: string;
  steps: number | null;
  active_kcal: number | null;
  basal_kcal: number | null;
  workout_kcal: number | null;
  exercise_minutes: number | null;
  resting_hr: number | null;
  sleep_minutes: number | null;
  weight_kg: number | null;
  pages_read: number | null;
  source: string;
};

export type CycleDay = {
  log_date: string;
  flow: "none" | "spotting" | "light" | "medium" | "heavy";
  symptoms: string[];
};

export type BodyComp = {
  id: string;
  measured_on: string;
  weight_kg: number | null;
  skeletal_muscle_kg: number | null;
  body_fat_kg: number | null;
  body_fat_pct: number | null;
  bmr: number | null;
  visceral_fat: number | null;
  inbody_score: number | null;
  notes: string | null;
};

export type IngestToken = {
  id: string;
  token_prefix: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
};
