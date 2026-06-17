/**
 * Procedural Quantitative Reasoning conversion questions.
 *
 * The trainer historically shipped a fixed bank of 35 questions, so a motivated
 * student exhausted (and then memorised) the content in one sitting. These generators
 * template fresh questions per category — same answer/explanation shape as the static
 * bank — so repeat practice stays varied while every answer is computed from the same
 * numbers shown in the prompt (so it can't drift out of sync).
 *
 * Every generator keeps answers to at most 2 decimal places by construction; the
 * verify-conversion-generator script fuzzes thousands of questions to prove it.
 */
import type {
  ConversionQuestion,
  ConversionQuestionCategory,
} from "./conversionQuestions";

export type GeneratedConversionQuestion = Omit<ConversionQuestion, "id">;

function r2(value: number): number {
  return Math.round(value * 100) / 100;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function intBetween(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Format with thousands separators, trimming trailing zeros from decimals. */
function fmt(value: number): string {
  return value.toLocaleString("en-GB", { maximumFractionDigits: 2 });
}

// ─── Metric scale conversions (length / mass / volume) ───────────────────────

type ScaleConfig = {
  category: ConversionQuestionCategory;
  from: string;
  to: string;
  factor: number;
  /** "mul" = moving to a smaller unit (×factor); "div" = moving to a larger unit (÷factor). */
  mode: "mul" | "div";
  /** Generates a prompt value that keeps the answer to ≤2 dp. */
  value: () => number;
};

const SCALE_CONFIGS: ScaleConfig[] = [
  // Length
  { category: "Metric length", from: "km", to: "metres", factor: 1000, mode: "mul", value: () => intBetween(11, 145) / 10 },
  { category: "Metric length", from: "m", to: "centimetres", factor: 100, mode: "mul", value: () => intBetween(11, 195) / 10 },
  { category: "Metric length", from: "m", to: "millimetres", factor: 1000, mode: "mul", value: () => intBetween(11, 48) / 10 },
  { category: "Metric length", from: "cm", to: "metres", factor: 100, mode: "div", value: () => intBetween(5, 995) },
  { category: "Metric length", from: "mm", to: "centimetres", factor: 10, mode: "div", value: () => intBetween(5, 995) },
  // Mass
  { category: "Metric mass", from: "kg", to: "grams", factor: 1000, mode: "mul", value: () => intBetween(11, 95) / 100 },
  { category: "Metric mass", from: "g", to: "milligrams", factor: 1000, mode: "mul", value: () => intBetween(11, 95) / 100 },
  { category: "Metric mass", from: "g", to: "kilograms", factor: 1000, mode: "div", value: () => intBetween(105, 995) * 10 },
  { category: "Metric mass", from: "mg", to: "grams", factor: 1000, mode: "div", value: () => intBetween(105, 995) * 10 },
  // Volume
  { category: "Metric volume", from: "litres", to: "millilitres", factor: 1000, mode: "mul", value: () => intBetween(11, 48) / 10 },
  { category: "Metric volume", from: "ml", to: "litres", factor: 1000, mode: "div", value: () => intBetween(105, 995) * 10 },
];

function generateScale(): GeneratedConversionQuestion {
  const cfg = pick(SCALE_CONFIGS);
  const value = cfg.value();
  const answer = cfg.mode === "mul" ? r2(value * cfg.factor) : r2(value / cfg.factor);
  const smaller = cfg.mode === "mul";
  return {
    category: cfg.category,
    prompt: `Convert ${fmt(value)} ${cfg.from} to ${cfg.to}.`,
    answer,
    answerLabel: `${fmt(answer)} ${cfg.to === "metres" ? "m" : cfg.to === "centimetres" ? "cm" : cfg.to === "millimetres" ? "mm" : cfg.to === "grams" ? "g" : cfg.to === "milligrams" ? "mg" : cfg.to === "kilograms" ? "kg" : cfg.to === "millilitres" ? "ml" : cfg.to}`,
    explanation: {
      method: {
        target: `${cfg.to.charAt(0).toUpperCase()}${cfg.to.slice(1)}.`,
        convert: smaller ? `1 ${cfg.from} = ${fmt(cfg.factor)} ${cfg.to}.` : `${fmt(cfg.factor)} ${cfg.from} = 1 ${cfg.to}.`,
        calculate: smaller ? `${fmt(value)} × ${fmt(cfg.factor)} = ${fmt(answer)}.` : `${fmt(value)} ÷ ${fmt(cfg.factor)} = ${fmt(answer)}.`,
      },
      examShortcut: smaller
        ? `Moving to a smaller unit means multiply by ${fmt(cfg.factor)}.`
        : `Moving to a larger unit means divide by ${fmt(cfg.factor)}.`,
      senseCheck: smaller
        ? `${cfg.to} are smaller than ${cfg.from}, so the number should get larger.`
        : `${cfg.to} are larger than ${cfg.from}, so the number should get smaller.`,
      commonTrap: smaller ? "divided-instead-of-multiplied" : "multiplied-instead-of-divided",
    },
  };
}

// ─── Time ────────────────────────────────────────────────────────────────────

function generateTime(): GeneratedConversionQuestion {
  const variant = pick(["hoursToMinutes", "minutesToSeconds", "mixedToMinutes", "minutesToHours"] as const);

  if (variant === "hoursToMinutes") {
    const hours = pick([1.25, 1.5, 1.75, 2.25, 2.5, 0.75, 3.5]);
    const answer = r2(hours * 60);
    return {
      category: "Time",
      prompt: `Convert ${hours} hours to minutes.`,
      answer,
      answerLabel: `${fmt(answer)} minutes`,
      explanation: {
        method: { target: "Minutes.", convert: "1 hour = 60 minutes.", calculate: `${hours} × 60 = ${fmt(answer)} minutes.` },
        examShortcut: "Split the whole hours and the fraction: each 0.25 hour is 15 minutes.",
        senseCheck: `${hours} hours is more than 1 hour, so the answer must be more than 60 minutes.`,
        commonTrap: "decimal-hours-read-as-minutes",
      },
    };
  }

  if (variant === "minutesToSeconds") {
    const minutes = pick([2.5, 3.5, 4.5, 1.5, 6.5]);
    const answer = r2(minutes * 60);
    return {
      category: "Time",
      prompt: `Convert ${minutes} minutes to seconds.`,
      answer,
      answerLabel: `${fmt(answer)} seconds`,
      explanation: {
        method: { target: "Seconds.", convert: "1 minute = 60 seconds.", calculate: `${minutes} × 60 = ${fmt(answer)} seconds.` },
        examShortcut: `${minutes} minutes is ${Math.floor(minutes)} minutes plus half a minute: add 30 to the whole-minute total.`,
        senseCheck: `${Math.ceil(minutes)} minutes is ${Math.ceil(minutes) * 60} seconds, so the answer should be just under that.`,
        commonTrap: "decimal-minutes-read-as-seconds",
      },
    };
  }

  if (variant === "mixedToMinutes") {
    const hours = intBetween(1, 3);
    const mins = pick([12, 18, 24, 36, 42, 48]);
    const answer = hours * 60 + mins;
    return {
      category: "Time",
      prompt: `Convert ${hours} hour${hours > 1 ? "s" : ""} ${mins} minutes to minutes.`,
      answer,
      answerLabel: `${fmt(answer)} minutes`,
      explanation: {
        method: { target: "Total minutes.", convert: "1 hour = 60 minutes.", calculate: `${hours} × 60 + ${mins} = ${fmt(answer)} minutes.` },
        examShortcut: `Multiply the hours by 60, then add the leftover ${mins} minutes.`,
        senseCheck: `${hours} hours is ${hours * 60} minutes, so adding ${mins} gives a little more.`,
        commonTrap: "decimal-hours-read-as-minutes",
      },
    };
  }

  // minutesToHours, to 2 dp
  const minutes = pick([95, 100, 125, 145, 50, 80]);
  const answer = r2(minutes / 60);
  return {
    category: "Time",
    prompt: `Convert ${minutes} minutes to hours. Give your answer to 2 decimal places.`,
    answer,
    answerLabel: `${fmt(answer)} hours`,
    explanation: {
      method: { target: "Hours.", convert: "60 minutes = 1 hour.", calculate: `${minutes} ÷ 60 = ${fmt(answer)} hours (2 d.p.).` },
      examShortcut: `Type: ${minutes} ÷ 60, then round at the end.`,
      senseCheck: `${minutes} minutes is ${minutes < 60 ? "less than" : "more than"} an hour, so ${fmt(answer)} hours is sensible.`,
      commonTrap: "rounded-too-early",
    },
  };
}

// ─── Speed and time ────────────────────────────────────────────────────────

function generateSpeed(): GeneratedConversionQuestion {
  const variant = pick(["distance", "kmhToMs", "msToKmh", "averageSpeed"] as const);

  if (variant === "distance") {
    // speed × minutes/60 = distance; keep distance clean by choosing nice fraction minutes.
    const minutes = pick([15, 20, 30, 40, 45, 50]);
    const speed = pick([18, 24, 36, 48, 60, 72, 90, 96]);
    const answer = r2((speed * minutes) / 60);
    return {
      category: "Speed and time",
      prompt: `A vehicle travels at ${speed} km/h for ${minutes} minutes. How many kilometres does it travel?`,
      answer,
      answerLabel: `${fmt(answer)} km`,
      explanation: {
        method: { target: "Distance in kilometres.", convert: `${minutes} minutes is ${minutes}/60 hours.`, calculate: `${speed} × ${minutes}/60 = ${fmt(answer)} km.` },
        examShortcut: `Type: ${speed} × ${minutes} ÷ 60.`,
        senseCheck: `${minutes} minutes is ${minutes < 60 ? "less than" : "more than"} an hour, so the distance should be ${minutes < 60 ? "less than" : "more than"} ${speed} km.`,
        commonTrap: "minutes-used-as-hours",
      },
    };
  }

  if (variant === "kmhToMs") {
    const kmh = pick([18, 36, 54, 72, 90, 108]);
    const answer = r2(kmh / 3.6);
    return {
      category: "Speed and time",
      prompt: `Convert ${kmh} km/h to metres per second.`,
      answer,
      answerLabel: `${fmt(answer)} m/s`,
      explanation: {
        method: { target: "Metres per second.", convert: "1 km = 1000 m and 1 hour = 3600 seconds.", calculate: `${kmh} × 1000 ÷ 3600 = ${fmt(answer)} m/s.` },
        examShortcut: `Km/h to m/s means divide by 3.6, so ${kmh} ÷ 3.6 = ${fmt(answer)}.`,
        senseCheck: `${fmt(answer)} m/s over an hour is ${fmt(answer * 3.6)} km, matching ${kmh} km/h.`,
        commonTrap: "speed-unit-conversion-reversed",
      },
    };
  }

  if (variant === "msToKmh") {
    const ms = pick([5, 8, 10, 12, 15, 20, 25]);
    const answer = r2(ms * 3.6);
    return {
      category: "Speed and time",
      prompt: `Convert ${ms} m/s to km/h.`,
      answer,
      answerLabel: `${fmt(answer)} km/h`,
      explanation: {
        method: { target: "Kilometres per hour.", convert: "1 m/s = 3.6 km/h.", calculate: `${ms} × 3.6 = ${fmt(answer)} km/h.` },
        examShortcut: "M/s to km/h means multiply by 3.6.",
        senseCheck: "Km/h should be a larger number than m/s because an hour contains many seconds.",
        commonTrap: "speed-unit-conversion-reversed",
      },
    };
  }

  // averageSpeed: distance over minutes → km/h
  const minutes = pick([12, 15, 18, 20, 24, 30]);
  const distance = pick([6, 9, 12, 15, 8, 10]);
  const answer = r2(distance / (minutes / 60));
  return {
    category: "Speed and time",
    prompt: `A runner covers ${distance} km in ${minutes} minutes. What is the average speed in km/h?`,
    answer,
    answerLabel: `${fmt(answer)} km/h`,
    explanation: {
      method: { target: "Average speed in km/h.", convert: `${minutes} minutes is ${r2(minutes / 60)} hours.`, calculate: `${distance} ÷ ${r2(minutes / 60)} = ${fmt(answer)} km/h.` },
      examShortcut: `Type: ${distance} ÷ ${minutes} × 60 to turn km per minute into km per hour.`,
      senseCheck: `${minutes} minutes is ${r2(minutes / 60)} of an hour, so the hourly distance scales up from ${distance} km.`,
      commonTrap: "minutes-used-as-hours",
    },
  };
}

// ─── Per-100 rates ───────────────────────────────────────────────────────────

function generatePer100(): GeneratedConversionQuestion {
  const cfg = pick([
    { unit: "g", noun: "protein", label: "g", item: "A food", per: "per 100 g", measured: "g of food" },
    { unit: "km", noun: "fuel", label: "litres", item: "A car", per: "per 100 km", measured: "km" },
    { unit: "ml", noun: "calories", label: "kcal", item: "A drink", per: "per 100 ml", measured: "ml" },
  ] as const);
  const rate = intBetween(4, 18);
  const amount = pick([150, 200, 250, 350, 400, 450, 500]);
  const answer = r2((rate * amount) / 100);
  const promptByUnit: Record<string, string> = {
    g: `A food contains ${rate} g of protein per 100 g. How many grams of protein are in ${amount} g?`,
    km: `A car uses ${rate} litres of fuel per 100 km. How many litres are used over ${amount} km?`,
    ml: `A drink has ${rate} kcal per 100 ml. How many kcal are in ${amount} ml?`,
  };
  const labelByUnit: Record<string, string> = { g: `${fmt(answer)} g`, km: `${fmt(answer)} litres`, ml: `${fmt(answer)} kcal` };
  return {
    category: "Per-100 rates",
    prompt: promptByUnit[cfg.unit],
    answer,
    answerLabel: labelByUnit[cfg.unit],
    explanation: {
      method: {
        target: `Amount for ${amount} ${cfg.measured}.`,
        convert: `${amount} is ${amount}/100 = ${r2(amount / 100)} lots of 100.`,
        calculate: `${rate} × ${r2(amount / 100)} = ${fmt(answer)}.`,
      },
      examShortcut: `For a per-100 rate, multiply by the amount ÷ 100: ${rate} × ${amount} ÷ 100.`,
      senseCheck: `${amount} is ${r2(amount / 100)} times 100, so the answer is ${r2(amount / 100)} times ${rate}.`,
      commonTrap: "wrong-denominator",
    },
  };
}

// ─── Dose and rates ──────────────────────────────────────────────────────────

function generateDose(): GeneratedConversionQuestion {
  const variant = pick(["mgPerKg", "pricePerLitre"] as const);
  if (variant === "mgPerKg") {
    const rate = intBetween(3, 9);
    const kg = pick([48, 52, 56, 60, 64, 72, 80]);
    const answer = r2(rate * kg);
    return {
      category: "Dose and rates",
      prompt: `A dose is ${rate} mg per kg. How many mg are needed for a ${kg} kg patient?`,
      answer,
      answerLabel: `${fmt(answer)} mg`,
      explanation: {
        method: { target: "Dose in mg.", convert: "The rate is already per kg, and the mass is in kg.", calculate: `${rate} × ${kg} = ${fmt(answer)} mg.` },
        examShortcut: `Split it: ${rate} × ${kg} = ${rate} × ${Math.floor(kg / 10) * 10} + ${rate} × ${kg % 10}.`,
        senseCheck: `${rate} mg for each of about ${kg} kg should be a little ${kg % 10 < 5 ? "over" : "under"} ${rate * (Math.round(kg / 10) * 10)} mg.`,
        commonTrap: "per-unit-rate-multiplied-by-wrong-unit",
      },
    };
  }
  // pricePerLitre
  const litres = pick([2, 2.5, 4, 5]);
  const perLitre = pick([1.2, 1.5, 1.8, 2.4]);
  const total = r2(litres * perLitre);
  return {
    category: "Dose and rates",
    prompt: `${litres} litres of juice costs £${total.toFixed(2)}. What is the price per litre in pounds?`,
    answer: r2(perLitre),
    answerLabel: `£${perLitre.toFixed(2)} per litre`,
    explanation: {
      method: { target: "Price for 1 litre.", convert: "Per litre means divide the total cost by the number of litres.", calculate: `${total.toFixed(2)} ÷ ${litres} = ${perLitre.toFixed(2)}.` },
      examShortcut: `Type: ${total.toFixed(2)} ÷ ${litres}.`,
      senseCheck: `At £${perLitre.toFixed(2)} per litre, ${litres} litres come to £${total.toFixed(2)}.`,
      commonTrap: "multiplied-instead-of-divided",
    },
  };
}

// ─── Money ─────────────────────────────────────────────────────────────────

function generateMoney(): GeneratedConversionQuestion {
  const variant = pick(["penceToPounds", "poundsToPence", "eurToGbp", "gbpToEur"] as const);

  if (variant === "penceToPounds") {
    const pence = intBetween(120, 990);
    const answer = r2(pence / 100);
    return {
      category: "Money",
      prompt: `Convert ${pence} pence to pounds.`,
      answer,
      answerLabel: `£${answer.toFixed(2)}`,
      explanation: {
        method: { target: "Pounds.", convert: "100 pence = £1.", calculate: `${pence} ÷ 100 = ${answer.toFixed(2)}.` },
        examShortcut: "Pence to pounds means divide by 100.",
        senseCheck: `${pence}p is between £${Math.floor(pence / 100)} and £${Math.ceil(pence / 100)}.`,
        commonTrap: "pence-pounds-confusion",
      },
    };
  }

  if (variant === "poundsToPence") {
    const pounds = r2(intBetween(120, 990) / 10);
    const answer = r2(pounds * 100);
    return {
      category: "Money",
      prompt: `Convert £${pounds.toFixed(2)} to pence.`,
      answer,
      answerLabel: `${fmt(answer)} pence`,
      explanation: {
        method: { target: "Pence.", convert: "£1 = 100 pence.", calculate: `${pounds.toFixed(2)} × 100 = ${fmt(answer)} pence.` },
        examShortcut: "Pounds to pence means multiply by 100.",
        senseCheck: `£${Math.floor(pounds)} is ${Math.floor(pounds) * 100}p, plus the pennies.`,
        commonTrap: "pence-pounds-confusion",
      },
    };
  }

  const rate = pick([1.25, 1.2, 1.6, 1.5]);
  if (variant === "eurToGbp") {
    // choose euros divisible by rate for a clean answer
    const pounds = intBetween(20, 90);
    const euros = r2(pounds * rate);
    return {
      category: "Money",
      prompt: `£1 = €${rate}. Convert €${fmt(euros)} to pounds.`,
      answer: r2(pounds),
      answerLabel: `£${fmt(pounds)}`,
      explanation: {
        method: { target: "Pounds.", convert: `Each £1 is €${rate}, so euros ÷ ${rate} gives pounds.`, calculate: `${fmt(euros)} ÷ ${rate} = ${fmt(pounds)}.` },
        examShortcut: `Type: ${fmt(euros)} ÷ ${rate}.`,
        senseCheck: "Pounds should be fewer than euros because £1 is worth more than €1 here.",
        commonTrap: "multiplied-instead-of-divided",
      },
    };
  }

  // gbpToEur
  const pounds = intBetween(20, 90);
  const euros = r2(pounds * rate);
  return {
    category: "Money",
    prompt: `£1 = €${rate}. Convert £${fmt(pounds)} to euros.`,
    answer: r2(euros),
    answerLabel: `€${fmt(euros)}`,
    explanation: {
      method: { target: "Euros.", convert: `Each pound is worth ${rate} euros.`, calculate: `${fmt(pounds)} × ${rate} = ${fmt(euros)}.` },
      examShortcut: `Type: ${fmt(pounds)} × ${rate}.`,
      senseCheck: `Euros should be more than pounds because each pound gives €${rate}.`,
      commonTrap: "divided-instead-of-multiplied",
    },
  };
}

// ─── Area and volume ─────────────────────────────────────────────────────────

function generateAreaVolume(): GeneratedConversionQuestion {
  const variant = pick(["cm2ToM2", "m2ToCm2", "lToCm3", "mlToCm3"] as const);

  if (variant === "cm2ToM2") {
    const cm2 = intBetween(2, 95) * 100;
    const answer = r2(cm2 / 10000);
    return {
      category: "Area and volume",
      prompt: `Convert ${fmt(cm2)} cm² to m².`,
      answer,
      answerLabel: `${fmt(answer)} m²`,
      explanation: {
        method: { target: "Square metres.", convert: "1 m² = 10,000 cm².", calculate: `${fmt(cm2)} ÷ 10,000 = ${fmt(answer)} m².` },
        examShortcut: "For area, square the length conversion: 100 cm per m becomes 10,000 cm² per m².",
        senseCheck: "Square metres are much larger than square centimetres, so the number should get much smaller.",
        commonTrap: "linear-conversion-used-for-area",
      },
    };
  }

  if (variant === "m2ToCm2") {
    const m2 = intBetween(2, 95) / 10;
    const answer = r2(m2 * 10000);
    return {
      category: "Area and volume",
      prompt: `Convert ${fmt(m2)} m² to cm².`,
      answer,
      answerLabel: `${fmt(answer)} cm²`,
      explanation: {
        method: { target: "Square centimetres.", convert: "1 m² = 10,000 cm².", calculate: `${fmt(m2)} × 10,000 = ${fmt(answer)} cm².` },
        examShortcut: "Area conversion uses 10,000, not 100.",
        senseCheck: "Square centimetres are much smaller, so the number should get much larger.",
        commonTrap: "linear-conversion-used-for-area",
      },
    };
  }

  if (variant === "lToCm3") {
    const litres = intBetween(11, 48) / 10;
    const answer = r2(litres * 1000);
    return {
      category: "Area and volume",
      prompt: `Convert ${fmt(litres)} litres to cm³.`,
      answer,
      answerLabel: `${fmt(answer)} cm³`,
      explanation: {
        method: { target: "Cubic centimetres.", convert: "1 litre = 1000 cm³.", calculate: `${fmt(litres)} × 1000 = ${fmt(answer)} cm³.` },
        examShortcut: "Litres to cm³ is the same as litres to ml: multiply by 1000.",
        senseCheck: `${fmt(litres)} litres is ${fmt(answer)} ml, and 1 ml equals 1 cm³.`,
        commonTrap: "volume-unit-mismatch",
      },
    };
  }

  // mlToCm3 (1:1)
  const ml = intBetween(50, 950);
  return {
    category: "Area and volume",
    prompt: `Convert ${fmt(ml)} ml to cm³.`,
    answer: ml,
    answerLabel: `${fmt(ml)} cm³`,
    explanation: {
      method: { target: "Cubic centimetres.", convert: "1 ml = 1 cm³.", calculate: `${fmt(ml)} ml = ${fmt(ml)} cm³.` },
      examShortcut: "For water-style volume units, ml and cm³ are numerically equal.",
      senseCheck: "This is a one-to-one conversion, so the number should stay the same.",
      commonTrap: "unnecessary-factor-of-1000",
    },
  };
}

// ─── Full portions ───────────────────────────────────────────────────────────

function generateFullPortions(): GeneratedConversionQuestion {
  const noun = pick([
    { thing: "portion", food: "rice" },
    { thing: "cake", food: "flour" },
    { thing: "serving", food: "pasta" },
  ] as const);
  const gramsEach = pick([120, 150, 180, 200, 240, 250]);
  const kg = intBetween(11, 32) / 10;
  const grams = Math.round(kg * 1000);
  const answer = Math.floor(grams / gramsEach);
  const used = answer * gramsEach;
  const nextUp = (answer + 1) * gramsEach;
  return {
    category: "Full portions",
    prompt: `A ${noun.thing} uses ${gramsEach} g of ${noun.food}. How many full ${noun.thing}s can be made from ${fmt(kg)} kg?`,
    answer,
    answerLabel: `${answer} full ${noun.thing}${answer === 1 ? "" : "s"}`,
    explanation: {
      method: { target: `Number of full ${noun.thing}s.`, convert: `${fmt(kg)} kg = ${fmt(grams)} g.`, calculate: `${fmt(grams)} ÷ ${gramsEach} = ${r2(grams / gramsEach)}, so only ${answer} full ${noun.thing}s.` },
      examShortcut: "Convert kg to g first, then divide and round down for full servings.",
      senseCheck: `${answer} ${noun.thing}s use ${fmt(used)} g and ${answer + 1} would need ${fmt(nextUp)} g, so ${answer} is the maximum.`,
      commonTrap: "rounded-up-when-full-servings-required",
    },
  };
}

// ─── Drill assembly ──────────────────────────────────────────────────────────

const CATEGORY_GENERATORS: Array<() => GeneratedConversionQuestion> = [
  generateScale, // Metric length / mass / volume
  generateTime,
  generateSpeed,
  generatePer100,
  generateDose,
  generateMoney,
  generateAreaVolume,
  generateFullPortions,
];

/**
 * Build a fresh, varied drill. Each generator is run `perGenerator` times; ids are
 * unique within the run so they work as React keys and answer-record keys.
 */
export function generateConversionDrill(perGenerator = 3): ConversionQuestion[] {
  const out: ConversionQuestion[] = [];
  let n = 0;
  for (const gen of CATEGORY_GENERATORS) {
    for (let i = 0; i < perGenerator; i += 1) {
      const q = gen();
      out.push({ ...q, id: `gen_${n}` });
      n += 1;
    }
  }
  return out;
}
