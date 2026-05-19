import type { QuestionExplanation } from "../components/mentalMaths/mathsAlgorithms";

export type ConversionQuestionCategory =
  | "Metric length"
  | "Metric mass"
  | "Metric volume"
  | "Time"
  | "Speed and time"
  | "Per-100 rates"
  | "Dose and rates"
  | "Money"
  | "Area and volume"
  | "Full portions";

export type ConversionQuestion = {
  id: string;
  category: ConversionQuestionCategory;
  prompt: string;
  answer: number;
  answerLabel: string;
  explanation: QuestionExplanation;
};

export const CONVERSION_QUESTIONS: ConversionQuestion[] = [
  {
    id: "conv_km_m",
    category: "Metric length",
    prompt: "Convert 3.6 km to metres.",
    answer: 3600,
    answerLabel: "3,600 m",
    explanation: {
      method: {
        target: "Metres.",
        convert: "1 km = 1000 m.",
        calculate: "3.6 × 1000 = 3600 m.",
      },
      examShortcut: "Km to metres means multiply by 1000, so move the decimal three places right.",
      senseCheck: "Metres are smaller than kilometres, so the number should get larger.",
      commonTrap: "divided-instead-of-multiplied",
    },
  },
  {
    id: "conv_ml_l",
    category: "Metric volume",
    prompt: "Convert 750 ml to litres.",
    answer: 0.75,
    answerLabel: "0.75 litres",
    explanation: {
      method: {
        target: "Litres.",
        convert: "1000 ml = 1 litre.",
        calculate: "750 ÷ 1000 = 0.75 litres.",
      },
      examShortcut: "Ml to litres means divide by 1000, so move the decimal three places left.",
      senseCheck: "Litres are larger than millilitres, so the number should get smaller.",
      commonTrap: "multiplied-instead-of-divided",
    },
  },
  {
    id: "conv_hours_minutes",
    category: "Time",
    prompt: "Convert 1.25 hours to minutes.",
    answer: 75,
    answerLabel: "75 minutes",
    explanation: {
      method: {
        target: "Minutes.",
        convert: "1 hour = 60 minutes.",
        calculate: "1.25 × 60 = 75 minutes.",
      },
      examShortcut: "1.25 hours is 1 hour plus a quarter hour, so 60 + 15 = 75.",
      senseCheck: "1.25 hours is more than 1 hour, so the answer must be more than 60 minutes.",
      commonTrap: "decimal-hours-read-as-minutes",
    },
  },
  {
    id: "conv_speed_time",
    category: "Speed and time",
    prompt: "A cyclist travels at 18 km/h for 25 minutes. How many kilometres do they travel?",
    answer: 7.5,
    answerLabel: "7.5 km",
    explanation: {
      method: {
        target: "Distance in kilometres.",
        convert: "25 minutes is 25/60 hours.",
        calculate: "18 × 25/60 = 7.5 km.",
      },
      examShortcut: "Type: 18 × 25 ÷ 60. Or simplify 25/60 to 5/12, so 18 × 5 ÷ 12.",
      senseCheck: "25 minutes is less than half an hour, so the distance should be less than half of 18 km.",
      commonTrap: "minutes-used-as-hours",
    },
  },
  {
    id: "conv_per_100g",
    category: "Per-100 rates",
    prompt: "A food contains 12 g of protein per 100 g. How many grams of protein are in 250 g?",
    answer: 30,
    answerLabel: "30 g",
    explanation: {
      method: {
        target: "Protein in grams for 250 g of food.",
        convert: "The given rate is per 100 g, and 250 g is 250/100 = 2.5 lots of 100 g.",
        calculate: "12 × 2.5 = 30 g.",
      },
      examShortcut: "For per 100 g, multiply by actual grams ÷ 100: 12 × 250 ÷ 100.",
      senseCheck: "250 g is two and a half times 100 g, so the protein should be two and a half times 12 g.",
      commonTrap: "wrong-denominator",
    },
  },
  {
    id: "conv_kg_g",
    category: "Metric mass",
    prompt: "Convert 0.85 kg to grams.",
    answer: 850,
    answerLabel: "850 g",
    explanation: {
      method: {
        target: "Grams.",
        convert: "1 kg = 1000 g.",
        calculate: "0.85 × 1000 = 850 g.",
      },
      examShortcut: "Kg to grams means multiply by 1000, so move the decimal three places right.",
      senseCheck: "Grams are smaller than kilograms, so the number should get larger.",
      commonTrap: "divided-instead-of-multiplied",
    },
  },
  {
    id: "conv_g_kg",
    category: "Metric mass",
    prompt: "Convert 4200 g to kilograms.",
    answer: 4.2,
    answerLabel: "4.2 kg",
    explanation: {
      method: {
        target: "Kilograms.",
        convert: "1000 g = 1 kg.",
        calculate: "4200 ÷ 1000 = 4.2 kg.",
      },
      examShortcut: "Grams to kg means divide by 1000, so move the decimal three places left.",
      senseCheck: "Kilograms are larger than grams, so the number should get smaller.",
      commonTrap: "multiplied-instead-of-divided",
    },
  },
  {
    id: "conv_l_ml",
    category: "Metric volume",
    prompt: "Convert 2.4 litres to millilitres.",
    answer: 2400,
    answerLabel: "2,400 ml",
    explanation: {
      method: {
        target: "Millilitres.",
        convert: "1 litre = 1000 ml.",
        calculate: "2.4 × 1000 = 2400 ml.",
      },
      examShortcut: "Litres to ml means multiply by 1000.",
      senseCheck: "Millilitres are smaller than litres, so the number should get larger.",
      commonTrap: "divided-instead-of-multiplied",
    },
  },
  {
    id: "conv_cm_m",
    category: "Metric length",
    prompt: "Convert 85 cm to metres.",
    answer: 0.85,
    answerLabel: "0.85 m",
    explanation: {
      method: {
        target: "Metres.",
        convert: "100 cm = 1 m.",
        calculate: "85 ÷ 100 = 0.85 m.",
      },
      examShortcut: "Cm to metres means divide by 100, so move the decimal two places left.",
      senseCheck: "A metre is longer than a centimetre, so the number should get smaller.",
      commonTrap: "multiplied-instead-of-divided",
    },
  },
  {
    id: "conv_m_cm",
    category: "Metric length",
    prompt: "Convert 7.5 m to centimetres.",
    answer: 750,
    answerLabel: "750 cm",
    explanation: {
      method: {
        target: "Centimetres.",
        convert: "1 m = 100 cm.",
        calculate: "7.5 × 100 = 750 cm.",
      },
      examShortcut: "Metres to cm means multiply by 100.",
      senseCheck: "Centimetres are smaller than metres, so the number should get larger.",
      commonTrap: "divided-instead-of-multiplied",
    },
  },
  {
    id: "conv_mm_cm",
    category: "Metric length",
    prompt: "Convert 48 mm to centimetres.",
    answer: 4.8,
    answerLabel: "4.8 cm",
    explanation: {
      method: {
        target: "Centimetres.",
        convert: "10 mm = 1 cm.",
        calculate: "48 ÷ 10 = 4.8 cm.",
      },
      examShortcut: "Mm to cm means divide by 10.",
      senseCheck: "Centimetres are larger than millimetres, so the number should get smaller.",
      commonTrap: "multiplied-instead-of-divided",
    },
  },
  {
    id: "conv_m_mm",
    category: "Metric length",
    prompt: "Convert 1.2 m to millimetres.",
    answer: 1200,
    answerLabel: "1,200 mm",
    explanation: {
      method: {
        target: "Millimetres.",
        convert: "1 m = 1000 mm.",
        calculate: "1.2 × 1000 = 1200 mm.",
      },
      examShortcut: "Metres to mm means multiply by 1000.",
      senseCheck: "Millimetres are much smaller than metres, so the number should get much larger.",
      commonTrap: "divided-instead-of-multiplied",
    },
  },
  {
    id: "conv_minutes_hours",
    category: "Time",
    prompt: "Convert 95 minutes to hours. Give your answer to 2 decimal places.",
    answer: 1.58,
    answerLabel: "1.58 hours",
    explanation: {
      method: {
        target: "Hours.",
        convert: "60 minutes = 1 hour.",
        calculate: "95 ÷ 60 = 1.583..., which is 1.58 hours to 2 d.p.",
      },
      examShortcut: "Type: 95 ÷ 60, then round at the end.",
      senseCheck: "95 minutes is more than 1 hour but less than 2 hours, so 1.58 hours is sensible.",
      commonTrap: "rounded-too-early",
    },
  },
  {
    id: "conv_mixed_time_minutes",
    category: "Time",
    prompt: "Convert 2 hours 18 minutes to minutes.",
    answer: 138,
    answerLabel: "138 minutes",
    explanation: {
      method: {
        target: "Total minutes.",
        convert: "1 hour = 60 minutes.",
        calculate: "2 × 60 + 18 = 138 minutes.",
      },
      examShortcut: "Double 60, then add the leftover 18 minutes.",
      senseCheck: "2 hours is 120 minutes, so adding 18 gives just over 2 hours.",
      commonTrap: "decimal-hours-read-as-minutes",
    },
  },
  {
    id: "conv_kmh_ms",
    category: "Speed and time",
    prompt: "Convert 36 km/h to metres per second.",
    answer: 10,
    answerLabel: "10 m/s",
    explanation: {
      method: {
        target: "Metres per second.",
        convert: "1 km = 1000 m and 1 hour = 3600 seconds.",
        calculate: "36 × 1000 ÷ 3600 = 10 m/s.",
      },
      examShortcut: "Km/h to m/s means divide by 3.6, so 36 ÷ 3.6 = 10.",
      senseCheck: "10 m/s is 10 metres each second, which is 36,000 metres in an hour: 36 km/h.",
      commonTrap: "speed-unit-conversion-reversed",
    },
  },
  {
    id: "conv_ms_kmh",
    category: "Speed and time",
    prompt: "Convert 12 m/s to km/h.",
    answer: 43.2,
    answerLabel: "43.2 km/h",
    explanation: {
      method: {
        target: "Kilometres per hour.",
        convert: "1 m/s = 3.6 km/h.",
        calculate: "12 × 3.6 = 43.2 km/h.",
      },
      examShortcut: "M/s to km/h means multiply by 3.6.",
      senseCheck: "Km/h should be a larger number than m/s because an hour contains many seconds.",
      commonTrap: "speed-unit-conversion-reversed",
    },
  },
  {
    id: "conv_speed_distance_50_min",
    category: "Speed and time",
    prompt: "A train travels at 72 km/h for 50 minutes. How many kilometres does it travel?",
    answer: 60,
    answerLabel: "60 km",
    explanation: {
      method: {
        target: "Distance in kilometres.",
        convert: "50 minutes is 50/60 hours.",
        calculate: "72 × 50/60 = 60 km.",
      },
      examShortcut: "Type: 72 × 50 ÷ 60. Or use 50/60 = 5/6, so 72 ÷ 6 × 5.",
      senseCheck: "50 minutes is less than an hour, so the distance should be less than 72 km.",
      commonTrap: "minutes-used-as-hours",
    },
  },
  {
    id: "conv_average_speed",
    category: "Speed and time",
    prompt: "A runner covers 9 km in 18 minutes. What is the average speed in km/h?",
    answer: 30,
    answerLabel: "30 km/h",
    explanation: {
      method: {
        target: "Average speed in km/h.",
        convert: "18 minutes is 18/60 = 0.3 hours.",
        calculate: "9 ÷ 0.3 = 30 km/h.",
      },
      examShortcut: "Type: 9 ÷ 18 × 60 to convert km per minute into km per hour.",
      senseCheck: "18 minutes is about a third of an hour, so the hourly distance should be about 3 times 9 km.",
      commonTrap: "minutes-used-as-hours",
    },
  },
  {
    id: "conv_metres_per_minute",
    category: "Speed and time",
    prompt: "A machine moves at 150 m/min for 12 minutes. How many kilometres does it move?",
    answer: 1.8,
    answerLabel: "1.8 km",
    explanation: {
      method: {
        target: "Distance in kilometres.",
        convert: "1000 m = 1 km.",
        calculate: "150 × 12 = 1800 m, then 1800 ÷ 1000 = 1.8 km.",
      },
      examShortcut: "Find metres first, then divide by 1000: 150 × 12 ÷ 1000.",
      senseCheck: "150 m for 10 minutes is 1500 m, so 12 minutes should be a little more: 1.8 km.",
      commonTrap: "answer-unit-mismatch",
    },
  },
  {
    id: "conv_fuel_per_100km",
    category: "Per-100 rates",
    prompt: "A car uses 6 litres of fuel per 100 km. How many litres are used over 250 km?",
    answer: 15,
    answerLabel: "15 litres",
    explanation: {
      method: {
        target: "Fuel used over 250 km.",
        convert: "250 km is 250/100 = 2.5 lots of 100 km.",
        calculate: "6 × 2.5 = 15 litres.",
      },
      examShortcut: "For per 100 km, multiply by distance ÷ 100: 6 × 250 ÷ 100.",
      senseCheck: "250 km is two and a half times 100 km, so fuel should be two and a half times 6 litres.",
      commonTrap: "wrong-denominator",
    },
  },
  {
    id: "conv_price_per_100g",
    category: "Per-100 rates",
    prompt: "Cheese costs £1.20 per 100 g. How much does 350 g cost in pounds?",
    answer: 4.2,
    answerLabel: "£4.20",
    explanation: {
      method: {
        target: "Cost for 350 g.",
        convert: "350 g is 350/100 = 3.5 lots of 100 g.",
        calculate: "1.20 × 3.5 = 4.20.",
      },
      examShortcut: "Type: 1.2 × 350 ÷ 100.",
      senseCheck: "300 g would cost £3.60, and 350 g should cost a bit more.",
      commonTrap: "wrong-denominator",
    },
  },
  {
    id: "conv_kcal_per_100ml",
    category: "Per-100 rates",
    prompt: "A drink has 80 kcal per 100 ml. How many kcal are in 250 ml?",
    answer: 200,
    answerLabel: "200 kcal",
    explanation: {
      method: {
        target: "Calories in 250 ml.",
        convert: "250 ml is 250/100 = 2.5 lots of 100 ml.",
        calculate: "80 × 2.5 = 200 kcal.",
      },
      examShortcut: "Type: 80 × 250 ÷ 100.",
      senseCheck: "250 ml is two and a half times 100 ml, so calories should be two and a half times 80.",
      commonTrap: "wrong-denominator",
    },
  },
  {
    id: "conv_dose_mg_per_kg",
    category: "Dose and rates",
    prompt: "A dose is 7 mg per kg. How many mg are needed for a 64 kg patient?",
    answer: 448,
    answerLabel: "448 mg",
    explanation: {
      method: {
        target: "Dose in mg.",
        convert: "The rate is already per kg, and the patient mass is in kg.",
        calculate: "7 × 64 = 448 mg.",
      },
      examShortcut: "Use 7 × 64 = 7 × 60 + 7 × 4 = 420 + 28.",
      senseCheck: "7 mg for each of about 60 kg should be a little over 420 mg.",
      commonTrap: "per-unit-rate-multiplied-by-wrong-unit",
    },
  },
  {
    id: "conv_g_mg",
    category: "Metric mass",
    prompt: "Convert 0.5 g to milligrams.",
    answer: 500,
    answerLabel: "500 mg",
    explanation: {
      method: {
        target: "Milligrams.",
        convert: "1 g = 1000 mg.",
        calculate: "0.5 × 1000 = 500 mg.",
      },
      examShortcut: "Grams to mg means multiply by 1000.",
      senseCheck: "Milligrams are smaller than grams, so the number should get larger.",
      commonTrap: "divided-instead-of-multiplied",
    },
  },
  {
    id: "conv_pence_pounds",
    category: "Money",
    prompt: "Convert 375 pence to pounds.",
    answer: 3.75,
    answerLabel: "£3.75",
    explanation: {
      method: {
        target: "Pounds.",
        convert: "100 pence = £1.",
        calculate: "375 ÷ 100 = 3.75.",
      },
      examShortcut: "Pence to pounds means divide by 100.",
      senseCheck: "375p is more than £3 but less than £4.",
      commonTrap: "pence-pounds-confusion",
    },
  },
  {
    id: "conv_pounds_pence",
    category: "Money",
    prompt: "Convert £12.40 to pence.",
    answer: 1240,
    answerLabel: "1,240 pence",
    explanation: {
      method: {
        target: "Pence.",
        convert: "£1 = 100 pence.",
        calculate: "12.40 × 100 = 1240 pence.",
      },
      examShortcut: "Pounds to pence means multiply by 100.",
      senseCheck: "£12 is 1200p, plus 40p gives 1240p.",
      commonTrap: "pence-pounds-confusion",
    },
  },
  {
    id: "conv_euros_to_pounds",
    category: "Money",
    prompt: "£1 = €1.25. Convert €80 to pounds.",
    answer: 64,
    answerLabel: "£64",
    explanation: {
      method: {
        target: "Pounds.",
        convert: "Each £1 is €1.25, so euros ÷ 1.25 gives pounds.",
        calculate: "80 ÷ 1.25 = 64.",
      },
      examShortcut: "Type: 80 ÷ 1.25.",
      senseCheck: "Pounds should be fewer than euros because £1 is worth more than €1 here.",
      commonTrap: "multiplied-instead-of-divided",
    },
  },
  {
    id: "conv_pounds_to_euros",
    category: "Money",
    prompt: "£1 = €1.25. Convert £48 to euros.",
    answer: 60,
    answerLabel: "€60",
    explanation: {
      method: {
        target: "Euros.",
        convert: "Each pound is worth 1.25 euros.",
        calculate: "48 × 1.25 = 60.",
      },
      examShortcut: "1.25 = 5/4, so 48 ÷ 4 × 5 = 60.",
      senseCheck: "Euros should be more than pounds because each pound gives 1.25 euros.",
      commonTrap: "divided-instead-of-multiplied",
    },
  },
  {
    id: "conv_cm2_m2",
    category: "Area and volume",
    prompt: "Convert 2500 cm² to m².",
    answer: 0.25,
    answerLabel: "0.25 m²",
    explanation: {
      method: {
        target: "Square metres.",
        convert: "1 m² = 10,000 cm².",
        calculate: "2500 ÷ 10,000 = 0.25 m².",
      },
      examShortcut: "For area, square the length conversion: 100 cm per m becomes 10,000 cm² per m².",
      senseCheck: "2500 cm² is a 50 cm by 50 cm square, which is half a metre by half a metre: 0.25 m².",
      commonTrap: "linear-conversion-used-for-area",
    },
  },
  {
    id: "conv_m2_cm2",
    category: "Area and volume",
    prompt: "Convert 0.6 m² to cm².",
    answer: 6000,
    answerLabel: "6,000 cm²",
    explanation: {
      method: {
        target: "Square centimetres.",
        convert: "1 m² = 10,000 cm².",
        calculate: "0.6 × 10,000 = 6000 cm².",
      },
      examShortcut: "Area conversion uses 10,000, not 100.",
      senseCheck: "0.6 m² is over half a square metre, so it should be over 5000 cm².",
      commonTrap: "linear-conversion-used-for-area",
    },
  },
  {
    id: "conv_l_cm3",
    category: "Area and volume",
    prompt: "Convert 1.5 litres to cm³.",
    answer: 1500,
    answerLabel: "1,500 cm³",
    explanation: {
      method: {
        target: "Cubic centimetres.",
        convert: "1 litre = 1000 cm³.",
        calculate: "1.5 × 1000 = 1500 cm³.",
      },
      examShortcut: "Litres to cm³ is the same as litres to ml: multiply by 1000.",
      senseCheck: "1.5 litres is 1500 ml, and 1 ml equals 1 cm³.",
      commonTrap: "volume-unit-mismatch",
    },
  },
  {
    id: "conv_ml_cm3",
    category: "Area and volume",
    prompt: "Convert 350 ml to cm³.",
    answer: 350,
    answerLabel: "350 cm³",
    explanation: {
      method: {
        target: "Cubic centimetres.",
        convert: "1 ml = 1 cm³.",
        calculate: "350 ml = 350 cm³.",
      },
      examShortcut: "For water-style volume units, ml and cm³ are numerically equal.",
      senseCheck: "This is a one-to-one conversion, so the number should stay the same.",
      commonTrap: "unnecessary-factor-of-1000",
    },
  },
  {
    id: "conv_full_portions",
    category: "Full portions",
    prompt: "A portion uses 180 g of rice. How many full portions can be made from 2.2 kg?",
    answer: 12,
    answerLabel: "12 full portions",
    explanation: {
      method: {
        target: "Number of full portions.",
        convert: "2.2 kg = 2200 g.",
        calculate: "2200 ÷ 180 = 12.22..., so only 12 full portions.",
      },
      examShortcut: "Convert kg to g first, then divide and round down for full portions.",
      senseCheck: "12 portions use 2160 g and 13 portions need 2340 g, so 12 is the maximum.",
      commonTrap: "rounded-up-when-full-servings-required",
    },
  },
  {
    id: "conv_minutes_seconds",
    category: "Time",
    prompt: "Convert 4.5 minutes to seconds.",
    answer: 270,
    answerLabel: "270 seconds",
    explanation: {
      method: {
        target: "Seconds.",
        convert: "1 minute = 60 seconds.",
        calculate: "4.5 × 60 = 270 seconds.",
      },
      examShortcut: "4.5 minutes is 4 minutes plus half a minute: 240 + 30.",
      senseCheck: "5 minutes is 300 seconds, so 4.5 minutes should be just under 300 seconds.",
      commonTrap: "decimal-minutes-read-as-seconds",
    },
  },
  {
    id: "conv_price_per_litre",
    category: "Dose and rates",
    prompt: "2.5 litres of juice costs £3.75. What is the price per litre in pounds?",
    answer: 1.5,
    answerLabel: "£1.50 per litre",
    explanation: {
      method: {
        target: "Price for 1 litre.",
        convert: "Per litre means divide the total cost by the number of litres.",
        calculate: "3.75 ÷ 2.5 = 1.50.",
      },
      examShortcut: "Type: 3.75 ÷ 2.5.",
      senseCheck: "2 litres at £1.50 would be £3, and the extra 0.5 litre adds 75p, giving £3.75.",
      commonTrap: "multiplied-instead-of-divided",
    },
  },
];
