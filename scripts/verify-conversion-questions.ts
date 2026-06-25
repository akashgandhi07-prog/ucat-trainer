import { CONVERSION_QUESTIONS } from "../src/data/conversionQuestions";

const EXPECTED_ANSWERS: Record<string, number> = {
  conv_km_m: 3600,
  conv_ml_l: 0.75,
  conv_hours_minutes: 75,
  conv_speed_time: 7.5,
  conv_per_100g: 30,
  conv_kg_g: 850,
  conv_g_kg: 4.2,
  conv_l_ml: 2400,
  conv_cm_m: 0.85,
  conv_m_cm: 750,
  conv_mm_cm: 4.8,
  conv_m_mm: 1200,
  conv_minutes_hours: 1.58,
  conv_mixed_time_minutes: 138,
  conv_kmh_ms: 10,
  conv_ms_kmh: 43.2,
  conv_speed_distance_50_min: 60,
  conv_average_speed: 30,
  conv_metres_per_minute: 1.8,
  conv_fuel_per_100km: 15,
  conv_price_per_100g: 4.2,
  conv_kcal_per_100ml: 200,
  conv_dose_mg_per_kg: 448,
  conv_g_mg: 500,
  conv_pence_pounds: 3.75,
  conv_pounds_pence: 1240,
  conv_euros_to_pounds: 64,
  conv_pounds_to_euros: 60,
  conv_cm2_m2: 0.25,
  conv_m2_cm2: 6000,
  conv_l_cm3: 1500,
  conv_ml_cm3: 350,
  conv_full_portions: 12,
  conv_minutes_seconds: 270,
  conv_price_per_litre: 1.5,
  conv_mm_m: 6.5,
  conv_cm_m_b: 2.5,
  conv_kg_g_b: 2750,
  conv_mg_g: 0.25,
  conv_tonne_kg: 3200,
  conv_ml_l_b: 1.25,
  conv_l_ml_b: 300,
  conv_hours_minutes_b: 210,
  conv_seconds_minutes: 2.5,
  conv_mixed_time_minutes_b: 165,
  conv_speed_distance_40_min: 40,
  conv_kmh_ms_b: 25,
  conv_average_speed_b: 15,
  conv_per_100g_sugar: 60,
  conv_fuel_per_100km_b: 24.5,
  conv_dose_mg_per_kg_b: 360,
  conv_pence_pounds_b: 2.5,
  conv_dollars_to_pounds: 80,
  conv_m2_cm2_b: 30000,
  conv_full_portions_b: 8,
  conv_drip_rate: 2.5,
  conv_dose_cost: 30,
  conv_salt_concentration: 120,
  conv_tablet_count: 6,
  conv_journey_time: 22.5,
  conv_fuel_cost: 22.5,
  conv_paint_coverage: 3,
  conv_recipe_scale: 4.5,
  conv_average_speed_mixed_time: 72,
  conv_concentration_mg: 4,
  conv_floor_tiles: 120,
  conv_tank_jugs: 24,
};

const REQUIRED_CATEGORIES = new Set([
  "Metric length",
  "Metric mass",
  "Metric volume",
  "Time",
  "Speed and time",
  "Per-100 rates",
  "Dose and rates",
  "Money",
  "Area and volume",
  "Full portions",
]);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(CONVERSION_QUESTIONS.length === 67, `Expected 67 questions, found ${CONVERSION_QUESTIONS.length}`);

const seen = new Set<string>();
const categories = new Set<string>();

for (const question of CONVERSION_QUESTIONS) {
  assert(!seen.has(question.id), `Duplicate question id: ${question.id}`);
  seen.add(question.id);

  const expected = EXPECTED_ANSWERS[question.id];
  assert(expected !== undefined, `Missing expected answer for ${question.id}`);
  assert(
    Math.abs(question.answer - expected) < 0.0001,
    `${question.id} answer mismatch: expected ${expected}, found ${question.answer}`,
  );

  categories.add(question.category);
  assert(question.prompt.trim().length > 0, `${question.id} has an empty prompt`);
  assert(question.answerLabel.trim().length > 0, `${question.id} has an empty answer label`);
  assert(question.explanation.method.target.trim().length > 0, `${question.id} missing method target`);
  assert(question.explanation.method.convert.trim().length > 0, `${question.id} missing method conversion`);
  assert(question.explanation.method.calculate.trim().length > 0, `${question.id} missing calculation`);
  assert(question.explanation.examShortcut.trim().length > 0, `${question.id} missing exam shortcut`);
  assert(question.explanation.senseCheck.trim().length > 0, `${question.id} missing sense check`);
  assert(question.explanation.commonTrap.trim().length > 0, `${question.id} missing common trap`);
}

for (const category of REQUIRED_CATEGORIES) {
  assert(categories.has(category), `Missing category: ${category}`);
}

console.log(`Verified ${CONVERSION_QUESTIONS.length} conversion questions.`);
