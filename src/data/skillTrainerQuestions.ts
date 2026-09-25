export type Option = { id: string; label: string };

export type QrSetupQuestion = {
  id: string;
  situation: string;
  prompt: string;
  relevantOptions: Option[];
  relevantAnswer: string;
  operationOptions: Option[];
  operationAnswer: string;
  unitOptions: Option[];
  unitAnswer: string;
  calculationOptions: Option[];
  calculationAnswer: string;
  explanation: string;
};

export const QR_SETUP_QUESTIONS: QrSetupQuestion[] = [
  {
    id: "setup-1",
    situation: "A clinic saw 480 patients in April. In May it saw 15% more patients.",
    prompt: "Set up the calculation for the number of patients seen in May.",
    relevantOptions: [
      { id: "a", label: "480 and 15%" }, { id: "b", label: "April and May" },
      { id: "c", label: "480 only" }, { id: "d", label: "15 only" },
    ],
    relevantAnswer: "a",
    operationOptions: [
      { id: "a", label: "Increase by a percentage" }, { id: "b", label: "Find a percentage decrease" },
      { id: "c", label: "Divide into a ratio" }, { id: "d", label: "Find an average" },
    ],
    operationAnswer: "a",
    unitOptions: [
      { id: "a", label: "Patients" }, { id: "b", label: "Percent" },
      { id: "c", label: "Patients per month" }, { id: "d", label: "Months" },
    ],
    unitAnswer: "a",
    calculationOptions: [
      { id: "a", label: "480 × 1.15" }, { id: "b", label: "480 ÷ 1.15" },
      { id: "c", label: "480 × 0.15" }, { id: "d", label: "480 − 15" },
    ],
    calculationAnswer: "a",
    explanation: "‘15% more’ means retain the original 100% and add 15%, so multiply 480 by 1.15. The answer is a count of patients.",
  },
  {
    id: "setup-2",
    situation: "A 750 ml bottle is shared equally between six people. One person drinks only 80% of their share.",
    prompt: "Set up the calculation for the amount that person drinks.",
    relevantOptions: [
      { id: "a", label: "750 ml, 6 people and 80%" }, { id: "b", label: "750 ml and 80% only" },
      { id: "c", label: "6 people and 80% only" }, { id: "d", label: "750 ml and 6 people only" },
    ],
    relevantAnswer: "a",
    operationOptions: [
      { id: "a", label: "Divide, then take a percentage" }, { id: "b", label: "Take a percentage, then multiply by six" },
      { id: "c", label: "Add six, then divide" }, { id: "d", label: "Find a percentage increase" },
    ],
    operationAnswer: "a",
    unitOptions: [
      { id: "a", label: "ml" }, { id: "b", label: "ml per person per cent" },
      { id: "c", label: "People" }, { id: "d", label: "%" },
    ],
    unitAnswer: "a",
    calculationOptions: [
      { id: "a", label: "(750 ÷ 6) × 0.80" }, { id: "b", label: "750 ÷ (6 × 0.80)" },
      { id: "c", label: "750 × 6 × 0.80" }, { id: "d", label: "(750 − 6) × 0.80" },
    ],
    calculationAnswer: "a",
    explanation: "First find one equal share by dividing by six. Then take 80% of that share. Both operations preserve millilitres as the final unit.",
  },
  {
    id: "setup-3",
    situation: "A car travels 168 km using 12 litres of fuel. Fuel costs £1.46 per litre.",
    prompt: "Set up the calculation for the fuel cost per kilometre.",
    relevantOptions: [
      { id: "a", label: "168 km, 12 litres and £1.46 per litre" }, { id: "b", label: "168 km and 12 litres only" },
      { id: "c", label: "12 litres and £1.46 only" }, { id: "d", label: "168 km and £1.46 only" },
    ],
    relevantAnswer: "a",
    operationOptions: [
      { id: "a", label: "Find total cost, then divide by distance" }, { id: "b", label: "Divide distance by price, then multiply by fuel" },
      { id: "c", label: "Add fuel to distance" }, { id: "d", label: "Find a percentage change" },
    ],
    operationAnswer: "a",
    unitOptions: [
      { id: "a", label: "£ per km" }, { id: "b", label: "km per litre" },
      { id: "c", label: "£ per litre" }, { id: "d", label: "litres per km" },
    ],
    unitAnswer: "a",
    calculationOptions: [
      { id: "a", label: "(12 × 1.46) ÷ 168" }, { id: "b", label: "168 ÷ (12 × 1.46)" },
      { id: "c", label: "(168 ÷ 12) × 1.46" }, { id: "d", label: "12 ÷ (168 × 1.46)" },
    ],
    calculationAnswer: "a",
    explanation: "Twelve litres at £1.46 gives the total journey cost. Dividing that cost by 168 km produces pounds per kilometre.",
  },
  {
    id: "setup-4",
    situation: "A medicine contains 250 mg in every 5 ml. A patient needs a 400 mg dose.",
    prompt: "Set up the calculation for the volume required.",
    relevantOptions: [
      { id: "a", label: "250 mg, 5 ml and 400 mg" }, { id: "b", label: "250 mg and 400 mg only" },
      { id: "c", label: "5 ml and 400 mg only" }, { id: "d", label: "250 mg and 5 ml only" },
    ],
    relevantAnswer: "a",
    operationOptions: [
      { id: "a", label: "Scale the volume in the same proportion as the dose" }, { id: "b", label: "Subtract the doses" },
      { id: "c", label: "Find a percentage decrease" }, { id: "d", label: "Average the two doses" },
    ],
    operationAnswer: "a",
    unitOptions: [
      { id: "a", label: "ml" }, { id: "b", label: "mg" },
      { id: "c", label: "mg/ml" }, { id: "d", label: "%" },
    ],
    unitAnswer: "a",
    calculationOptions: [
      { id: "a", label: "(400 ÷ 250) × 5" }, { id: "b", label: "(250 ÷ 400) × 5" },
      { id: "c", label: "400 ÷ (250 × 5)" }, { id: "d", label: "400 − 250 + 5" },
    ],
    calculationAnswer: "a",
    explanation: "The required dose is 400/250 times the stated dose, so the volume must also be 400/250 times 5 ml.",
  },
  {
    id: "setup-5",
    situation: "A train scheduled for 14:35 leaves 18 minutes late. Its journey takes 1 hour 47 minutes.",
    prompt: "Set up the calculation for its arrival time.",
    relevantOptions: [
      { id: "a", label: "14:35, 18 minutes and 1 hour 47 minutes" }, { id: "b", label: "14:35 and 1 hour 47 minutes only" },
      { id: "c", label: "18 minutes and 1 hour 47 minutes only" }, { id: "d", label: "14:35 and 18 minutes only" },
    ],
    relevantAnswer: "a",
    operationOptions: [
      { id: "a", label: "Add the delay and journey duration" }, { id: "b", label: "Subtract the delay from the duration" },
      { id: "c", label: "Multiply the times" }, { id: "d", label: "Find a mean time" },
    ],
    operationAnswer: "a",
    unitOptions: [
      { id: "a", label: "Clock time" }, { id: "b", label: "Minutes per hour" },
      { id: "c", label: "Hours" }, { id: "d", label: "Minutes" },
    ],
    unitAnswer: "a",
    calculationOptions: [
      { id: "a", label: "14:35 + 0:18 + 1:47" }, { id: "b", label: "14:35 − 0:18 + 1:47" },
      { id: "c", label: "14:35 + (1:47 − 0:18)" }, { id: "d", label: "(14:35 + 1:47) ÷ 2" },
    ],
    calculationAnswer: "a",
    explanation: "A late departure pushes the arrival later, so both the 18-minute delay and 1-hour-47-minute journey are added to the scheduled departure.",
  },
  {id:"setup-6",situation:"A jacket originally costs £84 and is reduced by 35%.",prompt:"Set up the calculation for its sale price.",relevantOptions:[{id:"a",label:"£84 and 35%"},{id:"b",label:"£84 only"},{id:"c",label:"35 only"},{id:"d",label:"The word sale only"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Retain 65% of the original price"},{id:"b",label:"Increase by 35%"},{id:"c",label:"Divide the price by 35"},{id:"d",label:"Subtract £35"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Pounds"},{id:"b",label:"Percent"},{id:"c",label:"Items"},{id:"d",label:"Pounds per cent"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"84 × 0.65"},{id:"b",label:"84 × 1.35"},{id:"c",label:"84 − 35"},{id:"d",label:"84 ÷ 0.35"}],calculationAnswer:"a",explanation:"A 35% reduction leaves 65% of the original price, so multiply £84 by 0.65."},
  {id:"setup-7",situation:"The ratio of adult to child tickets sold is 7:3. A total of 450 tickets were sold.",prompt:"Set up the calculation for the number of child tickets.",relevantOptions:[{id:"a",label:"Ratio 7:3 and total 450"},{id:"b",label:"7 and 450 only"},{id:"c",label:"3 and 450 without the ratio order"},{id:"d",label:"450 only"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Divide by total ratio parts, then multiply by child parts"},{id:"b",label:"Multiply the total by 7"},{id:"c",label:"Subtract 3 from 7"},{id:"d",label:"Average 7 and 3"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Tickets"},{id:"b",label:"Ratio parts"},{id:"c",label:"Percent"},{id:"d",label:"Adults per child"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"450 ÷ (7 + 3) × 3"},{id:"b",label:"450 ÷ 7 × 3"},{id:"c",label:"450 × 7 ÷ 3"},{id:"d",label:"450 − 7 − 3"}],calculationAnswer:"a",explanation:"There are ten ratio parts altogether and children account for three of them."},
  {id:"setup-8",situation:"A runner covers 2.4 km in 11 minutes 20 seconds.",prompt:"Set up the calculation for average speed in metres per second.",relevantOptions:[{id:"a",label:"2.4 km and 11 min 20 s"},{id:"b",label:"2.4 and 11 only"},{id:"c",label:"20 seconds only"},{id:"d",label:"11 minutes only"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Convert both quantities, then divide distance by time"},{id:"b",label:"Divide time by distance"},{id:"c",label:"Add distance and time"},{id:"d",label:"Find a percentage"}],operationAnswer:"a",unitOptions:[{id:"a",label:"m/s"},{id:"b",label:"km/min"},{id:"c",label:"seconds per metre"},{id:"d",label:"metres"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"2,400 ÷ (11 × 60 + 20)"},{id:"b",label:"(11 × 60 + 20) ÷ 2,400"},{id:"c",label:"2.4 ÷ 11.2"},{id:"d",label:"2,400 ÷ 11 + 20"}],calculationAnswer:"a",explanation:"Convert 2.4 km to 2,400 m and the time to 680 seconds, then use speed = distance ÷ time."},
  {id:"setup-9",situation:"A survey received 336 responses, of which 126 selected option A.",prompt:"Set up the calculation for the percentage selecting option A.",relevantOptions:[{id:"a",label:"126 selected and 336 total"},{id:"b",label:"126 only"},{id:"c",label:"336 only"},{id:"d",label:"The number of options"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Divide the part by the total and multiply by 100"},{id:"b",label:"Divide the total by the part"},{id:"c",label:"Subtract the part from the total"},{id:"d",label:"Find their average"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Percent"},{id:"b",label:"Responses"},{id:"c",label:"Responses per option"},{id:"d",label:"Percentage points per response"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"126 ÷ 336 × 100"},{id:"b",label:"336 ÷ 126 × 100"},{id:"c",label:"(336 − 126) × 100"},{id:"d",label:"126 ÷ 100 × 336"}],calculationAnswer:"a",explanation:"Percentage is the selected part divided by all responses, multiplied by 100."},
  {id:"setup-10",situation:"£1,260 earns simple interest at 4.5% per year for three years.",prompt:"Set up the calculation for the total value after three years.",relevantOptions:[{id:"a",label:"£1,260, 4.5% and 3 years"},{id:"b",label:"£1,260 and 4.5% only"},{id:"c",label:"4.5% and 3 years only"},{id:"d",label:"£1,260 and 3 years only"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Find one year's interest, multiply by three, then add the principal"},{id:"b",label:"Compound the value three times"},{id:"c",label:"Subtract three years of interest"},{id:"d",label:"Divide the principal by the rate"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Pounds"},{id:"b",label:"Percent per year"},{id:"c",label:"Years"},{id:"d",label:"Pounds per year"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"1,260 + (1,260 × 0.045 × 3)"},{id:"b",label:"1,260 × 1.045³"},{id:"c",label:"1,260 × 0.045 ÷ 3"},{id:"d",label:"1,260 − (0.045 × 3)"}],calculationAnswer:"a",explanation:"Simple interest is calculated on the original principal each year; it is not compounded."},
];

export type DataExtractionQuestion = {
  id: string;
  title: string;
  headers: string[];
  rows: string[][];
  prompt: string;
  sourceOptions: Option[];
  sourceAnswer: string;
  valueOptions: Option[];
  valueAnswer: string;
  unitOptions: Option[];
  unitAnswer: string;
  explanation: string;
};

export const DATA_EXTRACTION_QUESTIONS: DataExtractionQuestion[] = [
  { id: "extract-1", title: "Appointments by clinic", headers: ["Clinic", "Booked", "Attended", "Average wait (min)"], rows: [["North", "240", "204", "18"], ["Central", "315", "252", "24"], ["South", "180", "153", "16"]], prompt: "How many booked appointments across North and South did not result in attendance?", sourceOptions: [{id:"a",label:"Booked and Attended for North and South"},{id:"b",label:"Average wait for North and South"},{id:"c",label:"Booked for Central only"},{id:"d",label:"Attended for all clinics"}], sourceAnswer:"a", valueOptions:[{id:"a",label:"63"},{id:"b",label:"36"},{id:"c",label:"27"},{id:"d",label:"573"}], valueAnswer:"a", unitOptions:[{id:"a",label:"Appointments"},{id:"b",label:"Minutes"},{id:"c",label:"Percent"},{id:"d",label:"Clinics"}], unitAnswer:"a", explanation:"North non-attendance is 240 − 204 = 36 and South is 180 − 153 = 27. Together that is 63 appointments." },
  { id: "extract-2", title: "Study programme", headers: ["Week", "Hours studied", "Questions attempted", "Accuracy"], rows: [["1", "8", "320", "68%"], ["2", "10", "450", "72%"], ["3", "12", "540", "75%"]], prompt: "Between weeks 1 and 3, by what percentage did hours studied increase?", sourceOptions:[{id:"a",label:"Hours studied in weeks 1 and 3"},{id:"b",label:"Questions attempted in weeks 1 and 3"},{id:"c",label:"Accuracy in weeks 1 and 3"},{id:"d",label:"All values in week 2"}], sourceAnswer:"a", valueOptions:[{id:"a",label:"50%"},{id:"b",label:"4%"},{id:"c",label:"33.3%"},{id:"d",label:"150%"}], valueAnswer:"a", unitOptions:[{id:"a",label:"Percent"},{id:"b",label:"Hours"},{id:"c",label:"Questions"},{id:"d",label:"Percentage points"}], unitAnswer:"a", explanation:"The increase is 12 − 8 = 4 hours. Relative to the original 8 hours, 4/8 × 100 = 50%." },
  { id: "extract-3", title: "Journey options", headers: ["Route", "Distance (km)", "Time (min)", "Toll"], rows: [["A", "36", "45", "£0"], ["B", "42", "40", "£3.20"], ["C", "30", "50", "£1.50"]], prompt: "What is the average speed on Route B, in km/h?", sourceOptions:[{id:"a",label:"Route B distance and time"},{id:"b",label:"Route A distance and Route B time"},{id:"c",label:"Route B toll and time"},{id:"d",label:"Route C distance and time"}], sourceAnswer:"a", valueOptions:[{id:"a",label:"63"},{id:"b",label:"1.05"},{id:"c",label:"67.5"},{id:"d",label:"56"}], valueAnswer:"a", unitOptions:[{id:"a",label:"km/h"},{id:"b",label:"km/min"},{id:"c",label:"minutes"},{id:"d",label:"£/km"}], unitAnswer:"a", explanation:"Forty minutes is 2/3 of an hour. Dividing 42 km by 2/3 hour gives 63 km/h." },
  { id: "extract-4", title: "Library loans", headers: ["Category", "January", "February", "March"], rows: [["Fiction", "420", "390", "450"], ["Science", "180", "225", "210"], ["History", "160", "140", "175"]], prompt: "What fraction of February loans shown were Science books?", sourceOptions:[{id:"a",label:"All three February values"},{id:"b",label:"Science values for all months"},{id:"c",label:"January and March totals"},{id:"d",label:"Fiction in February only"}], sourceAnswer:"a", valueOptions:[{id:"a",label:"225/755"},{id:"b",label:"225/615"},{id:"c",label:"225/390"},{id:"d",label:"755/225"}], valueAnswer:"a", unitOptions:[{id:"a",label:"A proportion (no unit)"},{id:"b",label:"Books per month"},{id:"c",label:"Percent per book"},{id:"d",label:"Months"}], unitAnswer:"a", explanation:"The February total is 390 + 225 + 140 = 755. Science accounts for 225 of those loans, so the fraction is 225/755." },
  { id: "extract-5", title: "Energy generation", headers: ["Source", "Output (MWh)", "Operating hours", "Cost (£000)"], rows: [["Solar", "840", "280", "126"], ["Wind", "1,260", "360", "162"], ["Hydro", "960", "240", "144"]], prompt: "Which source had the greatest output per operating hour?", sourceOptions:[{id:"a",label:"Output and operating hours for every source"},{id:"b",label:"Output only"},{id:"c",label:"Cost and output only"},{id:"d",label:"Operating hours only"}], sourceAnswer:"a", valueOptions:[{id:"a",label:"Hydro"},{id:"b",label:"Wind"},{id:"c",label:"Solar"},{id:"d",label:"They were equal"}], valueAnswer:"a", unitOptions:[{id:"a",label:"MWh per operating hour"},{id:"b",label:"Operating hours per MWh"},{id:"c",label:"£ per MWh"},{id:"d",label:"MWh"}], unitAnswer:"a", explanation:"Solar gives 3, Wind gives 3.5, and Hydro gives 4 MWh per operating hour. Hydro is greatest." },
  {id:"extract-6",title:"Course applications",headers:["Course","Applicants","Offers","Places"],rows:[["Medicine","1,440","216","180"],["Dentistry","720","108","90"],["Pharmacy","600","180","150"]],prompt:"What percentage of Medicine applicants received an offer?",sourceOptions:[{id:"a",label:"Medicine applicants and offers"},{id:"b",label:"Medicine offers and places"},{id:"c",label:"All applicant totals"},{id:"d",label:"Dentistry applicants and offers"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"15%"},{id:"b",label:"12.5%"},{id:"c",label:"83.3%"},{id:"d",label:"20%"}],valueAnswer:"a",unitOptions:[{id:"a",label:"Percent"},{id:"b",label:"Applicants"},{id:"c",label:"Offers per place"},{id:"d",label:"Percentage points"}],unitAnswer:"a",explanation:"216 ÷ 1,440 × 100 = 15%."},
  {id:"extract-7",title:"Water consumption",headers:["Household","January (L)","February (L)","March (L)"],rows:[["A","8,400","7,600","8,000"],["B","9,200","8,800","8,400"],["C","7,500","7,200","7,800"]],prompt:"By how many litres did Household B's consumption fall from January to March?",sourceOptions:[{id:"a",label:"Household B January and March"},{id:"b",label:"All February values"},{id:"c",label:"Household A January and March"},{id:"d",label:"All Household B values"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"800"},{id:"b",label:"400"},{id:"c",label:"1,200"},{id:"d",label:"17,600"}],valueAnswer:"a",unitOptions:[{id:"a",label:"Litres"},{id:"b",label:"Litres per month"},{id:"c",label:"Percent"},{id:"d",label:"Households"}],unitAnswer:"a",explanation:"9,200 − 8,400 = 800 litres."},
  {id:"extract-8",title:"Staff shifts",headers:["Ward","Staff","Shift length (h)","Patients seen"],rows:[["Red","8","10","96"],["Blue","6","12","90"],["Green","10","8","100"]],prompt:"Which ward saw the most patients per staff member?",sourceOptions:[{id:"a",label:"Staff and patients seen for every ward"},{id:"b",label:"Shift length and patients"},{id:"c",label:"Patients seen only"},{id:"d",label:"Staff only"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"Blue"},{id:"b",label:"Red"},{id:"c",label:"Green"},{id:"d",label:"All equal"}],valueAnswer:"a",unitOptions:[{id:"a",label:"Patients per staff member"},{id:"b",label:"Staff per patient"},{id:"c",label:"Patients per hour"},{id:"d",label:"Hours per patient"}],unitAnswer:"a",explanation:"Red is 12, Blue is 15 and Green is 10 patients per staff member."},
  {id:"extract-9",title:"Product sales",headers:["Product","Units","Price","Returns"],rows:[["P","320","£18","16"],["Q","240","£25","12"],["R","400","£14","28"]],prompt:"What was the gross sales value of Product Q before returns?",sourceOptions:[{id:"a",label:"Product Q units and price"},{id:"b",label:"Product Q price and returns"},{id:"c",label:"All unit values"},{id:"d",label:"Product P units and price"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"£6,000"},{id:"b",label:"£5,700"},{id:"c",label:"£300"},{id:"d",label:"£9,600"}],valueAnswer:"a",unitOptions:[{id:"a",label:"Pounds"},{id:"b",label:"Units"},{id:"c",label:"Returns"},{id:"d",label:"Pounds per unit"}],unitAnswer:"a",explanation:"Gross sales before returns are 240 × £25 = £6,000."},
  {id:"extract-10",title:"Test results",headers:["Group","Candidates","Passed","Mean mark"],rows:[["X","80","56","62"],["Y","120","90","68"],["Z","100","72","65"]],prompt:"How many candidates across all groups did not pass?",sourceOptions:[{id:"a",label:"Candidates and Passed for all groups"},{id:"b",label:"Mean mark for all groups"},{id:"c",label:"Passed for Group Y only"},{id:"d",label:"Candidate totals only"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"82"},{id:"b",label:"218"},{id:"c",label:"28"},{id:"d",label:"300"}],valueAnswer:"a",unitOptions:[{id:"a",label:"Candidates"},{id:"b",label:"Marks"},{id:"c",label:"Percent"},{id:"d",label:"Groups"}],unitAnswer:"a",explanation:"Non-passes are 24 + 30 + 28 = 82 candidates."},
];

export type EstimationQuestion = {
  id: string; calculation: string; context: string; rangeOptions: Option[]; rangeAnswer: string;
  strategyOptions: Option[]; strategyAnswer: string; exactAnswer: string; explanation: string;
};

export const ESTIMATION_QUESTIONS: EstimationQuestion[] = [
  {id:"estimate-1",calculation:"398 × 19.7",context:"Choose the closest range without calculating exactly.",rangeOptions:[{id:"a",label:"7,500 to 8,000"},{id:"b",label:"6,000 to 6,500"},{id:"c",label:"8,500 to 9,000"},{id:"d",label:"9,500 to 10,000"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Round to 400 × 20"},{id:"b",label:"Round to 300 × 10"},{id:"c",label:"Add 398 and 19.7"},{id:"d",label:"Divide 400 by 20"}],strategyAnswer:"a",exactAnswer:"7,840.6",explanation:"Both values are close to 400 and 20, giving about 8,000. Because both were rounded up slightly, the exact answer is just below 8,000."},
  {id:"estimate-2",calculation:"£2,478 ÷ 31",context:"Estimate the cost per person.",rangeOptions:[{id:"a",label:"£75 to £85"},{id:"b",label:"£55 to £65"},{id:"c",label:"£95 to £105"},{id:"d",label:"£115 to £125"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use 2,480 ÷ 31; recognise 31 × 80 = 2,480"},{id:"b",label:"Use 2,500 ÷ 25"},{id:"c",label:"Subtract 31 from 2,478"},{id:"d",label:"Use 2,400 ÷ 40"}],strategyAnswer:"a",exactAnswer:"£79.94",explanation:"31 × 80 is 2,480, almost exactly the numerator, so the answer is approximately £80."},
  {id:"estimate-3",calculation:"17.8% of 642",context:"Select the closest range.",rangeOptions:[{id:"a",label:"110 to 120"},{id:"b",label:"80 to 90"},{id:"c",label:"140 to 150"},{id:"d",label:"170 to 180"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use 18% of 640: 10% + 8%"},{id:"b",label:"Use 2% of 600"},{id:"c",label:"Multiply 18 by 642"},{id:"d",label:"Divide 642 by 18"}],strategyAnswer:"a",exactAnswer:"114.276",explanation:"18% of 640 is 115.2, putting the result firmly between 110 and 120."},
  {id:"estimate-4",calculation:"(73 × 48) ÷ 11.9",context:"Choose the closest range.",rangeOptions:[{id:"a",label:"290 to 300"},{id:"b",label:"190 to 200"},{id:"c",label:"390 to 400"},{id:"d",label:"490 to 500"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use (72 × 48) ÷ 12"},{id:"b",label:"Use (70 + 50) ÷ 12"},{id:"c",label:"Use 73 × (48 − 12)"},{id:"d",label:"Divide 12 by 3,500"}],strategyAnswer:"a",exactAnswer:"294.45",explanation:"Replacing 73 with 72 and 11.9 with 12 gives 72 × 4 = 288. Using 73 rather than 72 adds one more 48, worth 48 ÷ 12 = 4, giving 292, and dividing by 11.9 rather than 12 nudges it slightly higher, so the answer sits in the 290 to 300 range."},
  {id:"estimate-5",calculation:"1.046³",context:"Estimate the cumulative multiplier.",rangeOptions:[{id:"a",label:"1.14 to 1.15"},{id:"b",label:"1.04 to 1.05"},{id:"c",label:"1.24 to 1.25"},{id:"d",label:"1.34 to 1.35"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Treat it as three successive increases of about 4.6%"},{id:"b",label:"Multiply 1 by 0.046"},{id:"c",label:"Add 3 to 1.046"},{id:"d",label:"Divide 1.046 by 3"}],strategyAnswer:"a",exactAnswer:"1.1445",explanation:"Three 4.6% increases compound to a little more than 13.8%, so about 1.145 is sensible."},
  {id:"estimate-6",calculation:"6,118 ÷ 49.2",context:"Estimate the quotient.",rangeOptions:[{id:"a",label:"120 to 130"},{id:"b",label:"90 to 100"},{id:"c",label:"150 to 160"},{id:"d",label:"190 to 200"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use 6,000 ÷ 50"},{id:"b",label:"Use 6,000 ÷ 25"},{id:"c",label:"Subtract 50 from 6,000"},{id:"d",label:"Multiply 6,000 by 50"}],strategyAnswer:"a",exactAnswer:"124.35",explanation:"6,000 ÷ 50 = 120, placing the exact value in the 120 to 130 interval."},
  {id:"estimate-7",calculation:"£47.80 × 23",context:"Estimate the total cost.",rangeOptions:[{id:"a",label:"£1,050 to £1,150"},{id:"b",label:"£850 to £950"},{id:"c",label:"£1,250 to £1,350"},{id:"d",label:"£1,450 to £1,550"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use £48 × 23"},{id:"b",label:"Use £40 × 20 only"},{id:"c",label:"Add £47.80 and 23"},{id:"d",label:"Divide £48 by 23"}],strategyAnswer:"a",exactAnswer:"£1,099.40",explanation:"48 × 23 = 1,104, very close to the exact total."},
  {id:"estimate-8",calculation:"0.298 × 1,982",context:"Choose the closest range.",rangeOptions:[{id:"a",label:"580 to 600"},{id:"b",label:"380 to 400"},{id:"c",label:"780 to 800"},{id:"d",label:"980 to 1,000"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use 0.3 × 2,000"},{id:"b",label:"Use 0.2 × 1,000"},{id:"c",label:"Add 0.3 to 2,000"},{id:"d",label:"Divide 2,000 by 0.3"}],strategyAnswer:"a",exactAnswer:"590.636",explanation:"0.3 × 2,000 = 600 and both rounded values are slightly larger, so the answer should sit just below 600."},
  {id:"estimate-9",calculation:"(895 − 287) ÷ 6.1",context:"Estimate the result.",rangeOptions:[{id:"a",label:"95 to 105"},{id:"b",label:"75 to 85"},{id:"c",label:"115 to 125"},{id:"d",label:"135 to 145"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use (900 − 300) ÷ 6"},{id:"b",label:"Use 900 ÷ 3"},{id:"c",label:"Add 900 and 300"},{id:"d",label:"Multiply 600 by 6"}],strategyAnswer:"a",exactAnswer:"99.67",explanation:"The rounded expression is 600 ÷ 6 = 100."},
  {id:"estimate-10",calculation:"14.9²",context:"Estimate the square.",rangeOptions:[{id:"a",label:"215 to 225"},{id:"b",label:"145 to 155"},{id:"c",label:"285 to 295"},{id:"d",label:"345 to 355"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use 15²"},{id:"b",label:"Double 15"},{id:"c",label:"Multiply 15 by 10"},{id:"d",label:"Divide 15 by 2"}],strategyAnswer:"a",exactAnswer:"222.01",explanation:"14.9 is just below 15, so its square is just below 225."},
];

export type ConstraintRule = { id: string; text: string; check: (positions: Record<string, number>) => boolean | null };
export type ConstraintPuzzle = { id: string; title: string; context: string; slots: string[]; entities: string[]; rules: ConstraintRule[]; exampleSolution: string[] };
const pos = (p: Record<string, number>, key: string) => p[key];
const both = (p: Record<string, number>, ...keys: string[]) => keys.every((k) => Number.isInteger(pos(p,k)));

export const CONSTRAINT_PUZZLES: ConstraintPuzzle[] = [
  {id:"constraint-1",title:"Clinic presentation order",context:"Place each student into one presentation slot.",slots:["1st","2nd","3rd","4th","5th"],entities:["Amir","Beth","Chen","Deepa","Eva"],rules:[
    {id:"r1",text:"Beth presents immediately after Amir.",check:p=>both(p,"Beth","Amir")?pos(p,"Beth")===pos(p,"Amir")+1:null},
    {id:"r2",text:"Chen presents before Deepa.",check:p=>both(p,"Chen","Deepa")?pos(p,"Chen")<pos(p,"Deepa"):null},
    {id:"r3",text:"Eva is not first or fifth.",check:p=>both(p,"Eva")?pos(p,"Eva")!==0&&pos(p,"Eva")!==4:null},
    {id:"r4",text:"Deepa does not present immediately after Beth.",check:p=>both(p,"Deepa","Beth")?pos(p,"Deepa")!==pos(p,"Beth")+1:null},
  ],exampleSolution:["Amir","Beth","Eva","Chen","Deepa"]},
  {id:"constraint-2",title:"Laboratory rota",context:"Assign one researcher to each weekday.",slots:["Monday","Tuesday","Wednesday","Thursday","Friday"],entities:["Farah","George","Hana","Isaac","Jules"],rules:[
    {id:"r1",text:"Hana works earlier in the week than George.",check:p=>both(p,"Hana","George")?pos(p,"Hana")<pos(p,"George"):null},
    {id:"r2",text:"Isaac works on Wednesday.",check:p=>both(p,"Isaac")?pos(p,"Isaac")===2:null},
    {id:"r3",text:"Farah and Jules do not work on adjacent days.",check:p=>both(p,"Farah","Jules")?Math.abs(pos(p,"Farah")-pos(p,"Jules"))!==1:null},
    {id:"r4",text:"George does not work on Friday.",check:p=>both(p,"George")?pos(p,"George")!==4:null},
  ],exampleSolution:["Hana","Farah","Isaac","George","Jules"]},
  {id:"constraint-3",title:"Interview rooms",context:"Place the candidates into the six numbered rooms.",slots:["Room 1","Room 2","Room 3","Room 4","Room 5","Room 6"],entities:["Kiran","Lena","Musa","Nina","Owen","Priya"],rules:[
    {id:"r1",text:"Kiran is in a lower-numbered room than Lena.",check:p=>both(p,"Kiran","Lena")?pos(p,"Kiran")<pos(p,"Lena"):null},
    {id:"r2",text:"Musa and Nina have exactly one room between them.",check:p=>both(p,"Musa","Nina")?Math.abs(pos(p,"Musa")-pos(p,"Nina"))===2:null},
    {id:"r3",text:"Owen is in Room 1 or Room 6.",check:p=>both(p,"Owen")?pos(p,"Owen")===0||pos(p,"Owen")===5:null},
    {id:"r4",text:"Priya is not next to Lena.",check:p=>both(p,"Priya","Lena")?Math.abs(pos(p,"Priya")-pos(p,"Lena"))!==1:null},
  ],exampleSolution:["Owen","Musa","Priya","Nina","Kiran","Lena"]},
  {id:"constraint-4",title:"Teaching sessions",context:"Arrange the five sessions from first to last.",slots:["1st","2nd","3rd","4th","5th"],entities:["Anatomy","Ethics","Genetics","Pharmacology","Statistics"],rules:[
    {id:"r1",text:"Ethics occurs before Genetics.",check:p=>both(p,"Ethics","Genetics")?pos(p,"Ethics")<pos(p,"Genetics"):null},
    {id:"r2",text:"Pharmacology occurs immediately before Statistics.",check:p=>both(p,"Pharmacology","Statistics")?pos(p,"Statistics")===pos(p,"Pharmacology")+1:null},
    {id:"r3",text:"Anatomy is neither first nor last.",check:p=>both(p,"Anatomy")?pos(p,"Anatomy")!==0&&pos(p,"Anatomy")!==4:null},
    {id:"r4",text:"Genetics is not adjacent to Statistics.",check:p=>both(p,"Genetics","Statistics")?Math.abs(pos(p,"Genetics")-pos(p,"Statistics"))!==1:null},
  ],exampleSolution:["Ethics","Pharmacology","Statistics","Anatomy","Genetics"]},
  {id:"constraint-5",title:"Community visits",context:"Arrange the five visits from Monday to Friday.",slots:["Monday","Tuesday","Wednesday","Thursday","Friday"],entities:["Care home","Clinic","School","Shelter","Youth centre"],rules:[
    {id:"r1",text:"The Clinic visit is earlier than the School visit.",check:p=>both(p,"Clinic","School")?pos(p,"Clinic")<pos(p,"School"):null},
    {id:"r2",text:"The Shelter visit is immediately after the Care home visit.",check:p=>both(p,"Shelter","Care home")?pos(p,"Shelter")===pos(p,"Care home")+1:null},
    {id:"r3",text:"The Youth centre visit is not on Monday.",check:p=>both(p,"Youth centre")?pos(p,"Youth centre")!==0:null},
    {id:"r4",text:"The School and Youth centre visits are not adjacent.",check:p=>both(p,"School","Youth centre")?Math.abs(pos(p,"School")-pos(p,"Youth centre"))!==1:null},
  ],exampleSolution:["Clinic","Youth centre","Care home","Shelter","School"]},
  {id:"constraint-6",title:"Book display",context:"Arrange five books from left to right.",slots:["Far left","Left","Centre","Right","Far right"],entities:["Atlas","Biography","Cookbook","Dictionary","Encyclopaedia"],rules:[
    {id:"r1",text:"The Atlas is somewhere left of the Dictionary.",check:p=>both(p,"Atlas","Dictionary")?pos(p,"Atlas")<pos(p,"Dictionary"):null},
    {id:"r2",text:"The Cookbook is in the centre.",check:p=>both(p,"Cookbook")?pos(p,"Cookbook")===2:null},
    {id:"r3",text:"The Biography is adjacent to the Encyclopaedia.",check:p=>both(p,"Biography","Encyclopaedia")?Math.abs(pos(p,"Biography")-pos(p,"Encyclopaedia"))===1:null},
    {id:"r4",text:"The Dictionary is not at either end.",check:p=>both(p,"Dictionary")?pos(p,"Dictionary")!==0&&pos(p,"Dictionary")!==4:null},
  ],exampleSolution:["Atlas","Dictionary","Cookbook","Biography","Encyclopaedia"]},
  {id:"constraint-7",title:"Training workshops",context:"Schedule six workshops in order.",slots:["1st","2nd","3rd","4th","5th","6th"],entities:["Communication","Data","Ethics","Leadership","Safety","Teamwork"],rules:[
    {id:"r1",text:"Safety occurs before Leadership.",check:p=>both(p,"Safety","Leadership")?pos(p,"Safety")<pos(p,"Leadership"):null},
    {id:"r2",text:"Communication occurs immediately after Teamwork.",check:p=>both(p,"Communication","Teamwork")?pos(p,"Communication")===pos(p,"Teamwork")+1:null},
    {id:"r3",text:"Data and Ethics have exactly one workshop between them.",check:p=>both(p,"Data","Ethics")?Math.abs(pos(p,"Data")-pos(p,"Ethics"))===2:null},
    {id:"r4",text:"Leadership is not sixth.",check:p=>both(p,"Leadership")?pos(p,"Leadership")!==5:null},
  ],exampleSolution:["Data","Safety","Ethics","Leadership","Teamwork","Communication"]},
  {id:"constraint-8",title:"Patient transport",context:"Arrange the five collections from first to last.",slots:["1st","2nd","3rd","4th","5th"],entities:["Adams","Brown","Clark","Davies","Evans"],rules:[
    {id:"r1",text:"Brown is collected before Clark.",check:p=>both(p,"Brown","Clark")?pos(p,"Brown")<pos(p,"Clark"):null},
    {id:"r2",text:"Davies is collected immediately before Evans.",check:p=>both(p,"Davies","Evans")?pos(p,"Evans")===pos(p,"Davies")+1:null},
    {id:"r3",text:"Adams is collected third.",check:p=>both(p,"Adams")?pos(p,"Adams")===2:null},
    {id:"r4",text:"Clark is not collected last.",check:p=>both(p,"Clark")?pos(p,"Clark")!==4:null},
  ],exampleSolution:["Brown","Clark","Adams","Davies","Evans"]},
  {id:"constraint-9",title:"Research talks",context:"Arrange the five talks from first to last.",slots:["1st","2nd","3rd","4th","5th"],entities:["Cancer","Diabetes","Genetics","Imaging","Nutrition"],rules:[
    {id:"r1",text:"Genetics is earlier than Imaging.",check:p=>both(p,"Genetics","Imaging")?pos(p,"Genetics")<pos(p,"Imaging"):null},
    {id:"r2",text:"Diabetes is immediately after Nutrition.",check:p=>both(p,"Diabetes","Nutrition")?pos(p,"Diabetes")===pos(p,"Nutrition")+1:null},
    {id:"r3",text:"Cancer is not first.",check:p=>both(p,"Cancer")?pos(p,"Cancer")!==0:null},
    {id:"r4",text:"Imaging is not adjacent to Diabetes.",check:p=>both(p,"Imaging","Diabetes")?Math.abs(pos(p,"Imaging")-pos(p,"Diabetes"))!==1:null},
  ],exampleSolution:["Genetics","Imaging","Nutrition","Diabetes","Cancer"]},
  {id:"constraint-10",title:"Delivery route",context:"Arrange the six stops from first to last.",slots:["1st","2nd","3rd","4th","5th","6th"],entities:["Bakery","Clinic","Depot","Library","Museum","School"],rules:[
    {id:"r1",text:"The Depot is visited first.",check:p=>both(p,"Depot")?pos(p,"Depot")===0:null},
    {id:"r2",text:"The Clinic is visited before the School.",check:p=>both(p,"Clinic","School")?pos(p,"Clinic")<pos(p,"School"):null},
    {id:"r3",text:"The Bakery is visited immediately after the Museum.",check:p=>both(p,"Bakery","Museum")?pos(p,"Bakery")===pos(p,"Museum")+1:null},
    {id:"r4",text:"The Library is not adjacent to the School.",check:p=>both(p,"Library","School")?Math.abs(pos(p,"Library")-pos(p,"School"))!==1:null},
  ],exampleSolution:["Depot","Clinic","Library","Museum","Bakery","School"]},
  {id:"constraint-11",title:"Revision topics",context:"Arrange five topics across one study day.",slots:["1st","2nd","3rd","4th","5th"],entities:["Algebra","Ethics","Probability","Reading","Venn"],rules:[
    {id:"r1",text:"Reading occurs before Ethics.",check:p=>both(p,"Reading","Ethics")?pos(p,"Reading")<pos(p,"Ethics"):null},
    {id:"r2",text:"Probability is immediately before Venn.",check:p=>both(p,"Probability","Venn")?pos(p,"Venn")===pos(p,"Probability")+1:null},
    {id:"r3",text:"Algebra is neither first nor fifth.",check:p=>both(p,"Algebra")?pos(p,"Algebra")!==0&&pos(p,"Algebra")!==4:null},
    {id:"r4",text:"Ethics is not adjacent to Venn.",check:p=>both(p,"Ethics","Venn")?Math.abs(pos(p,"Ethics")-pos(p,"Venn"))!==1:null},
  ],exampleSolution:["Probability","Venn","Algebra","Reading","Ethics"]},
  {id:"constraint-12",title:"Dental appointments",context:"Assign five patients to the morning slots.",slots:["09:00","09:30","10:00","10:30","11:00"],entities:["Foster","Green","Hughes","Iqbal","Jones"],rules:[
    {id:"r1",text:"Green is seen earlier than Hughes.",check:p=>both(p,"Green","Hughes")?pos(p,"Green")<pos(p,"Hughes"):null},
    {id:"r2",text:"Iqbal is seen immediately after Foster.",check:p=>both(p,"Iqbal","Foster")?pos(p,"Iqbal")===pos(p,"Foster")+1:null},
    {id:"r3",text:"Jones is seen at 10:00.",check:p=>both(p,"Jones")?pos(p,"Jones")===2:null},
    {id:"r4",text:"Hughes is not seen at 11:00.",check:p=>both(p,"Hughes")?pos(p,"Hughes")!==4:null},
  ],exampleSolution:["Green","Hughes","Jones","Foster","Iqbal"]},
];

// Extra bank items are appended here to keep the core type definitions readable.
QR_SETUP_QUESTIONS.push(
  {id:"setup-11",situation:"A recipe for eight portions uses 600 g of flour. The recipe is made for 14 portions.",prompt:"Set up the calculation for the flour required.",relevantOptions:[{id:"a",label:"600 g, 8 portions and 14 portions"},{id:"b",label:"600 g and 14 only"},{id:"c",label:"8 and 14 only"},{id:"d",label:"600 g and 8 only"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Find flour per portion, then multiply by 14"},{id:"b",label:"Subtract 8 from 14"},{id:"c",label:"Multiply all three numbers"},{id:"d",label:"Find a percentage decrease"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Grams"},{id:"b",label:"Portions"},{id:"c",label:"Grams per portion"},{id:"d",label:"Percent"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"600 ÷ 8 × 14"},{id:"b",label:"600 ÷ 14 × 8"},{id:"c",label:"600 × 8 ÷ 14"},{id:"d",label:"600 + 14 − 8"}],calculationAnswer:"a",explanation:"Divide by eight to find one portion, then multiply by 14. The result remains a mass in grams."},
  {id:"setup-12",situation:"A population rises from 24,000 to 27,600.",prompt:"Set up the calculation for the percentage increase.",relevantOptions:[{id:"a",label:"Original 24,000 and new 27,600"},{id:"b",label:"27,600 only"},{id:"c",label:"The difference only"},{id:"d",label:"24,000 only"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Find the increase, divide by the original, then multiply by 100"},{id:"b",label:"Divide the original by the new value"},{id:"c",label:"Add both populations"},{id:"d",label:"Divide the increase by the new value"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Percent"},{id:"b",label:"People"},{id:"c",label:"Percentage points"},{id:"d",label:"People per year"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"(27,600 − 24,000) ÷ 24,000 × 100"},{id:"b",label:"(27,600 − 24,000) ÷ 27,600 × 100"},{id:"c",label:"27,600 ÷ 24,000"},{id:"d",label:"27,600 − 24,000 × 100"}],calculationAnswer:"a",explanation:"Percentage change uses the original value as the denominator."},
  {id:"setup-13",situation:"A £72 bill is shared in the ratio 2:3:4.",prompt:"Set up the calculation for the largest share.",relevantOptions:[{id:"a",label:"£72 and ratio 2:3:4"},{id:"b",label:"£72 and 4 only"},{id:"c",label:"Ratio 2:3:4 only"},{id:"d",label:"Number of people only"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Divide by all ratio parts, then multiply by four"},{id:"b",label:"Divide by four"},{id:"c",label:"Multiply by nine"},{id:"d",label:"Find an average"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Pounds"},{id:"b",label:"Ratio parts"},{id:"c",label:"Percent"},{id:"d",label:"Pounds per part"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"72 ÷ (2 + 3 + 4) × 4"},{id:"b",label:"72 ÷ 4"},{id:"c",label:"72 × 4 ÷ 3"},{id:"d",label:"72 ÷ (2 × 3 × 4)"}],calculationAnswer:"a",explanation:"The whole contains nine parts and the largest share contains four."},
  {id:"setup-14",situation:"A machine produces 1,350 components in 7.5 hours.",prompt:"Set up the calculation for components produced per minute.",relevantOptions:[{id:"a",label:"1,350 components and 7.5 hours"},{id:"b",label:"1,350 only"},{id:"c",label:"7.5 only"},{id:"d",label:"The word machine"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Convert hours to minutes, then divide output by time"},{id:"b",label:"Multiply output by minutes"},{id:"c",label:"Divide time by output"},{id:"d",label:"Find a percentage"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Components per minute"},{id:"b",label:"Minutes per component"},{id:"c",label:"Components"},{id:"d",label:"Hours"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"1,350 ÷ (7.5 × 60)"},{id:"b",label:"1,350 ÷ 7.5"},{id:"c",label:"7.5 × 60 ÷ 1,350"},{id:"d",label:"1,350 × 7.5 × 60"}],calculationAnswer:"a",explanation:"Seven and a half hours is 450 minutes; output divided by minutes gives the required rate."},
  {id:"setup-15",situation:"A currency exchange gives €1.17 for £1 and charges a fixed £4 fee. A customer exchanges £250.",prompt:"Set up the calculation for the euros received when the fee is taken from the sterling first.",relevantOptions:[{id:"a",label:"£250, £4 fee and €1.17 per £1"},{id:"b",label:"£250 and €1.17 only"},{id:"c",label:"£4 and €1.17 only"},{id:"d",label:"£250 and £4 only"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Subtract the fee, then apply the exchange rate"},{id:"b",label:"Apply the rate, then subtract €4"},{id:"c",label:"Add the fee before exchanging"},{id:"d",label:"Divide by the exchange rate"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Euros"},{id:"b",label:"Pounds"},{id:"c",label:"Euros per pound"},{id:"d",label:"Percent"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"(250 − 4) × 1.17"},{id:"b",label:"250 × 1.17 − 4"},{id:"c",label:"(250 + 4) × 1.17"},{id:"d",label:"(250 − 4) ÷ 1.17"}],calculationAnswer:"a",explanation:"The wording says the sterling fee is removed first, leaving £246 to convert into euros."},
);

DATA_EXTRACTION_QUESTIONS.push(
  {id:"extract-11",title:"Cinema screenings",headers:["Film","Seats","Occupied","Ticket price"],rows:[["A","180","144","£9"],["B","220","176","£8"],["C","150","135","£10"]],prompt:"Which film had the highest percentage occupancy?",sourceOptions:[{id:"a",label:"Seats and occupied seats for all films"},{id:"b",label:"Occupied seats only"},{id:"c",label:"Ticket prices and occupied seats"},{id:"d",label:"Seats only"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"Film C"},{id:"b",label:"Film A"},{id:"c",label:"Film B"},{id:"d",label:"All equal"}],valueAnswer:"a",unitOptions:[{id:"a",label:"Percent occupancy"},{id:"b",label:"Seats"},{id:"c",label:"Pounds per seat"},{id:"d",label:"Films"}],unitAnswer:"a",explanation:"A and B are 80% occupied; C is 135/150 = 90%."},
  {id:"extract-12",title:"Parcel service",headers:["Zone","Parcels","Total weight (kg)","Revenue"],rows:[["North","160","640","£2,880"],["East","120","540","£2,400"],["West","200","700","£3,200"]],prompt:"What was the average parcel weight in the East zone?",sourceOptions:[{id:"a",label:"East parcels and total weight"},{id:"b",label:"East weight and revenue"},{id:"c",label:"All parcel totals"},{id:"d",label:"North parcels and weight"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"4.5"},{id:"b",label:"5.0"},{id:"c",label:"3.5"},{id:"d",label:"20"}],valueAnswer:"a",unitOptions:[{id:"a",label:"kg per parcel"},{id:"b",label:"parcels per kg"},{id:"c",label:"kg"},{id:"d",label:"£ per parcel"}],unitAnswer:"a",explanation:"540 kg ÷ 120 parcels = 4.5 kg per parcel."},
  {id:"extract-13",title:"Vaccination sessions",headers:["Day","Booked","Vaccinated","Staff"],rows:[["Monday","150","138","6"],["Tuesday","180","162","6"],["Wednesday","140","133","7"]],prompt:"On which day were the most people vaccinated per staff member?",sourceOptions:[{id:"a",label:"Vaccinated and Staff for every day"},{id:"b",label:"Booked and Vaccinated"},{id:"c",label:"Staff only"},{id:"d",label:"Vaccinated only"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"Tuesday"},{id:"b",label:"Monday"},{id:"c",label:"Wednesday"},{id:"d",label:"Monday and Tuesday"}],valueAnswer:"a",unitOptions:[{id:"a",label:"People per staff member"},{id:"b",label:"Staff per person"},{id:"c",label:"People"},{id:"d",label:"Percent"}],unitAnswer:"a",explanation:"Monday is 23, Tuesday is 27 and Wednesday is 19 vaccinated people per staff member."},
  {id:"extract-14",title:"Monthly subscriptions",headers:["Plan","Starting users","New users","Cancelled"],rows:[["Basic","800","120","80"],["Plus","500","95","45"],["Premium","240","60","24"]],prompt:"How many Plus users were present at month end?",sourceOptions:[{id:"a",label:"All three Plus values"},{id:"b",label:"Starting and new Plus users only"},{id:"c",label:"Cancelled values for all plans"},{id:"d",label:"All Premium values"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"550"},{id:"b",label:"595"},{id:"c",label:"455"},{id:"d",label:"640"}],valueAnswer:"a",unitOptions:[{id:"a",label:"Users"},{id:"b",label:"Users per month"},{id:"c",label:"Percent"},{id:"d",label:"Plans"}],unitAnswer:"a",explanation:"500 starting + 95 new − 45 cancelled = 550 users."},
  {id:"extract-15",title:"Bus services",headers:["Service","Distance (km)","Trips","Fuel used (L)"],rows:[["X","18","12","54"],["Y","25","10","60"],["Z","15","16","64"]],prompt:"Which service used the least fuel per trip?",sourceOptions:[{id:"a",label:"Trips and fuel used for every service"},{id:"b",label:"Distance and fuel"},{id:"c",label:"Fuel used only"},{id:"d",label:"Trips only"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"Service Z"},{id:"b",label:"Service X"},{id:"c",label:"Service Y"},{id:"d",label:"X and Z equally"}],valueAnswer:"a",unitOptions:[{id:"a",label:"Litres per trip"},{id:"b",label:"Trips per litre"},{id:"c",label:"Kilometres per litre"},{id:"d",label:"Litres"}],unitAnswer:"a",explanation:"X uses 4.5 L/trip, Y uses 6 and Z uses 4, so Z is lowest."},
);

ESTIMATION_QUESTIONS.push(
  {id:"estimate-11",calculation:"3,984 × 0.051",context:"Estimate the product.",rangeOptions:[{id:"a",label:"195 to 210"},{id:"b",label:"95 to 110"},{id:"c",label:"295 to 310"},{id:"d",label:"395 to 410"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use 4,000 × 0.05"},{id:"b",label:"Use 4,000 × 0.5"},{id:"c",label:"Add 4,000 and 0.05"},{id:"d",label:"Divide 4,000 by 0.05"}],strategyAnswer:"a",exactAnswer:"203.184",explanation:"Five per cent of 4,000 is 200, so the answer should be just above 200."},
  {id:"estimate-12",calculation:"728 ÷ 8.9",context:"Estimate the quotient.",rangeOptions:[{id:"a",label:"80 to 85"},{id:"b",label:"60 to 65"},{id:"c",label:"100 to 105"},{id:"d",label:"120 to 125"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use 729 ÷ 9"},{id:"b",label:"Use 720 ÷ 6"},{id:"c",label:"Multiply 729 by 9"},{id:"d",label:"Subtract 9 from 729"}],strategyAnswer:"a",exactAnswer:"81.80",explanation:"729 ÷ 9 = 81, placing the result securely in the 80 to 85 range."},
  {id:"estimate-13",calculation:"24.7% of 1,196",context:"Choose the closest range.",rangeOptions:[{id:"a",label:"290 to 300"},{id:"b",label:"190 to 200"},{id:"c",label:"390 to 400"},{id:"d",label:"490 to 500"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use 25% of 1,200"},{id:"b",label:"Use 20% of 1,000"},{id:"c",label:"Divide 25 by 1,200"},{id:"d",label:"Add 25 to 1,200"}],strategyAnswer:"a",exactAnswer:"295.412",explanation:"One quarter of 1,200 is 300; both exact inputs are slightly smaller."},
  {id:"estimate-14",calculation:"61.2 × 4.94",context:"Estimate the product.",rangeOptions:[{id:"a",label:"295 to 305"},{id:"b",label:"195 to 205"},{id:"c",label:"395 to 405"},{id:"d",label:"495 to 505"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use 60 × 5"},{id:"b",label:"Use 60 × 4"},{id:"c",label:"Add 60 and 5"},{id:"d",label:"Divide 60 by 5"}],strategyAnswer:"a",exactAnswer:"302.328",explanation:"60 × 5 = 300, which is close enough to identify the interval."},
  {id:"estimate-15",calculation:"£9,870 ÷ 198",context:"Estimate the amount per person.",rangeOptions:[{id:"a",label:"£45 to £55"},{id:"b",label:"£25 to £35"},{id:"c",label:"£65 to £75"},{id:"d",label:"£85 to £95"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use £10,000 ÷ 200"},{id:"b",label:"Use £9,000 ÷ 100"},{id:"c",label:"Subtract 200 from 10,000"},{id:"d",label:"Multiply 10,000 by 200"}],strategyAnswer:"a",exactAnswer:"£49.85",explanation:"£10,000 ÷ 200 = £50, almost exactly the required calculation."},
);

QR_SETUP_QUESTIONS.push(
  {id:"setup-16",situation:"A tank containing 320 litres loses 7.5% of its water through a leak.",prompt:"Set up the calculation for the water remaining.",relevantOptions:[{id:"a",label:"320 litres and 7.5%"},{id:"b",label:"320 litres only"},{id:"c",label:"7.5 litres"},{id:"d",label:"The leak duration"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Retain 92.5% of the starting volume"},{id:"b",label:"Increase by 7.5%"},{id:"c",label:"Subtract 7.5 litres"},{id:"d",label:"Divide by 7.5"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Litres"},{id:"b",label:"Percent"},{id:"c",label:"Litres per cent"},{id:"d",label:"Minutes"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"320 × 0.925"},{id:"b",label:"320 × 1.075"},{id:"c",label:"320 − 7.5"},{id:"d",label:"320 ÷ 0.075"}],calculationAnswer:"a",explanation:"A 7.5% loss leaves 92.5% of the original volume."},
  {id:"setup-17",situation:"A worker earns £14.40 per hour for 37.5 hours and receives a £65 bonus.",prompt:"Set up the calculation for total gross pay.",relevantOptions:[{id:"a",label:"£14.40, 37.5 hours and £65"},{id:"b",label:"£14.40 and £65 only"},{id:"c",label:"37.5 hours and £65 only"},{id:"d",label:"£14.40 and 37.5 hours only"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Multiply hourly pay by hours, then add the bonus"},{id:"b",label:"Add the rate to the hours"},{id:"c",label:"Subtract the bonus"},{id:"d",label:"Divide the bonus by the hours"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Pounds"},{id:"b",label:"Pounds per hour"},{id:"c",label:"Hours"},{id:"d",label:"Percent"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"14.40 × 37.5 + 65"},{id:"b",label:"(14.40 + 65) × 37.5"},{id:"c",label:"14.40 × (37.5 − 65)"},{id:"d",label:"65 ÷ 37.5 × 14.40"}],calculationAnswer:"a",explanation:"Regular earnings are rate × time; the fixed bonus is added afterwards."},
  {id:"setup-18",situation:"A map uses a scale of 1:25,000. Two points are 6.8 cm apart on the map.",prompt:"Set up the calculation for the real distance in kilometres.",relevantOptions:[{id:"a",label:"Scale 1:25,000 and 6.8 cm"},{id:"b",label:"6.8 cm only"},{id:"c",label:"25,000 only"},{id:"d",label:"Number of points"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Multiply by the scale, then convert centimetres to kilometres"},{id:"b",label:"Divide by the scale"},{id:"c",label:"Add the scale to the distance"},{id:"d",label:"Find a percentage"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Kilometres"},{id:"b",label:"Centimetres"},{id:"c",label:"Map centimetres per kilometre"},{id:"d",label:"Square kilometres"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"6.8 × 25,000 ÷ 100,000"},{id:"b",label:"6.8 ÷ 25,000 × 100,000"},{id:"c",label:"6.8 × 25,000 ÷ 1,000"},{id:"d",label:"25,000 ÷ 6.8"}],calculationAnswer:"a",explanation:"The scale produces a real distance in centimetres; 100,000 cm equals 1 km."},
  {id:"setup-19",situation:"The mean of six test scores is 72. Five scores total 349.",prompt:"Set up the calculation for the sixth score.",relevantOptions:[{id:"a",label:"Mean 72, six scores and known total 349"},{id:"b",label:"Mean and five only"},{id:"c",label:"349 only"},{id:"d",label:"Six and 349 only"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Find the total for six scores, then subtract the known total"},{id:"b",label:"Divide 349 by six"},{id:"c",label:"Add 72 to 349"},{id:"d",label:"Average 72 and 349"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Marks"},{id:"b",label:"Marks per student"},{id:"c",label:"Students"},{id:"d",label:"Percent"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"72 × 6 − 349"},{id:"b",label:"349 ÷ 6"},{id:"c",label:"72 × 5 − 349"},{id:"d",label:"(72 + 349) ÷ 6"}],calculationAnswer:"a",explanation:"Mean × number gives the total of all six scores; remove the five-score total."},
  {id:"setup-20",situation:"A car's fuel efficiency improves from 40 miles per gallon to 46 miles per gallon.",prompt:"Set up the calculation for the percentage improvement.",relevantOptions:[{id:"a",label:"Original 40 and new 46 mpg"},{id:"b",label:"46 only"},{id:"c",label:"The six-mile difference only"},{id:"d",label:"40 only"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Divide the increase by the original and multiply by 100"},{id:"b",label:"Divide the increase by the new value"},{id:"c",label:"Divide 46 by six"},{id:"d",label:"Add the two efficiencies"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Percent"},{id:"b",label:"Miles per gallon"},{id:"c",label:"Gallons per mile"},{id:"d",label:"Percentage points"}],unitAnswer:"a",calculationOptions:[{id:"a",label:"(46 − 40) ÷ 40 × 100"},{id:"b",label:"(46 − 40) ÷ 46 × 100"},{id:"c",label:"46 ÷ 40"},{id:"d",label:"46 − 40 × 100"}],calculationAnswer:"a",explanation:"Percentage improvement is measured relative to the original 40 mpg."},
);

DATA_EXTRACTION_QUESTIONS.push(
  {id:"extract-16",title:"Hotel rooms",headers:["Month","Available nights","Occupied nights","Revenue"],rows:[["April","1,200","900","£81,000"],["May","1,240","992","£94,240"],["June","1,200","1,020","£102,000"]],prompt:"In which month was the occupancy rate highest?",sourceOptions:[{id:"a",label:"Available and occupied nights for every month"},{id:"b",label:"Occupied nights only"},{id:"c",label:"Revenue and occupied nights"},{id:"d",label:"Available nights only"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"June"},{id:"b",label:"April"},{id:"c",label:"May"},{id:"d",label:"May and June equally"}],valueAnswer:"a",unitOptions:[{id:"a",label:"Percent occupancy"},{id:"b",label:"Room nights"},{id:"c",label:"Pounds per night"},{id:"d",label:"Months"}],unitAnswer:"a",explanation:"April is 75%, May is 80% and June is 85% occupied."},
  {id:"extract-17",title:"Fundraising events",headers:["Event","Income","Costs","Volunteers"],rows:[["Run","£8,400","£2,100","35"],["Quiz","£5,600","£800","24"],["Concert","£12,700","£4,500","40"]],prompt:"Which event produced the greatest net income per volunteer?",sourceOptions:[{id:"a",label:"Income, costs and volunteers for every event"},{id:"b",label:"Income and volunteers only"},{id:"c",label:"Costs only"},{id:"d",label:"Volunteer totals only"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"Concert"},{id:"b",label:"Run"},{id:"c",label:"Quiz"},{id:"d",label:"Run and Concert equally"}],valueAnswer:"a",unitOptions:[{id:"a",label:"Pounds per volunteer"},{id:"b",label:"Volunteers per pound"},{id:"c",label:"Pounds"},{id:"d",label:"Percent"}],unitAnswer:"a",explanation:"Net income per volunteer is £180 for Run, £200 for Quiz and £205 for Concert, so Concert is greatest."},
  {id:"extract-18",title:"Warehouse stock",headers:["Item","Opening stock","Received","Dispatched"],rows:[["Gloves","1,200","500","980"],["Masks","2,400","800","1,750"],["Gowns","900","360","740"]],prompt:"How many masks remained at the end?",sourceOptions:[{id:"a",label:"All three Masks values"},{id:"b",label:"Opening and received only"},{id:"c",label:"Dispatched values for all items"},{id:"d",label:"All Gloves values"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"1,450"},{id:"b",label:"3,200"},{id:"c",label:"650"},{id:"d",label:"1,550"}],valueAnswer:"a",unitOptions:[{id:"a",label:"Masks"},{id:"b",label:"Boxes per day"},{id:"c",label:"Percent"},{id:"d",label:"Items dispatched"}],unitAnswer:"a",explanation:"2,400 + 800 − 1,750 = 1,450 masks."},
  {id:"extract-19",title:"Mobile data plans",headers:["Plan","Monthly cost","Data (GB)","Minutes"],rows:[["Lite","£12","8","500"],["Standard","£18","20","Unlimited"],["Max","£27","45","Unlimited"]],prompt:"Which plan has the lowest monthly cost per GB?",sourceOptions:[{id:"a",label:"Monthly cost and data for every plan"},{id:"b",label:"Minutes and cost"},{id:"c",label:"Data only"},{id:"d",label:"Cost only"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"Max"},{id:"b",label:"Lite"},{id:"c",label:"Standard"},{id:"d",label:"Standard and Max equally"}],valueAnswer:"a",unitOptions:[{id:"a",label:"Pounds per GB"},{id:"b",label:"GB per pound"},{id:"c",label:"Minutes per GB"},{id:"d",label:"Pounds"}],unitAnswer:"a",explanation:"Lite costs £1.50/GB, Standard £0.90/GB and Max £0.60/GB."},
  {id:"extract-20",title:"Charity shops",headers:["Shop","Sales","Donations","Opening days"],rows:[["Hill","£14,400","960","24"],["Market","£18,200","1,300","26"],["Riverside","£12,600","840","21"]],prompt:"Which shop had the highest average sales per opening day?",sourceOptions:[{id:"a",label:"Sales and opening days for every shop"},{id:"b",label:"Sales and donations"},{id:"c",label:"Opening days only"},{id:"d",label:"Sales only"}],sourceAnswer:"a",valueOptions:[{id:"a",label:"Market"},{id:"b",label:"Hill"},{id:"c",label:"Riverside"},{id:"d",label:"All equal"}],valueAnswer:"a",unitOptions:[{id:"a",label:"Pounds per day"},{id:"b",label:"Days per pound"},{id:"c",label:"Donations per day"},{id:"d",label:"Pounds"}],unitAnswer:"a",explanation:"Hill and Riverside each average £600/day; Market averages £700/day."},
);

ESTIMATION_QUESTIONS.push(
  {id:"estimate-16",calculation:"7.98 × 62.4",context:"Estimate the product.",rangeOptions:[{id:"a",label:"490 to 510"},{id:"b",label:"390 to 410"},{id:"c",label:"590 to 610"},{id:"d",label:"690 to 710"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use 8 × 62.5"},{id:"b",label:"Use 8 × 50"},{id:"c",label:"Add 8 and 62"},{id:"d",label:"Divide 62 by 8"}],strategyAnswer:"a",exactAnswer:"497.952",explanation:"Eight times 62.5 is exactly 500, very close to the original expression."},
  {id:"estimate-17",calculation:"15,240 ÷ 304",context:"Estimate the quotient.",rangeOptions:[{id:"a",label:"48 to 52"},{id:"b",label:"28 to 32"},{id:"c",label:"68 to 72"},{id:"d",label:"88 to 92"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use 15,000 ÷ 300"},{id:"b",label:"Use 15,000 ÷ 150"},{id:"c",label:"Subtract 300 from 15,000"},{id:"d",label:"Multiply 15,000 by 300"}],strategyAnswer:"a",exactAnswer:"50.13",explanation:"15,000 ÷ 300 = 50."},
  {id:"estimate-18",calculation:"39.6% of 755",context:"Choose the closest range.",rangeOptions:[{id:"a",label:"295 to 305"},{id:"b",label:"195 to 205"},{id:"c",label:"395 to 405"},{id:"d",label:"495 to 505"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use 40% of 750"},{id:"b",label:"Use 4% of 750"},{id:"c",label:"Divide 750 by 40"},{id:"d",label:"Add 40 to 750"}],strategyAnswer:"a",exactAnswer:"298.98",explanation:"Forty per cent of 750 is 300, almost exactly the required value."},
  {id:"estimate-19",calculation:"(1,506 + 2,487) ÷ 19.8",context:"Estimate the result.",rangeOptions:[{id:"a",label:"195 to 205"},{id:"b",label:"145 to 155"},{id:"c",label:"245 to 255"},{id:"d",label:"295 to 305"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use (1,500 + 2,500) ÷ 20"},{id:"b",label:"Use 4,000 ÷ 10"},{id:"c",label:"Multiply 4,000 by 20"},{id:"d",label:"Subtract 20 from 4,000"}],strategyAnswer:"a",exactAnswer:"201.67",explanation:"The rounded numerator is 4,000 and 4,000 ÷ 20 = 200."},
  {id:"estimate-20",calculation:"0.804 × 497",context:"Estimate the product.",rangeOptions:[{id:"a",label:"395 to 405"},{id:"b",label:"295 to 305"},{id:"c",label:"495 to 505"},{id:"d",label:"595 to 605"}],rangeAnswer:"a",strategyOptions:[{id:"a",label:"Use 0.8 × 500"},{id:"b",label:"Use 0.4 × 500"},{id:"c",label:"Add 0.8 to 500"},{id:"d",label:"Divide 500 by 0.8"}],strategyAnswer:"a",exactAnswer:"399.588",explanation:"Eighty per cent of 500 is 400."},
);

CONSTRAINT_PUZZLES.push(
  {id:"constraint-13",title:"Podcast recordings",context:"Arrange the five recordings from first to last.",slots:["1st","2nd","3rd","4th","5th"],entities:["Admissions","Careers","Finance","Research","Wellbeing"],rules:[{id:"r1",text:"Research is before Finance.",check:p=>both(p,"Research","Finance")?pos(p,"Research")<pos(p,"Finance"):null},{id:"r2",text:"Careers is immediately after Admissions.",check:p=>both(p,"Careers","Admissions")?pos(p,"Careers")===pos(p,"Admissions")+1:null},{id:"r3",text:"Wellbeing is not last.",check:p=>both(p,"Wellbeing")?pos(p,"Wellbeing")!==4:null},{id:"r4",text:"Finance is not adjacent to Careers.",check:p=>both(p,"Finance","Careers")?Math.abs(pos(p,"Finance")-pos(p,"Careers"))!==1:null}],exampleSolution:["Admissions","Careers","Research","Wellbeing","Finance"]},
  {id:"constraint-14",title:"Exhibition stands",context:"Arrange six stands from left to right.",slots:["1st","2nd","3rd","4th","5th","6th"],entities:["Art","Biology","Chemistry","Design","Engineering","Physics"],rules:[{id:"r1",text:"Chemistry is left of Physics.",check:p=>both(p,"Chemistry","Physics")?pos(p,"Chemistry")<pos(p,"Physics"):null},{id:"r2",text:"Art is immediately beside Design.",check:p=>both(p,"Art","Design")?Math.abs(pos(p,"Art")-pos(p,"Design"))===1:null},{id:"r3",text:"Engineering is at an end.",check:p=>both(p,"Engineering")?pos(p,"Engineering")===0||pos(p,"Engineering")===5:null},{id:"r4",text:"Biology is not beside Physics.",check:p=>both(p,"Biology","Physics")?Math.abs(pos(p,"Biology")-pos(p,"Physics"))!==1:null}],exampleSolution:["Engineering","Chemistry","Physics","Art","Design","Biology"]},
  {id:"constraint-15",title:"Home visits",context:"Arrange five home visits through the afternoon.",slots:["1st","2nd","3rd","4th","5th"],entities:["King","Lewis","Moore","Nash","Patel"],rules:[{id:"r1",text:"Lewis is visited before Moore.",check:p=>both(p,"Lewis","Moore")?pos(p,"Lewis")<pos(p,"Moore"):null},{id:"r2",text:"Nash is visited immediately after Patel.",check:p=>both(p,"Nash","Patel")?pos(p,"Nash")===pos(p,"Patel")+1:null},{id:"r3",text:"King is not first or last.",check:p=>both(p,"King")?pos(p,"King")!==0&&pos(p,"King")!==4:null},{id:"r4",text:"Moore is not adjacent to Nash.",check:p=>both(p,"Moore","Nash")?Math.abs(pos(p,"Moore")-pos(p,"Nash"))!==1:null}],exampleSolution:["Lewis","King","Moore","Patel","Nash"]},
  {id:"constraint-16",title:"Committee speakers",context:"Arrange five speakers from first to last.",slots:["1st","2nd","3rd","4th","5th"],entities:["Quinn","Reed","Singh","Taylor","Usman"],rules:[{id:"r1",text:"Singh speaks before Taylor.",check:p=>both(p,"Singh","Taylor")?pos(p,"Singh")<pos(p,"Taylor"):null},{id:"r2",text:"Reed speaks immediately before Usman.",check:p=>both(p,"Reed","Usman")?pos(p,"Usman")===pos(p,"Reed")+1:null},{id:"r3",text:"Quinn speaks third.",check:p=>both(p,"Quinn")?pos(p,"Quinn")===2:null},{id:"r4",text:"Taylor does not speak last.",check:p=>both(p,"Taylor")?pos(p,"Taylor")!==4:null}],exampleSolution:["Singh","Taylor","Quinn","Reed","Usman"]},
);

// Deterministic variants expand repeat practice while keeping every figure and
// answer derived from the same source values.
[
  [21, 560, 12], [22, 875, 16], [23, 420, 8], [24, 960, 22], [25, 735, 14],
].forEach(([n, original, increase]) => {
  const multiplier = 1 + increase / 100;
  QR_SETUP_QUESTIONS.push({id:`setup-${n}`,situation:`An organisation's weekly total of ${original} increases by ${increase}%.`,prompt:"Set up the calculation for the new weekly total.",relevantOptions:[{id:"a",label:`${original} and ${increase}%`},{id:"b",label:`${original} only`},{id:"c",label:`${increase} only`},{id:"d",label:"The number of weeks"}],relevantAnswer:"a",operationOptions:[{id:"a",label:"Apply a percentage increase"},{id:"b",label:"Apply a percentage decrease"},{id:"c",label:"Divide into a ratio"},{id:"d",label:"Find a mean"}],operationAnswer:"a",unitOptions:[{id:"a",label:"Items per week"},{id:"b",label:"Percent"},{id:"c",label:"Weeks"},{id:"d",label:"Items per cent"}],unitAnswer:"a",calculationOptions:[{id:"a",label:`${original} × ${multiplier.toFixed(2)}`},{id:"b",label:`${original} × ${(increase/100).toFixed(2)}`},{id:"c",label:`${original} ÷ ${multiplier.toFixed(2)}`},{id:"d",label:`${original} + ${increase}`}],calculationAnswer:"a",explanation:`An increase of ${increase}% means retaining 100% and adding ${increase}%, so the multiplier is ${multiplier.toFixed(2)}.`});
});

[
  [21,"Red",180,156,"Blue",240,204], [22,"East",320,272,"West",280,245], [23,"Alpha",450,396,"Beta",375,330], [24,"Day",210,189,"Night",190,162], [25,"Online",520,468,"Centre",340,289],
].forEach(([n,a,at,ac,b,bt,bc]) => {
  const total = Number(at)+Number(bt)-Number(ac)-Number(bc);
  DATA_EXTRACTION_QUESTIONS.push({id:`extract-${n}`,title:"Completed bookings",headers:["Group","Booked","Completed"],rows:[[String(a),String(at),String(ac)],[String(b),String(bt),String(bc)]],prompt:"How many bookings across both groups were not completed?",sourceOptions:[{id:"a",label:"Booked and Completed for both groups"},{id:"b",label:"Completed values only"},{id:"c",label:`${a} values only`},{id:"d",label:"Booked values only"}],sourceAnswer:"a",valueOptions:[{id:"a",label:String(total)},{id:"b",label:String(Number(at)-Number(ac))},{id:"c",label:String(Number(bt)-Number(bc))},{id:"d",label:String(Number(ac)+Number(bc))}],valueAnswer:"a",unitOptions:[{id:"a",label:"Bookings"},{id:"b",label:"Groups"},{id:"c",label:"Percent"},{id:"d",label:"Bookings per group"}],unitAnswer:"a",explanation:`Subtract completed from booked in each row, then combine: ${Number(at)-Number(ac)} + ${Number(bt)-Number(bc)} = ${total}.`});
});

[
  [21,49.8,31],[22,24.9,44],[23,75.2,12],[24,19.8,63],[25,39.9,27],
].forEach(([n,x,y]) => {
  const whole=Math.round(Number(x)), exact=Number(x)*Number(y), rounded=whole*Number(y), low=Math.floor(exact/10)*10;
  // The rounded product often lands on (or past) a range edge, so the explanation
  // always shows the correction step that pins the estimate inside the interval.
  const gap=Math.round(Math.abs(whole-Number(x))*10)/10, correction=Math.round(gap*Number(y)*10)/10;
  const direction=whole>Number(x)?"above":"below", adjust=whole>Number(x)?"subtract":"add";
  const corrected=whole>Number(x)?rounded-correction:rounded+correction;
  ESTIMATION_QUESTIONS.push({id:`estimate-${n}`,calculation:`${x} × ${y}`,context:"Estimate the product before calculating exactly.",rangeOptions:[{id:"a",label:`${low} to ${low+10}`},{id:"b",label:`${low-100} to ${low-90}`},{id:"c",label:`${low+100} to ${low+110}`},{id:"d",label:`${low+200} to ${low+210}`}],rangeAnswer:"a",strategyOptions:[{id:"a",label:`Round ${x} to ${Math.round(Number(x))}, then multiply by ${y}`},{id:"b",label:"Add the two values"},{id:"c",label:"Divide the larger by the smaller"},{id:"d",label:"Round both values down to ten"}],strategyAnswer:"a",exactAnswer:exact.toFixed(1),explanation:`${whole} × ${y} = ${rounded}. ${whole} is ${gap} ${direction} ${x}, so ${adjust} ${gap} × ${y} = ${correction} to get about ${Math.round(corrected)}, which sits inside ${low} to ${low+10}. The exact product is ${exact.toFixed(1)}.`});
});

[
  [17,"Asha","Ben","Cara","Dylan","Esme"], [18,"Faye","Gino","Hope","Ivan","Jade"], [19,"Kofi","Lara","Mina","Noah","Orla"], [20,"Pia","Ravi","Sara","Theo","Uma"],
].forEach(([n,a,b,c,d,e]) => CONSTRAINT_PUZZLES.push({id:`constraint-${n}`,title:"Five-place ordering",context:"Build an order that satisfies all four rules.",slots:["1st","2nd","3rd","4th","5th"],entities:[a,b,c,d,e].map(String),rules:[{id:"r1",text:`${a} is before ${d}.`,check:p=>both(p,String(a),String(d))?pos(p,String(a))<pos(p,String(d)):null},{id:"r2",text:`${b} is immediately before ${c}.`,check:p=>both(p,String(b),String(c))?pos(p,String(c))===pos(p,String(b))+1:null},{id:"r3",text:`${e} is not first.`,check:p=>both(p,String(e))?pos(p,String(e))!==0:null},{id:"r4",text:`${d} is not adjacent to ${c}.`,check:p=>both(p,String(d),String(c))?Math.abs(pos(p,String(d))-pos(p,String(c)))!==1:null}],exampleSolution:[String(a),String(d),String(b),String(c),String(e)]}));
