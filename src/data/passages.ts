export type Passage = {
  id: string;
  title: string;
  text: string;
  category: string;
  difficulty: number; // 1 (easiest) - 10 (hardest)
};

type PassageBase = Omit<Passage, "difficulty">;

export const RAW_PASSAGES: PassageBase[] =
[
  {
    "id": "pass_01",
    "title": "Autonomy in Geriatric Care",
    "text": "The principle of autonomy is a cornerstone of modern medical ethics. It dictates that patients must always have the final say in their treatment decisions provided they possess the capacity to consent. However treating geriatric patients frequently presents complex challenges to this ideal as cognitive decline can obscure the line between competence and incapacity.\n\nPhysicians might feel compelled to override a patient's wishes if the refusal of treatment would lead to severe harm yet this paternalistic approach is increasingly viewed as outdated. Some ethicists argue that soft paternalism is necessary in cases of fluctuating capacity while others maintain that autonomy allows for choices that seem irrational to observers. Family members often intervene believing they know what is best for the patient which can lead to further conflicts.\n\nConsequently doctors often face the dilemma of balancing the duty of care with the duty to respect freedom. The legal framework in the United Kingdom requires that every effort is made to support decision making before capacity is deemed absent. Ultimately the resolution usually relies on a careful assessment of the specific risks and benefits involved in the proposed intervention.",
    "category": "Ethics"
  },
  {
    "id": "pass_02",
    "title": "The Bronze Age Collapse",
    "text": "The transition from the Bronze Age to the Iron Age in the Eastern Mediterranean was marked by a catastrophic systems collapse around 1200 BCE. Major civilisations including the Mycenaeans and the Hittites vanished from the historical record in a relatively short period. Historians have long debated the primary cause of this widespread destruction.\n\nEarly theories often focused entirely on military invasions specifically the migration of the Sea Peoples who were said to have ravaged the coastlines. However modern archaeology suggests that a single explanation is never sufficient to account for such a total societal breakdown. Climate data indicates that a series of severe droughts occurred simultaneously which would have decimated agricultural output.\n\nThis environmental stress likely exacerbated internal social tensions and economic fragility. Trade networks that supplied essential tin and copper were disrupted causing the halt of bronze production. It is now widely believed that a combination of environmental disaster disrupted trade and warfare created a domino effect. While some cities were destroyed by fire others were simply abandoned.",
    "category": "History"
  },
  {
    "id": "pass_03",
    "title": "Antibiotic Resistance Mechanisms",
    "text": "Antibiotic resistance represents one of the most significant threats to global health in the twenty first century. Bacteria evolve rapidly and they can acquire resistance genes through mutation or horizontal gene transfer. One common mechanism involves the production of enzymes that degrade the antibiotic molecule rendering it ineffective before it can damage the bacterial cell.\n\nFor instance beta lactamases are enzymes that break down the ring structure of penicillin drugs. Another strategy bacteria use is to alter the permeability of their cell walls which prevents the drug from entering the cell in sufficient concentrations. Efflux pumps are also frequently observed where the bacterium actively transports the antibiotic out of the cell.\n\nSome strains have even developed the ability to alter the target site of the antibiotic so the drug can no longer bind. The overuse of antibiotics in agriculture and human medicine has undoubtedly accelerated this process. While new antibiotics are being developed the pace of discovery is slow compared to the rate of bacterial evolution. Scientists argue that strict stewardship programs must be implemented globally to preserve existing drugs.",
    "category": "Science"
  },
  {
    "id": "pass_04",
    "title": "Utilitarianism and Triage",
    "text": "Triage protocols in emergency medicine are the practical application of utilitarian ethics where the goal is to do the greatest good for the greatest number. In mass casualty incidents medical resources are invariably scarce and doctors cannot treat every patient immediately. Patients are categorized based on the severity of their injuries.\n\nThose who are likely to survive without immediate care and those who are unlikely to survive even with maximal care are prioritised lower than those for whom immediate intervention will make the difference between life and death. This approach inevitably leads to difficult moral distress as physicians must sometimes withhold treatment from patients who have a poor prognosis.\n\nCritics of utilitarianism argue that this treats individuals merely as means to an end ignoring the inherent value of each human life. However in a crisis scenario adherence to a strict egalitarian approach where everyone gets equal attention would likely result in fewer total survivors. Most medical guidelines support the utilitarian framework during disasters yet the emotional toll is significant.",
    "category": "Ethics"
  },
  {
    "id": "pass_05",
    "title": "The Industrial Revolution in Manchester",
    "text": "Manchester is frequently cited as the first industrial city in the world serving as the archetype for the rapid urbanisation that characterized the nineteenth century. The booming textile industry driven by steam power transformed the region from a collection of market towns into a sprawling metropolis.\n\nThis growth brought immense wealth to the factory owners but it also created dire living conditions for the working class. Housing was constructed rapidly and poorly leading to overcrowding and a total lack of sanitation. Diseases such as cholera and typhoid were rampant spreading through contaminated water supplies. The air was perpetually thick with coal smoke.\n\nSocial reformers of the time often described Manchester as a vision of hell on earth. Despite the squalor the city was a hub of intellectual and political activity including the birth of the free trade movement. Labour unions began to form as workers realised that collective action was the only way to improve their lot. The contrast between the grand buildings and the slums highlighted the deep inequality.",
    "category": "History"
  },
  {
    "id": "pass_06",
    "title": "Confidentiality in Adolescence",
    "text": "The legal and ethical framework surrounding confidentiality for minors is fraught with complexity. In the United Kingdom a young person under the age of sixteen might be deemed competent to consent to medical treatment without parental knowledge if they meet specific criteria known as Gillick competence. However this does not automatically guarantee absolute secrecy.\n\nDoctors often face a dilemma when a competent minor discloses information that suggests a risk of significant harm. While the duty of confidentiality is paramount it is never absolute. If a clinician believes that a young patient is being abused or is in danger of serious injury they must breach confidentiality to protect the child.\n\nSome practitioners argue that breaking trust in these instances could deter adolescents from seeking help in the future. Conversely others maintain that the safety of the minor always supersedes the right to privacy. The decision to disclose information against a patient's wishes is rarely taken lightly and usually requires consultation with senior colleagues. Trust is the foundation of the relationship.",
    "category": "Ethics"
  },
  {
    "id": "pass_07",
    "title": "The Silk Road Trade",
    "text": "The Silk Road was not a single thoroughfare but a vast network of trade routes connecting the East and West. It facilitated the exchange of goods such as silk spices and precious metals but it also enabled the transmission of ideas technologies and diseases across vast distances.\n\nHistorians emphasize that the Silk Road was never static as routes shifted due to political instability and environmental changes. While the trade brought immense wealth to cities like Samarkand and Xi'an it also exposed populations to the devastation of the Black Death. Some scholars argue that the cultural impact was more significant than its economic value.\n\nBuddhism Islam and Christianity all spread along these paths transforming the religious landscape of Eurasia. The decline of the Silk Road is often attributed to the rise of maritime trade routes in the fifteenth century which offered a faster alternative. However the legacy of this network persists in modern geopolitical strategies as recent projects aim to revive these ancient connections.",
    "category": "History"
  },
  {
    "id": "pass_08",
    "title": "Plate Tectonics and Volcanism",
    "text": "The theory of plate tectonics provides a comprehensive framework for understanding the geological forces that shape the Earth. The lithosphere is divided into several large plates that float on the semi fluid asthenosphere. Interactions at the boundaries of these plates are responsible for most volcanic activity.\n\nAt divergent boundaries plates move apart allowing magma to rise and form new crust often creating mid ocean ridges. Conversely at convergent boundaries one plate is usually forced beneath another in a process called subduction. This action frequently leads to the formation of explosive volcanoes as the subducted plate melts.\n\nNot all volcanoes occur at plate boundaries however. Some form over hot spots where a plume of hot mantle material rises through the crust. The Hawaiian Islands are a classic example of this phenomenon. While the movement of plates is generally slow sudden slips can cause devastating earthquakes. Understanding these mechanisms is essential for mitigating risks in active regions.",
    "category": "Science"
  },
  {
    "id": "pass_09",
    "title": "Resource Allocation in Pandemics",
    "text": "During a pandemic healthcare systems frequently face the crisis of scarce resources such as ventilators and intensive care beds. Ethical guidelines must be established to determine who receives life saving treatment when demand exceeds supply. The utilitarian approach is widely accepted in these scenarios.\n\nHowever this method can disadvantage certain groups such as the elderly or those with disabilities who might have a lower likelihood of survival. Some ethicists argue that a lottery system is the only truly fair method of allocation as it treats all individuals as equals regardless of their prognosis. Others contend that prioritizing frontline workers is necessary.\n\nDecisions made during these times are always emotionally charging and can leave lasting moral injury on the staff involved. Transparency in decision making is crucial to maintain public trust. If the criteria for allocation are perceived as biased or corrupt social cohesion can rapidly deteriorate. Ultimately society must accept that in extreme circumstances not everyone can be saved.",
    "category": "Ethics"
  },
  {
    "id": "pass_10",
    "title": "The Invention of the Printing Press",
    "text": "The introduction of the movable type printing press by Johannes Gutenberg in the fifteenth century is universally recognized as a pivotal moment in history. Before this innovation books were hand copied by scribes making them rare and expensive items for the elite.\n\nThe printing press allowed for the mass production of texts which drastically reduced the cost of books and increased literacy rates across Europe. This technological leap facilitated the rapid spread of the Renaissance and the Reformation. Ideas that were once confined to a small group could now reach a broader audience.\n\nSome historians argue that the scientific revolution would have been impossible without the ability to disseminate findings accurately. However the press also enabled the spread of propaganda. Governments often attempted to control the output of the press through censorship but the flow of information proved difficult to stem. It fundamentally altered the way society processed information.",
    "category": "History"
  },
  {
    "id": "pass_11",
    "title": "Enzyme Specificity and Function",
    "text": "Enzymes are biological catalysts that speed up chemical reactions within living organisms without being consumed in the process. Each enzyme is highly specific to a particular substrate meaning it will only bind to a specific molecule or group of molecules based on its shape.\n\nThis specificity is determined by the unique three dimensional shape of the enzyme's active site. The lock and key model was an early attempt to explain this interaction. However the induced fit model is now considered more accurate as it describes how the enzyme changes shape slightly to accommodate the substrate perfectly.\n\nEnzymes are sensitive to their environment. Extreme temperatures or pH levels can denature the enzyme destroying its shape and rendering it functionless. Most enzymes in the human body work best at body temperature. Inhibitors can also affect enzyme activity by blocking the active site. Understanding enzyme kinetics is vital for pharmacology.",
    "category": "Science"
  },
  {
    "id": "pass_12",
    "title": "Genetic Modification of Embryos",
    "text": "The prospect of genetically modifying human embryos using technologies like CRISPR has ignited a fierce ethical debate. Proponents argue that this technology holds the potential to eliminate severe hereditary diseases such as cystic fibrosis before birth. They maintain that parents have a moral obligation to prevent suffering.\n\nHowever critics fear that allowing therapeutic modifications could lead to a slippery slope towards eugenics. The creation of designer babies where genetic traits are selected for enhancement rather than health is a significant concern. There is also the issue of consent as the future child cannot agree to the alteration.\n\nFurthermore the long term effects of germline editing are unknown and unintended mutations could be passed down to future generations. International consensus on this issue is currently lacking with some countries permitting research while others enforce a total ban. Society must decide where to draw the line between curing disease and enhancement.",
    "category": "Ethics"
  },
  {
    "id": "pass_13",
    "title": "The Great Fire of London",
    "text": "The Great Fire of London in 1666 was a calamity that reshaped the capital of England. Starting in a bakery on Pudding Lane the fire spread rapidly due to a combination of strong winds and the prevalence of timber framed buildings. The city was ill equipped to deal with such a blaze.\n\nBy the time the fire was extinguished a vast area of the medieval city had been destroyed including St Paul's Cathedral. Miraculously the recorded death toll was surprisingly low though some historians suggest that the deaths of the poor may have gone unrecorded. The aftermath of the fire provided an opportunity for urban renewal.\n\nSir Christopher Wren proposed grand designs for a modern city but legal complications regarding property rights meant that much of the old street plan was preserved. Nevertheless the new buildings were constructed of brick and stone to prevent a recurrence. The fire also led to the development of the insurance industry and improved sanitation.",
    "category": "History"
  },
  {
    "id": "pass_14",
    "title": "The Hydrological Cycle",
    "text": "The hydrological cycle describes the continuous movement of water on above and below the surface of the Earth. Solar energy drives the process by causing water to evaporate from oceans lakes and rivers transforming it into water vapour. Transpiration from plants also contributes to atmospheric moisture.\n\nAs the water vapour rises it cools and condenses to form clouds. Precipitation follows returning water to the surface as rain snow or hail. While much of this water flows back into the oceans via rivers some infiltrates the ground to replenish aquifers. This groundwater can remain stored for millennia before resurfacing.\n\nThe cycle is essential for regulating the planet's temperature and supporting life. However human activities are increasingly disrupting this balance. Deforestation reduces transpiration while urbanization increases surface runoff. Climate change is also intensifying the cycle causing more severe droughts in some regions. Understanding these dynamics is crucial.",
    "category": "Science"
  },
  {
    "id": "pass_15",
    "title": "Truth Telling in Oncology",
    "text": "In the past it was common practice for physicians to withhold a cancer diagnosis from a patient to spare them emotional distress. This paternalistic approach has largely been replaced by an emphasis on openness. Modern medical ethics dictates that patients have a right to know the truth.\n\nHowever communicating bad news is never a simple task. Doctors must gauge how much information a patient wants to know and deliver it in a sensitive manner. Some patients may explicitly request not to be told the details of their prognosis and in such cases the physician should respect this wish.\n\nCultural differences also play a role as in some societies the family is the primary unit of decision making rather than the individual. There are rare situations where therapeutic privilege might be invoked if the doctor believes that the information would cause serious psychological harm. Honesty is usually the best policy but it must be tempered with compassion.",
    "category": "Ethics"
  },
  {
    "id": "pass_16",
    "title": "The Discovery of Penicillin",
    "text": "The discovery of penicillin is often cited as one of the most fortunate accidents in scientific history. In 1928 Alexander Fleming returned to his laboratory to find that a petri dish of Staphylococcus bacteria had been contaminated by a mould. He observed that the bacteria surrounding the mould had been destroyed.\n\nFleming identified the mould as Penicillium notatum and realized it produced a substance capable of killing bacteria. However he was unable to isolate the active ingredient in sufficient quantities to be useful. It was not until more than a decade later that Howard Florey and Ernst Chain succeeded in mass producing the drug.\n\nTheir work was driven by the urgent need for antibiotics during the Second World War. Penicillin revolutionized medicine by turning fatal infections into treatable conditions. Despite this success Fleming warned early on that bacteria could develop resistance to the drug if it was misused. His prediction has unfortunately proven to be accurate.",
    "category": "History"
  },
  {
    "id": "pass_17",
    "title": "Black Holes and Event Horizons",
    "text": "A black hole is a region of spacetime where gravity is so strong that nothing including light or other electromagnetic waves has enough energy to escape it. The boundary of no return is called the event horizon. According to general relativity a black hole forms when a massive star collapses.\n\nWhile the black hole itself is invisible its presence can be inferred by its interaction with other matter. Matter falling into a black hole forms an accretion disk which heats up and emits powerful X rays. Supermassive black holes are thought to exist at the center of almost every large galaxy including the Milky Way.\n\nThe physics inside a black hole remains one of the great mysteries of science as the laws of physics as we know them appear to break down at the singularity. Stephen Hawking proposed that black holes emit radiation and can eventually evaporate over vast timescales. This theoretical prediction suggests that black holes are not entirely black.",
    "category": "Science"
  },
  {
    "id": "pass_18",
    "title": "Animal Testing in Research",
    "text": "The use of animals in biomedical research is a subject of polarized ethical debate. Proponents argue that animal models are essential for understanding complex biological processes and for testing the safety of new drugs. They point out that almost every major medical breakthrough has depended on animal research.\n\nWithout it the development of vaccines and surgical techniques would be severely hindered. Opponents however contend that animals are sentient beings with an intrinsic right to life and that subjecting them to pain is morally indefensible. They also argue that animal models are often poor predictors of human reactions.\n\nThe principle of the Three Rs Replacement Reduction and Refinement guides ethical oversight. Researchers must always seek to replace animals with non animal alternatives and refine procedures to minimize suffering. While strict regulations are in place to ensure welfare the fundamental ethical conflict remains. Society continues to grapple with the trade off.",
    "category": "Ethics"
  },
  {
    "id": "pass_19",
    "title": "The Suffragette Movement",
    "text": "The campaign for women's suffrage in the United Kingdom was a protracted struggle that challenged the foundations of the patriarchal society. In the early twentieth century the movement split into two main camps the suffragists who advocated for peaceful change and the suffragettes who adopted militant tactics.\n\nLed by figures such as Emmeline Pankhurst the suffragettes believed that deeds not words were necessary to force the government to act. Their actions included arson window smashing and hunger strikes. The government responded with harsh measures including force feeding which drew public sympathy to the cause.\n\nThe outbreak of the First World War led to a suspension of militant activities as women joined the war effort. This contribution is often credited with shifting public opinion. In 1918 the Representation of the People Act granted the vote to women over thirty. It was not until 1928 that women achieved equal voting rights.",
    "category": "History"
  },
  {
    "id": "pass_20",
    "title": "Desertification Processes",
    "text": "Desertification is the degradation of land in arid semi arid and dry sub humid areas. It is primarily caused by human activities and climatic variations. This process does not necessarily mean the expansion of existing deserts but rather the decline in the biological productivity of the land.\n\nOvergrazing is a major contributing factor as livestock remove the vegetation cover that protects the soil from erosion. Deforestation for fuel also exposes the topsoil to wind and water. When the soil loses its nutrients it becomes unable to support plant life leading to a vicious cycle of degradation.\n\nClimate change exacerbates the problem by altering rainfall patterns and increasing evaporation rates. The consequences are severe including food insecurity poverty and mass migration. Combating desertification requires a multifaceted approach including reforestation and sustainable farming. If unchecked desertification poses a significant threat to global stability.",
    "category": "Science"
  },
  {
    "id": "pass_21",
    "title": "Mandatory Vaccination Ethics",
    "text": "Public health policies regarding vaccination often conflict with individual liberties. Mandatory vaccination programs are designed to achieve herd immunity which protects those who cannot be vaccinated for medical reasons. From a utilitarian perspective the infringement on autonomy is justified by the reduction in disease.\n\nHistory has shown that mandates can be effective in eradicating diseases such as smallpox. However libertarians argue that the state should never have the power to force a medical intervention upon a competent adult. They assert that bodily integrity is a fundamental human right. There is also the concern that coercion can backfire.\n\nMost democratic societies attempt to balance these interests by using mandates only in specific high risk settings such as healthcare. Exemptions are usually available for medical or religious reasons though the strictness varies. The debate intensifies during pandemics when the public health risk is acute. The legitimacy depends on proportionality.",
    "category": "Ethics"
  },
  {
    "id": "pass_22",
    "title": "The Mayan Civilisation",
    "text": "The Mayan civilisation was one of the most dominant indigenous societies of Mesoamerica known for its sophisticated writing system and astronomical systems. Unlike the Aztec or Inca empires the Maya never formed a single unified state but were organized into a network of independent city states.\n\nThese cities were often at war with one another competing for resources and dominance. The Classic Period saw the construction of monumental pyramids and the flourishing of trade. However around the ninth century the central Mayan region suffered a major political collapse. Cities were abandoned and the population plummeted.\n\nThe reasons for this collapse include overpopulation environmental degradation and prolonged drought. It is likely that a combination of these factors led to the disintegration of the society. Despite this collapse the Mayan people did not disappear. Today millions of Maya continue to live in Mexico preserving their languages and traditions.",
    "category": "History"
  },
  {
    "id": "pass_23",
    "title": "Photosynthesis and Energy",
    "text": "Photosynthesis is the fundamental biological process by which green plants algae and some bacteria convert light energy into chemical energy. This energy is stored in the bonds of glucose molecules which can later be used to fuel the organism's activities. The process takes place primarily in the chloroplasts.\n\nChlorophyll absorbs light energy from the sun and uses it to drive a reaction between carbon dioxide and water. Oxygen is released as a byproduct which is essential for the survival of aerobic life forms. The rate of photosynthesis is influenced by several limiting factors including light intensity and temperature.\n\nWhile photosynthesis is crucial for the plant it also serves as the foundation of the global food web. Herbivores rely directly on plants for energy while carnivores rely on them indirectly. Furthermore photosynthesis plays a critical role in the carbon cycle by removing carbon dioxide from the atmosphere. Without it the Earth would be uninhabitable.",
    "category": "Science"
  },
  {
    "id": "pass_24",
    "title": "Assisted Dying Debates",
    "text": "The debate over assisted dying centers on the conflict between the sanctity of life and the right to self determination. Proponents argue that competent adults who are suffering from incurable illnesses should have the right to choose the timing of their death. They maintain that denying this option prolongs unnecessary suffering.\n\nOpponents however raise concerns about the potential for abuse. They fear that vulnerable individuals such as the elderly might feel pressured into ending their lives to avoid being a burden on their families. There is also the argument that the role of the physician is to heal and preserve life at all costs.\n\nReligious groups often oppose the practice on the grounds that life is a gift that should not be discarded. Jurisdictions that have legalized assisted dying usually implement strict safeguards to protect the vulnerable from coercion. The issue remains one of the most divisive in contemporary bioethics as society balances compassion and protection.",
    "category": "Ethics"
  },
  {
    "id": "pass_25",
    "title": "The Apollo 11 Mission",
    "text": "The Apollo 11 mission in 1969 marked the first time humans set foot on the Moon fulfilling President Kennedy's goal of landing a man on the Moon and returning him safely to the Earth. The mission was the culmination of the Space Race between the United States and the Soviet Union.\n\nThe technological challenges were immense requiring the development of new materials and propulsion systems. Neil Armstrong and Buzz Aldrin spent just over twenty one hours on the lunar surface collecting samples while Michael Collins orbited above. The broadcast of the landing was watched by an estimated six hundred million people.\n\nWhile the mission was a triumph of engineering it also sparked a debate about the cost of space exploration. Critics argued that the billions spent could have been better used to address social problems on Earth. Nevertheless the legacy of Apollo 11 inspires scientists to this day demonstrating what can be achieved through collective effort.",
    "category": "History"
  },
    {
      "id": "pass_26",
      "title": "Consent in Paediatrics",
      "text": "Obtaining valid consent for medical treatment in paediatric cases is a nuanced legal and ethical challenge. In the United Kingdom the concept of Gillick competence allows children under sixteen to consent to their own treatment if they demonstrate sufficient maturity and intelligence to understand the implications. However this autonomy is rarely absolute.\n\nIf a Gillick competent child refuses life saving treatment the courts or parents can often override this decision acting in the child's best interests. This creates a tension between the developing autonomy of the minor and the protective duty of the state. Clinicians must always navigate these situations with extreme sensitivity.\n\nWhile a refusal might be legally overruled it is generally considered unethical to force treatment upon a resisting child without first attempting to secure their cooperation. Soft paternalism is frequently employed where doctors and parents gently persuade the child to accept the necessary care. The law prioritises the preservation of life above the autonomy of a minor.",
      "category": "Ethics"
    },
    {
      "id": "pass_27",
      "title": "The Fall of the Western Roman Empire",
      "text": "The collapse of the Western Roman Empire in 476 AD is often viewed as the definitive end of the ancient world and the beginning of the Middle Ages. Historians have debated the causes of this decline for centuries proposing theories that range from moral decay to economic stagnation. Edward Gibbon famously argued that the adoption of Christianity weakened the martial spirit of the empire.\n\nHowever modern scholarship tends to emphasise a combination of external pressures and internal structural failures. Barbarian invasions were undoubtedly a major factor. The migration of Germanic tribes such as the Visigoths and Vandals overwhelmed the Roman frontiers which were already poorly defended due to a lack of manpower and funds.\n\nSimultaneously the Roman economy was suffering from severe inflation and an overreliance on slave labour which stifled technological innovation. Political instability also played a crucial role as frequent civil wars eroded the central authority. It is likely that no single cause was responsible but rather a perfect storm of military economic and political crises.",
      "category": "History"
    },
    {
      "id": "pass_28",
      "title": "Ocean Acidification",
      "text": "Ocean acidification is a direct consequence of rising carbon dioxide levels in the atmosphere. The ocean acts as a massive carbon sink absorbing approximately one quarter of the CO2 emitted by human activities. When CO2 dissolves in seawater it forms carbonic acid which lowers the pH of the water making it more acidic.\n\nThis chemical change has profound implications for marine ecosystems particularly for organisms that rely on calcium carbonate to build their shells. Coral reefs are among the most vulnerable habitats. As acidity increases the saturation state of carbonate ions decreases making it difficult for corals to calcify and maintain their structures.\n\nThis affects not only the corals themselves but also the myriad species that depend on reefs for shelter and food. Planktonic species which form the base of the marine food web are also at risk. While some species might adapt to the changing chemistry the rate of acidification is currently faster than any event in the last 300 million years.",
      "category": "Science"
    },
    {
      "id": "pass_29",
      "title": "Opt Out Organ Donation",
      "text": "The shortage of viable organs for transplantation is a global health crisis leading many nations to reconsider their consent models. The traditional opt in system relies on individuals explicitly registering their wish to donate. However this often results in a low number of registered donors despite high public support.\n\nConsequently many countries including parts of the UK have shifted to a deemed consent or opt out system where every adult is presumed to be a donor unless they have recorded a decision to the contrary. Proponents argue that this soft paternalistic approach respects the likely wishes of the deceased.\n\nCritics however contend that deemed consent undermines the fundamental principle of bodily autonomy. They argue that the state should never presume ownership of a person's body even after death. Furthermore there are concerns that families might feel pressured. The success of such systems depends heavily on public trust and effective communication.",
      "category": "Ethics"
    },
    {
      "id": "pass_30",
      "title": "The Meiji Restoration",
      "text": "The Meiji Restoration of 1868 was a watershed moment in Japanese history marking the end of the feudal shogunate and the restoration of imperial rule. Before this event Japan had effectively isolated itself from the rest of the world for over two centuries under the sakoku policy. The arrival of Commodore Perry's black ships in 1853 exposed the technological disparity.\n\nUnder Emperor Meiji the government embarked on a rapid program of westernisation and industrialisation. The feudal class system was abolished and a conscript army was established replacing the samurai class. The slogan rich country strong army guided national policy as Japan sought to establish itself as a global power.\n\nRailways telegraph lines and factories were constructed at a breakneck pace. By the early twentieth century Japan had transformed from a secluded feudal society into a modern industrial empire capable of defeating a European power in the Russo Japanese War. This period demonstrates how swiftly a nation can reinvent itself.",
      "category": "History"
    },
    {
      "id": "pass_31",
      "title": "The Human Genome Project",
      "text": "The Human Genome Project was an international scientific research project with the goal of determining the base pairs that make up human DNA. Launched in 1990 and completed in 2003 it remains the world's largest collaborative biological project. The resulting map has revolutionised our understanding of genetics and disease.\n\nOne of the most significant outcomes is the field of pharmacogenomics which studies how genes affect a person's response to drugs. This knowledge allows for the development of personalised medicine where treatments can be tailored to an individual's genetic makeup. However the project also revealed that human biology is far more complex than initially thought.\n\nThe number of genes was found to be lower than expected suggesting that gene regulation and environmental factors play a much larger role. While the complete sequence is now available the function of many parts of the genome remains unknown. The project opened the door to a new era of biology but interpreting the data is far from over.",
      "category": "Science"
    },
    {
      "id": "pass_32",
      "title": "Euthanasia in Dementia",
      "text": "The question of whether euthanasia should be available to patients with advanced dementia is one of the most contentious issues in bioethics. Unlike patients with physical terminal illnesses those with dementia often lose capacity long before they reach the terminal phase. This raises the difficulty of relying on advance directives.\n\nA patient might sign a directive while competent stating they wish to die if they reach a certain stage of decline. However when that stage is reached the patient may appear content. Opponents argue that carrying out euthanasia in such cases violates the current interests of the patient.\n\nProponents conversely argue that the right to self determination extends to one's future self. They maintain that individuals should have the power to avoid a state of existence they deem undignified. Strict safeguards are essential but in countries where this is legal the debate between protecting life and respecting autonomy remains unresolved.",
      "category": "Ethics"
    },
    {
      "id": "pass_33",
      "title": "The French Revolution",
      "text": "The French Revolution which began in 1789 was a period of radical social and political upheaval that fundamentally changed the course of history. The monarchy was overthrown and the feudal system was dismantled in favour of Enlightenment principles. Discontent with the rigid class structure and severe economic crisis left many citizens starving.\n\nHowever the initial idealism soon descended into the Reign of Terror led by Robespierre. During this period thousands of perceived enemies of the revolution were executed by guillotine including King Louis XVI. The revolutionaries even introduced a new calendar and attempted to dechristianise the nation to fully rewrite society.\n\nWhile the chaos eventually led to the rise of Napoleon Bonaparte the revolution succeeded in establishing the principle of popular sovereignty. It demonstrated that the power of the state is derived from the people not from divine right. The legacy is evident in modern democratic institutions and human rights charters.",
      "category": "History"
    },
    {
      "id": "pass_34",
      "title": "Dark Matter and Energy",
      "text": "Cosmological observations suggest that the visible universe composes only a small fraction of the total energy density of the cosmos. Approximately eighty five percent of the matter in the universe is believed to be dark matter a hypothetical substance that does not interact with electromagnetic radiation. This means it is invisible to telescopes.\n\nIts existence is inferred solely from its gravitational effects on visible matter such as the rotation speeds of galaxies. Even more mysterious is dark energy which makes up about sixty eight percent of the total energy of the universe. Dark energy appears to be a repulsive force that is driving the accelerated expansion of the universe.\n\nThis discovery in the late 1990s overturned the previous assumption that the expansion of the universe was slowing down. The nature of dark energy remains one of the greatest unsolved problems in physics. Understanding these phenomena is essential for predicting the ultimate fate of the universe and its eventual heat death.",
      "category": "Science"
    },
    {
      "id": "pass_35",
      "title": "Allocating Scarce Organs",
      "text": "The allocation of scarce donor organs is a complex ethical exercise that requires balancing utility with equity. The utilitarian approach favours allocating organs to patients who will derive the greatest benefit. This often means prioritising younger healthier patients over those with comorbidities or a history of transplant rejection.\n\nAlternatively the egalitarian approach emphasises fairness and the equal value of all lives. Systems based on waiting time or a lottery are often proposed to ensure that every candidate has an equal chance. However strictly following these methods could result in organs being given to patients with a very low chance of survival.\n\nMost transplant systems use a hybrid model that incorporates factors like tissue matching urgency and waiting time. Alcoholics or smokers needing transplants present a further dilemma regarding personal responsibility. The decision making process must always remain transparent to maintain public confidence in the system and encourage future donation.",
      "category": "Ethics"
    },
    {
      "id": "pass_36",
      "title": "The Cold War Geopolitics",
      "text": "The Cold War was a state of geopolitical tension between the Soviet Union and the United States and their respective allies. Lasting from the end of World War II until 1991 the conflict never escalated into a direct large scale war between the superpowers. Instead it was fought through proxy wars and espionage.\n\nThe doctrine of Mutually Assured Destruction or MAD likely prevented a direct military confrontation. Both sides possessed enough nuclear weaponry to annihilate the other meaning that any first strike would result in total destruction. Significant events such as the Cuban Missile Crisis brought the world to the brink of nuclear war.\n\nMeanwhile the Space Race served as a non violent arena for demonstrating technological superiority. The collapse of the Berlin Wall symbolised the end of the conflict leading to a brief period of unipolar American dominance. The Cold War shaped the modern map and its legacy persists in current diplomatic tensions and treaties.",
      "category": "History"
    },
    {
      "id": "pass_37",
      "title": "Quantum Entanglement",
      "text": "Quantum entanglement occurs when pairs of particles are generated in such a way that the state of each particle cannot be described independently. This means that measuring a property of one particle instantly determines the corresponding property of the other particle regardless of the distance. Einstein famously referred to this as spooky action at a distance.\n\nExperiments have repeatedly confirmed that entanglement is a real feature of the universe. When two entangled particles are separated a change in one is immediately reflected in the other. This suggests that information can be correlated faster than the speed of light although it does not allow for faster than light communication.\n\nThe implications are profound for the field of quantum computing as it allows for the creation of qubits that can perform calculations exponentially faster. Furthermore quantum cryptography utilises entanglement to create unbreakable channels. While the mechanism remains counterintuitive it is a cornerstone of modern quantum mechanics and physics.",
      "category": "Science"
    },
    {
      "id": "pass_38",
      "title": "Breaking Bad News",
      "text": "Communicating bad news is one of the most difficult tasks a physician must perform requiring a delicate balance of honesty and empathy. The SPIKES protocol is a widely taught framework designed to guide doctors through this process. It emphasises the importance of setting ensuring privacy and preventing interruptions during the consultation.\n\nBefore delivering the news the clinician must assess the patient's perception of their condition and their desire for information. When delivering the news it is crucial to use clear non technical language and to avoid euphemisms. The doctor must then allow space for the patient's emotional response which can range from silence to anger.\n\nValidating these emotions is essential for maintaining the therapeutic relationship and trust. Research shows that the way bad news is delivered can have a lasting impact on the patient's psychological adjustment. A poorly handled conversation can lead to resentment while a compassionate approach can empower the patient to cope with their diagnosis.",
      "category": "Ethics"
    },
    {
      "id": "pass_39",
      "title": "The Opium Wars",
      "text": "The Opium Wars were two wars waged between the Qing dynasty and Western powers in the mid nineteenth century. The First Opium War was triggered by China's attempt to suppress the opium trade which Britain had used to balance its trade deficit. British merchants were smuggling vast quantities of opium into China causing instability.\n\nThe resulting Treaty of Nanking was the first of the Unequal Treaties. It forced China to cede Hong Kong to Britain open five treaty ports and pay a massive indemnity. The Second Opium War resulted in further concessions including the legalisation of the opium trade and the opening of the interior to foreign travel.\n\nThese conflicts exposed the weakness of the Qing dynasty and the technological gap between China and the West. They marked the beginning of the Century of Humiliation a period of foreign imperialism and internal chaos that would eventually lead to the fall of the imperial system. The legacy continues to influence Chinese policy.",
      "category": "History"
    },
    {
      "id": "pass_40",
      "title": "Stem Cell Research",
      "text": "Stem cells are undifferentiated cells that have the unique ability to develop into many different cell types. There are two main types embryonic stem cells and adult stem cells. Embryonic stem cells are pluripotent meaning they can turn into any cell in the body which makes them valuable for regenerative medicine.\n\nHowever the use of embryonic stem cells is ethically controversial because obtaining them involves the destruction of a human embryo. Opponents argue that this constitutes the taking of a human life. In contrast adult stem cells are found in tissues like bone marrow and can be harvested without harming the donor.\n\nRecent advances in induced pluripotent stem cells offer a potential solution. These are adult cells that have been genetically reprogrammed to an embryonic stem cell like state. This technology could allow for the benefits of pluripotency without the ethical dilemmas. Nevertheless technical hurdles remain before these therapies can be widely used in clinics.",
      "category": "Science"
    },
    {
      "id": "pass_41",
      "title": "Genetic Privacy",
      "text": "The rapid advancement of genomic sequencing technologies has raised significant ethical concerns regarding genetic privacy. An individual's genetic data contains a wealth of sensitive information about their own health risks and their relatives. If this data were accessed by third parties it could lead to genetic discrimination by employers or insurers.\n\nIn many jurisdictions legislation exists to prevent such discrimination but gaps often remain. There is also the issue of forensic genealogy where law enforcement uses public DNA databases to solve crimes. While this has helped catch criminals it implies that genetic data can be used to implicate relatives without their explicit consent.\n\nFurthermore the anonymisation of genetic data is becoming increasingly difficult as studies show it is often possible to re identify individuals using cross referencing techniques. This challenges the traditional model of informed consent where participants are promised anonymity. Society must decide how to balance research benefits against the right to privacy.",
      "category": "Ethics"
    },
    {
      "id": "pass_42",
      "title": "The Black Death Impact",
      "text": "The Black Death which swept through Eurasia in the mid fourteenth century was the most fatal pandemic in recorded human history. Caused by the bacterium Yersinia pestis the plague is estimated to have killed between thirty to sixty percent of Europe's population. The immediate effect was a massive depopulation.\n\nHowever the long term economic consequences were profound. The sudden shortage of labour shifted the balance of power from the landowners to the peasantry. Wages rose significantly as lords had to compete for workers and the rigid structures of serfdom began to crumble. This led to increased social mobility.\n\nIn addition the plague spurred developments in medicine as physicians sought to understand the disease leading to the first primitive forms of quarantine. While the Black Death was a period of immense suffering it also acted as a catalyst for significant social transformation across the continent. It eventually contributed to the end of feudalism.",
      "category": "History"
    },
    {
      "id": "pass_43",
      "title": "The Placebo Effect",
      "text": "The placebo effect is a psychological phenomenon where a patient experiences an improvement in their condition after receiving a treatment that has no therapeutic value. This could be a sugar pill or a saline injection. The effect demonstrates the powerful connection between the mind and the body in healing.\n\nExpectations play a crucial role as the brain may release endorphins that actually reduce pain if the patient believes the treatment will work. This phenomenon presents a challenge for clinical trials which must prove that a drug performs significantly better than a placebo in a blinded trial. The strength of this effect is increasing.\n\nThere is also an ethical dimension to using placebos in clinical practice. Prescribing a placebo involves a level of deception which violates the principle of informed consent. However some studies suggest that open label placebos where the patient knows they are taking a dummy pill can still be effective. This suggests ritual has power.",
      "category": "Science"
    },
    {
      "id": "pass_44",
      "title": "Offshoring Clinical Trials",
      "text": "In recent decades pharmaceutical companies have increasingly offshored clinical trials to developing countries. This trend is driven by lower costs faster recruitment rates and a large pool of treatment naive patients. While this brings investment to low income regions it raises serious ethical questions about exploitation and safety.\n\nCritics argue that vulnerable populations may be coerced into participating due to a lack of other healthcare options. Furthermore there is the issue of post trial access. It is often the case that the drugs tested in these regions are too expensive for the local population to afford once they are approved.\n\nEthical guidelines state that research populations should benefit from the results of the study but enforcement is often weak in some areas. There are also concerns about the quality of ethical oversight in countries with less robust frameworks. Ensuring international research meets the same standards as domestic research is a major global challenge.",
      "category": "Ethics"
    },
    {
      "id": "pass_45",
      "title": "The Renaissance Era",
      "text": "The Renaissance was a fervent period of European cultural artistic and political rebirth following the Middle Ages. Generally taking place from the fourteenth to the seventeenth century the Renaissance promoted the rediscovery of classical philosophy. It began in Italy specifically in Florence where wealthy patrons funded artists.\n\nArtistically the Renaissance saw the development of linear perspective which allowed for more realistic representations of space. Masters such as Leonardo da Vinci produced works that remain icons of human creativity. In science the period marked a move towards observation and experimentation challenging the dogmatic reliance on ancient authorities.\n\nFigures like Galileo and Copernicus revolutionised our understanding of the cosmos while the invention of the printing press facilitated the spread of ideas. While the Renaissance was primarily an elite movement its influence eventually filtered down to all levels of society. It laid the intellectual foundations for the modern world we live in.",
      "category": "History"
    },
    {
      "id": "pass_46",
      "title": "Vaccine Development",
      "text": "Vaccination is one of the most effective public health interventions in history. The principle involves introducing a weakened or inactivated pathogen into the body to stimulate the immune system. This trains the system to recognise and fight the specific pathogen if it is encountered in the future and prevents infection.\n\nTraditional vaccines often use killed viruses but recent technological advances have led to the creation of mRNA vaccines. These vaccines instruct cells to produce a protein that triggers an immune response rather than introducing the virus itself. This method allows for faster development and manufacturing in response to new variants.\n\nDespite scientific success vaccine hesitancy remains a significant hurdle. Misinformation and lack of trust can undermine programs leading to outbreaks of preventable diseases like measles. Achieving herd immunity is essential to protect those who cannot be vaccinated. The future lies in developing vaccines that are easier to transport to remote populations.",
      "category": "Science"
    },
    {
      "id": "pass_47",
      "title": "Surrogate Decision Making",
      "text": "When a patient lacks the capacity to make their own medical decisions a surrogate decision maker must step in. In the absence of a formally appointed power of attorney this role usually falls to the next of kin. The ethical standard is typically the substituted judgment standard which requires following the patient's values.\n\nHowever applying this standard is often fraught with difficulty as surrogates may not have discussed specific medical scenarios with the patient. In cases where the patient's wishes are unknown the best interest standard is used instead. This focuses on an objective assessment of the burdens and benefits of the proposed medical treatment.\n\nConflicts frequently arise between medical teams and families when there is disagreement over what constitutes the patient's best interests. These disputes can lead to prolonged legal battles and moral distress for staff. This highlights the vital need for clear communication and advance care planning before capacity is lost by the patient.",
      "category": "Ethics"
    },
    {
      "id": "pass_48",
      "title": "The Partition of India",
      "text": "The Partition of India in 1947 was the division of British India into two independent dominion states India and Pakistan. This event marked the end of British colonial rule but it also triggered one of the largest and most violent migrations in history. The partition was based on religious lines creating significant displacement.\n\nThe announcement of the borders led to widespread communal violence as millions found themselves on the wrong side of the new boundaries. It is estimated that up to two million people died in the ensuing riots and massacres. Women were particularly vulnerable to violence while the process was rushed by the British authorities.\n\nThe partition also left the issue of Kashmir unresolved leading to decades of conflict and multiple wars between the two nations. The legacy of partition remains a source of deep trauma and political tension in South Asia today. It serves as a stark reminder of the catastrophic consequences of poorly managed and hasty decolonisation.",
      "category": "History"
    },
    {
      "id": "pass_49",
      "title": "Neuroplasticity",
      "text": "For a long time it was believed that the adult brain was a static organ unable to generate new neurons. However the discovery of neuroplasticity has revolutionised neuroscience. Neuroplasticity refers to the brain's ability to reorganize itself by forming new neural connections throughout life in response to learning or injury.\n\nThis adaptability is most profound in childhood but it persists into adulthood as learning a new skill physically changes the structure of the brain. Neuroplasticity also plays a crucial role in recovery from stroke. Through rehabilitation patients can retrain undamaged parts of the brain to take over functions previously managed by damaged areas.\n\nHowever plasticity can also be maladaptive in certain conditions like chronic tinnitus where the brain rewires itself in a way that causes suffering. Understanding these mechanisms is key to developing new therapies for neurological disorders and improving brain health. It shows that the brain is far more dynamic than previously assumed.",
      "category": "Science"
    },
    {
      "id": "pass_50",
      "title": "AI in Diagnostics",
      "text": "The integration of Artificial Intelligence into medical diagnostics promises to transform healthcare by improving accuracy. Machine learning algorithms can analyse medical images such as X rays with a speed and precision that matches human experts. AI can detect subtle patterns that might be missed leading to earlier detection of cancer.\n\nHowever the use of AI raises significant ethical and liability issues such as the black box problem where the algorithm's reasoning is opaque. If a doctor cannot understand why an AI made a diagnosis it is difficult to trust the result. Furthermore there is the question of accountability if an error occurs.\n\nThere is also the risk of algorithmic bias if the AI is trained on data that is not representative of the diverse patient population. Ensuring that AI tools are transparent and fair is essential before they can be fully adopted in clinical practice. The goal is to support clinicians rather than replace their vital judgment.",
      "category": "Ethics"
    },
      {
        "id": "pass_51",
        "title": "The Tragedy of the Commons",
        "text": "The tragedy of the commons is an economic theory that describes a situation where individual users acting independently according to their own self interest behave contrary to the common good by depleting a shared resource. This concept was popularized by Garrett Hardin who used the example of herders sharing a common pasture.\n\nIf each herder seeks to maximize their own gain they will add more cattle to the land eventually leading to overgrazing and the destruction of the resource for everyone. This principle applies to many modern environmental issues such as overfishing in international waters and atmospheric pollution. Since no single person owns the resource there is often little incentive to conserve it.\n\nTo prevent this tragedy societies must implement regulations such as quotas taxes or private property rights. However reaching an international agreement on these measures is difficult as nations often prioritize their own economic growth over global sustainability. The tragedy of the commons remains a fundamental challenge for environmental policy and collective action in the modern world.",
        "category": "Ethics"
      },
      {
        "id": "pass_52",
        "title": "The Magna Carta Legacy",
        "text": "The Magna Carta signed in 1215 by King John of England is one of the most famous documents in history. Originally intended as a peace treaty between the unpopular king and a group of rebel barons it sought to limit the monarch's power and protect the rights of the aristocracy from arbitrary rule.\n\nWhile the original document was quickly nullified by the Pope its principles survived and were reissued by subsequent kings. Most importantly it established the idea that the king was not above the law and that individuals had a right to due process. Clause thirty nine stated that no free man could be imprisoned except by the lawful judgment of his peers.\n\nOver the centuries the Magna Carta became a symbol of liberty and influenced the development of democratic systems around the world including the United States Constitution. Although only a few clauses remain in English law today its symbolic value as the foundation of modern constitutionalism is undeniable. It represents the first step towards the rule of law and individual rights.",
        "category": "History"
      },
      {
        "id": "pass_53",
        "title": "The Greenhouse Effect",
        "text": "The greenhouse effect is a natural process that warms the Earth's surface and makes the planet habitable. When solar radiation reaches the Earth some of it is reflected back into space while the rest is absorbed and re radiated as heat. Greenhouse gases like carbon dioxide and methane trap this heat in the atmosphere.\n\nWithout this natural insulation the average temperature of the Earth would be well below freezing. However human activities such as burning fossil fuels and deforestation have significantly increased the concentration of these gases. This enhanced greenhouse effect is leading to global warming and changes in the climate that threaten ecosystems and human societies.\n\nThe consequences include rising sea levels more frequent extreme weather events and the loss of biodiversity. Scientists agree that a rapid transition to renewable energy is necessary to mitigate these impacts. While the earth has experienced natural climate cycles in the past the current rate of warming is unprecedented in the geological record and is largely attributed to human influence.",
        "category": "Science"
      },
      {
        "id": "pass_54",
        "title": "The Ethics of Nudging",
        "text": "Nudging is a concept in behavioural science that involves designing the environment to influence people's choices without forbidding any options or significantly changing their economic incentives. For example placing healthy food at eye level in a cafeteria is a nudge while banning junk food is not. The goal is to improve decision making.\n\nProponents of nudging argue that it is a form of libertarian paternalism that helps people make better choices for their health and wealth while still respecting their freedom of choice. Governments have used nudges to increase organ donation rates and encourage retirement savings. These interventions are often cheap and highly effective at a population level.\n\nHowever critics argue that nudging can be manipulative and opaque as people are often unaware they are being influenced. They fear that the state could use these techniques to bypass rational debate and shape behaviour in ways that benefit the government rather than the individual. There is a fine line between helpful guidance and psychological manipulation that requires careful ethical oversight.",
        "category": "Ethics"
      },
      {
        "id": "pass_55",
        "title": "The Fall of the Aztec Empire",
        "text": "The fall of the Aztec Empire in 1521 was a turning point in history that marked the beginning of Spanish colonial rule in the Americas. Hernan Cortes led a small group of conquistadors who arrived in central Mexico and eventually captured the capital city of Tenochtitlan. While the Spanish had superior weaponry this was not the only factor.\n\nThe conquest was also made possible by the alliances Cortes formed with indigenous groups like the Tlaxcalans who were enemies of the Aztecs and sought to end their dominance. These allies provided essential manpower and logistical support. Furthermore internal political divisions within the Aztec leadership weakened their response to the invaders at a critical moment.\n\nPerhaps the most devastating factor was the introduction of smallpox which ravaged the indigenous population who had no immunity to the disease. The pandemic killed thousands including many leaders and soldiers making it impossible to defend the city. The collapse of the Aztec Empire led to the destruction of a unique culture and the rise of a new colonial society.",
        "category": "History"
      },
      {
        "id": "pass_56",
        "title": "The Theory of General Relativity",
        "text": "Albert Einstein's theory of general relativity published in 1915 completely transformed our understanding of gravity and the universe. Unlike Newton who viewed gravity as a force acting between masses Einstein proposed that gravity is a curvature of spacetime caused by the presence of mass and energy. Massive objects warp the fabric of space.\n\nThis warping dictates how objects and light move through the universe. One of the key predictions of the theory was that light from distant stars would bend as it passed near the Sun which was confirmed during a solar eclipse in 1919. This discovery made Einstein a global celebrity and provided the first experimental evidence for his ideas.\n\nGeneral relativity also predicted the existence of black holes and the expansion of the universe. Today the theory is essential for the functioning of global positioning systems which must account for time dilation caused by Earth's gravity. While general relativity has passed every test so far it is currently incompatible with quantum mechanics. Reconciling these two theories remains a goal.",
        "category": "Science"
      },
      {
        "id": "pass_57",
        "title": "Universal Basic Income",
        "text": "Universal Basic Income or UBI is a proposed policy in which all citizens receive a regular unconditional sum of money from the government regardless of their income or employment status. The goal is to provide a financial safety net and reduce poverty in an era of increasing automation and economic instability. UBI is a radical departure from traditional welfare.\n\nProponents argue that UBI simplifies the welfare system by removing complex bureaucracy and eliminating the poverty trap where people lose benefits when they start working. It also empowers individuals to pursue education or creative work without the fear of destitution. Some studies suggest that UBI can improve mental health and community cohesion in pilot programs.\n\nCritics however worry that UBI is prohibitively expensive and could lead to a decrease in labour participation if people no longer feel the need to work. There are also concerns that it could lead to inflation or be used as an excuse to cut other essential social services like healthcare. The debate over UBI reflects fundamental questions about the role of the state in the modern economy.",
        "category": "Ethics"
      },
      {
        "id": "pass_58",
        "title": "The Crusades and Trade",
        "text": "The Crusades were a series of religious wars between Christians and Muslims started primarily to secure control of holy sites in the Middle East. While the military outcomes were often mixed and the human cost was immense the Crusades had a profound impact on European society by increasing contact with the Islamic world and the East.\n\nEuropean crusaders returned home with a taste for Eastern luxury goods such as silk spices and sugar which stimulated trade. This demand led to the growth of Italian city states like Venice and Genoa which became powerful maritime hubs. The expansion of trade helped to fund the Renaissance and led to the rise of a wealthy merchant class.\n\nFurthermore the Crusades facilitated the exchange of knowledge as Europeans rediscovered classical texts preserved by Muslim scholars. This intellectual transfer contributed to the development of science and philosophy in the West. While the Crusades are often remembered for their violence they also played a significant role in the economic and cultural integration of the Mediterranean region.",
        "category": "History"
      },
      {
        "id": "pass_59",
        "title": "Oceanic Current Systems",
        "text": "Ocean currents are the continuous predictable movements of seawater driven by forces such as wind the Coriolis effect and differences in water density. These currents play a vital role in regulating the Earth's climate by transporting heat from the equator toward the poles. The Gulf Stream for instance keeps Western Europe warmer than it would otherwise be.\n\nThere are two main types of currents surface currents and deep water currents. Surface currents are primarily driven by wind patterns while deep water currents are driven by thermohaline circulation which is a process caused by changes in temperature and salinity. Cold salty water sinks in the North Atlantic and flows toward the Southern Ocean.\n\nThis global conveyor belt takes about a thousand years to complete a single cycle. Climate change is a threat to this system as melting glaciers could add fresh water to the ocean and disrupt the sinking of salty water. If the currents were to slow down or stop it could lead to dramatic changes in weather patterns and sea levels worldwide.",
        "category": "Science"
      },
      {
        "id": "pass_60",
        "title": "The Right to be Forgotten",
        "text": "The right to be forgotten is a legal concept that allows individuals to request that outdated or irrelevant personal information be removed from internet search results. This right was formally recognized by the European Court of Justice in 2014 as a way to protect individual privacy in the digital age. It addresses the permanence of online data.\n\nProponents argue that individuals should not be perpetually defined by their past mistakes or by information that is no longer accurate. They maintain that the right to privacy includes the right to move on from one's past without the shadow of a digital record. This is especially important for young people whose early actions are often recorded online.\n\nHowever critics worry that the right to be forgotten can lead to a form of private censorship and the rewriting of history. They argue that it conflicts with the public's right to access information and the freedom of the press. Deciding what information is in the public interest versus what is purely private is a difficult balancing act for search engines.",
        "category": "Ethics"
      },
      {
        "id": "pass_61",
        "title": "The Vikings in Britain",
        "text": "The Viking Age in Britain began in the late eighth century with raids on coastal monasteries like Lindisfarne. These seafaring warriors from Scandinavia were initially motivated by the search for wealth but they eventually sought land for settlement. The arrival of the Great Heathen Army in the ninth century led to the conquest of large parts of northern England.\n\nThe region under Viking control became known as the Danelaw where Scandinavian laws and customs prevailed. The Vikings founded cities like York which became a major centre for international trade connecting Britain with the Baltic and beyond. Despite their reputation as raiders many Vikings were farmers and merchants who integrated into the local population over time.\n\nTheir influence is still visible today in the English language and in many place names across the north of England. The Viking presence also forced the disparate Anglo Saxon kingdoms to unite under a single monarch to defend their territory. This process eventually led to the formation of a unified Kingdom of England under the house of Wessex.",
        "category": "History"
      },
      {
        "id": "pass_62",
        "title": "The Science of Sleep",
        "text": "Sleep is a vital physiological process that is essential for physical health and cognitive function. During sleep the body performs critical maintenance tasks such as tissue repair and the clearance of metabolic waste from the brain. The glymphatic system which is most active during deep sleep helps to remove toxins that accumulate during the day.\n\nSleep is divided into several stages including light sleep deep sleep and REM sleep. REM sleep is characterized by rapid eye movements and vivid dreaming and it is thought to play a key role in emotional regulation and memory consolidation. Chronic sleep deprivation is linked to a range of health problems including obesity diabetes and cardiovascular disease.\n\nModern lifestyles which often include long work hours and the use of blue light emitting devices have led to a widespread decline in sleep quality. Researchers emphasize that most adults need between seven and nine hours of sleep per night for optimal health. Understanding the biological clock and maintaining good sleep hygiene are essential for well being in an increasingly connected world.",
        "category": "Science"
      },
      {
        "id": "pass_63",
        "title": "The Ethics of Gene Drive",
        "text": "Gene drive is a powerful genetic engineering technology that can force a specific trait through a population of organisms. It works by ensuring that the trait is passed on to nearly all offspring bypassing the usual rules of inheritance. This technology could be used to eradicate diseases like malaria by making mosquitoes unable to carry the parasite.\n\nWhile the potential benefits for public health are immense the use of gene drive raises significant ecological and ethical concerns. Critics worry that releasing such a powerful tool into the wild could have unintended consequences for the ecosystem such as the extinction of a species that other animals depend on for food. The long term effects are difficult to predict.\n\nThere is also the question of governance as a gene drive released in one country would likely spread across international borders without the consent of neighbouring nations. This challenges the traditional framework for environmental regulation. Ethical oversight is essential to ensure that the risks are carefully weighed against the benefits before any field trials are conducted.",
        "category": "Ethics"
      },
      {
        "id": "pass_64",
        "title": "The Glorious Revolution",
        "text": "The Glorious Revolution of 1688 was a turning point in English history that saw the overthrow of King James II and the ascension of William of Orange and Mary II. The revolution was largely bloodless in England and was driven by fears of James II's pro Catholic policies and his attempts to rule without Parliament. It was a victory for constitutionalism.\n\nIn exchange for the throne William and Mary accepted the Bill of Rights in 1689 which limited the powers of the monarchy and guaranteed certain rights for Parliament and the people. It established that the king could not raise taxes or maintain an army without parliamentary consent. This shift from an absolute to a constitutional monarchy was fundamental.\n\nThe revolution also led to the Toleration Act which granted freedom of worship to most Protestant groups but not to Catholics. While the revolution was less peaceful in Ireland and Scotland it secured the dominance of the Protestant interest in Britain for generations. It laid the groundwork for the modern British political system and the concept of parliamentary sovereignty.",
        "category": "History"
      },
      {
        "id": "pass_65",
        "title": "Carbon Capture Technology",
        "text": "Carbon capture and storage or CCS is a suite of technologies designed to capture carbon dioxide emissions from industrial sources like power plants before they reach the atmosphere. The captured CO2 is then compressed and transported to be stored deep underground in geological formations such as depleted oil fields. This is a key tool for mitigating climate change.\n\nProponents of CCS argue that it is essential for meeting global climate targets as it allows for the continued use of fossil fuels in sectors where transition to renewables is difficult. It can also be combined with biomass energy to achieve negative emissions. Several large scale CCS projects are already in operation around the world showing that the technology is viable.\n\nHowever critics worry that the high cost of CCS makes it less attractive than simply investing in renewable energy like wind and solar. There are also concerns about the long term safety of underground storage and the potential for leaks. Despite these challenges many experts believe that CCS must be part of a diverse strategy to reduce global carbon emissions and reach net zero goals.",
        "category": "Science"
      },
      {
        "id": "pass_66",
        "title": "Mandatory Health Insurance",
        "text": "The question of whether the state should mandate that all citizens have health insurance is a central theme in healthcare policy. Proponents argue that an individual mandate is necessary to ensure the stability of the insurance market by preventing a situation where only sick people buy insurance which would cause premiums to skyrocket. This is known as adverse selection.\n\nBy requiring everyone to participate the risk is spread across the entire population making insurance more affordable for everyone. In systems like the one in the United States the mandate was seen as a key part of achieving universal coverage. It also reduces the burden on taxpayers who often end up paying for the care of the uninsured through emergency services.\n\nCritics however view an individual mandate as an overreach of government power and an infringement on personal liberty. They argue that people should have the right to choose whether to purchase a private product. Some also maintain that mandates can be a financial burden on low income individuals if the subsidies provided are insufficient. The debate reflects deeper philosophical divides over the role of government.",
        "category": "Ethics"
      },
      {
        "id": "pass_67",
        "title": "The Decline of the Mughal Empire",
        "text": "The Mughal Empire which ruled much of South Asia for over two centuries began to decline in the early eighteenth century. Under emperors like Akbar the empire was known for its cultural achievements and religious tolerance. However the later reign of Aurangzeb was marked by constant warfare and religious policies that alienated many of his subjects.\n\nThe high cost of these wars drained the imperial treasury and weakened the central authority. Following Aurangzeb's death the empire was plagued by weak successors and internal power struggles among the nobility. Regional governors began to assert their independence leading to the fragmentation of the empire into smaller competing states. This lack of unity made the region vulnerable to outside forces.\n\nThis period of instability coincided with the rise of the British East India Company which used its military and economic power to gradually gain control over Indian territory. The Battle of Plassey in 1757 was a decisive moment that established British influence in Bengal. By the mid nineteenth century the Mughal emperor was merely a figurehead as Britain became the dominant power in the subcontinent.",
        "category": "History"
      },
      {
        "id": "pass_68",
        "title": "The Role of Epigenetics",
        "text": "Epigenetics is the study of changes in organisms caused by modification of gene expression rather than alteration of the genetic code itself. While our DNA sequence is fixed throughout our lives the way our genes are turned on or off can be influenced by our environment and lifestyle. This means that factors like diet stress and pollution can have a lasting impact on our health.\n\nOne common epigenetic mechanism is DNA methylation where a chemical group is added to the DNA molecule to silence a specific gene. These changes can be passed down to future generations which challenges the traditional view of inheritance. For example studies have shown that the descendants of people who experienced famine may have an increased risk of obesity and diabetes due to epigenetic changes.\n\nThis field of research has profound implications for medicine as it suggests that many diseases are not just the result of bad luck or bad genes but are influenced by our interactions with the world. It also offers hope for new therapies that can reverse harmful epigenetic marks. Understanding the link between our environment and our genes is a key goal of modern biological research.",
        "category": "Science"
      },
      {
        "id": "pass_69",
        "title": "The Ethics of Facial Recognition",
        "text": "The widespread deployment of facial recognition technology by governments and private companies has raised significant concerns about privacy and civil liberties. Proponents argue that the technology is a valuable tool for public safety as it can help find missing persons and identify criminals in real time. It can also make everyday tasks like travel and payments more convenient.\n\nHowever critics worry that facial recognition enables mass surveillance on an unprecedented scale. They argue that it undermines the right to be anonymous in public spaces and can be used to track and intimidate protesters or minority groups. There is also the issue of accuracy as many systems have been found to have higher error rates when identifying women and people of colour.\n\nThis bias can lead to wrongful arrests and further entrench systemic inequality. Several cities and countries have already moved to ban or strictly regulate the use of facial recognition by law enforcement. The debate highlights the need for clear legal frameworks to ensure that the use of this technology is transparent and subject to public oversight while protecting individual rights.",
        "category": "Ethics"
      },
      {
        "id": "pass_70",
        "title": "The Great Depression Causes",
        "text": "The Great Depression was a severe global economic downturn that began in 1929 and lasted throughout the 1930s. While the stock market crash in October 1929 is often seen as the starting point it was not the sole cause of the crisis. Economists point to a range of factors including bank failures overproduction in agriculture and industry and high levels of consumer debt.\n\nThe collapse of the banking system meant that millions of people lost their life savings while businesses were unable to access the credit they needed to operate. The Smoot Hawley Tariff Act which raised import taxes in an attempt to protect American industry backfired by triggering a global trade war and worsening the economic slump. The lack of government intervention in the early years allowed the crisis to deepen.\n\nUnder the New Deal President Franklin D Roosevelt introduced a series of programs and regulations intended to provide relief to the poor and reform the financial system. While these measures helped to stabilize the economy the Great Depression did not fully end until the massive government spending during World War II. The crisis fundamentally changed the way governments managed the economy and led to the creation of the modern welfare state.",
        "category": "History"
      },
      {
        "id": "pass_71",
        "title": "The Theory of Plate Tectonics",
        "text": "The theory of plate tectonics describes the large scale motion of the seven large plates and the movements of a larger number of smaller plates of the Earth's lithosphere. The Earth's outermost layer is broken into these plates which float on the semi fluid mantle below. This theory provides a unified explanation for many geological phenomena including earthquakes and volcanoes.\n\nPlate boundaries are where most of the Earth's geological activity occurs. At divergent boundaries plates move apart and new crust is formed while at convergent boundaries plates collide and one may be forced beneath the other in a process called subduction. This often leads to the formation of mountain ranges and deep ocean trenches. Transform boundaries occur where plates slide past each other.\n\nThe movement of these plates is driven by convection currents in the mantle and the force of gravity. While the theory was not widely accepted until the mid twentieth century it is now a cornerstone of modern geology. It explains how the continents have shifted their positions over millions of years and why certain regions are more prone to natural disasters than others. Understanding plate tectonics is essential for Earth science.",
        "category": "Science"
      },
      {
        "id": "pass_72",
        "title": "The Ethics of AI in Hiring",
        "text": "Many companies are increasingly using artificial intelligence to automate the hiring process from screening resumes to conducting video interviews. Proponents argue that AI can make hiring more efficient and objective by removing human biases and focusing on the most relevant skills and qualifications. It can process vast amounts of data to find the best candidate for a role.\n\nHowever there are significant concerns that AI can actually perpetuate and even amplify existing biases. If the historical data used to train the algorithm is biased the AI will likely replicate those biases in its decisions. For example if a company has historically hired more men for technical roles the AI might learn to favour male candidates. This can lead to unfair discrimination against protected groups.\n\nFurthermore the use of AI in interviews to analyse facial expressions or tone of voice is controversial as it lacks a clear scientific basis and can disadvantage people with disabilities or different cultural backgrounds. Ensuring that AI hiring tools are transparent fair and audited for bias is essential to protect the rights of job seekers. The goal is to ensure that technology promotes rather than hinders workplace diversity.",
        "category": "Ethics"
      },
      {
        "id": "pass_73",
        "title": "The Berlin Conference",
        "text": "The Berlin Conference of 1884 to 1885 was a meeting between European powers to organize the colonization and trade in Africa. At the time of the conference most of Africa was still under indigenous control but European nations were eager to claim territory for its resources and strategic value. The conference established the principle of effective occupation.\n\nThis meant that a European power could only claim territory if it actually had an administrative presence on the ground. The conference led to a rapid scramble for Africa where borders were drawn by Europeans without any regard for the existing linguistic or ethnic divisions of the African people. These arbitrary borders often split communities or forced rival groups together into a single colony.\n\nBy 1900 almost the entire continent was under European rule with the exception of Ethiopia and Liberia. The colonial era brought significant infrastructure development but it was primarily designed to benefit the colonizers and often involved the exploitation of the local population. The legacy of the Berlin Conference continues to influence the political and social challenges faced by many African nations today.",
        "category": "History"
      },
      {
        "id": "pass_74",
        "title": "The Microbiome and Health",
        "text": "The human microbiome consists of trillions of microorganisms that live on and inside our bodies primarily in the gut. These bacteria viruses and fungi play a crucial role in our health by helping to digest food produce vitamins and regulate the immune system. A healthy and diverse microbiome is essential for maintaining our overall well being and protecting us from disease.\n\nResearch has shown that an imbalance in the microbiome known as dysbiosis is linked to a range of health conditions including inflammatory bowel disease obesity and even mental health disorders like anxiety and depression. This connection between the gut and the brain is known as the gut brain axis. Factors like diet antibiotics and stress can all disrupt the delicate balance of the microbiome.\n\nThe use of probiotics and prebiotics is a popular way to support a healthy gut but their effectiveness can vary between individuals. Fecal microbiota transplants have shown promise in treating certain severe infections by restoring a healthy balance of bacteria. As we continue to learn more about the microbiome it is becoming clear that personalized nutrition and medicine will be key to managing our health in the future.",
        "category": "Science"
      },
      {
        "id": "pass_75",
        "title": "The Ethics of Autonomous Weapons",
        "text": "The development of lethal autonomous weapons systems which can identify and engage targets without human intervention has sparked a global ethical debate. Proponents argue that these systems can be more precise than human soldiers and could reduce the risk of civilian casualties by removing the influence of fear and emotion from the battlefield. They might also reduce the risk to friendly forces.\n\nHowever critics worry that autonomous weapons lower the threshold for going to war and raise significant accountability issues. If a machine makes a mistake and kills innocent people it is unclear who should be held responsible for the action. There is also the fear that these weapons could be used for mass killings or be hacked by rogue actors which would lead to catastrophic consequences.\n\nMany human rights organizations and scientists have called for a total ban on the development and use of killer robots. They argue that the decision to take a human life should never be outsourced to an algorithm. International discussions on regulating these systems are ongoing but reaching a consensus is difficult as some nations see them as a vital military advantage in the future of warfare.",
        "category": "Ethics"
      },
      {
        "id": "pass_76",
        "title": "Informed Consent in Emergency Research",
        "text": "When a patient is unconscious after a traumatic injury and a promising experimental treatment might save their life researchers face a dilemma. Obtaining informed consent is normally a strict requirement for participation in clinical trials. In emergency settings however the window for intervention may be so short that seeking consent from a legally authorised representative is not feasible.\n\nRegulations in many countries therefore permit exception from informed consent or EFIC for a narrow class of emergency research. Such studies must address a life threatening condition for which no standard treatment exists and the intervention must hold out the prospect of direct benefit. The community must be consulted in advance and potential participants are often identified through public awareness campaigns. Even so critics argue that EFIC undermines the principle that no one should be enrolled in research without their consent. The balance between protecting autonomy and allowing research that could save lives remains contested.",
        "category": "Ethics"
      },
      {
        "id": "pass_77",
        "title": "The Treaty of Westphalia",
        "text": "The Peace of Westphalia signed in 1648 ended the Thirty Years War in Europe and is often cited as the origin of the modern system of sovereign states. Before Westphalia political authority was fragmented with overlapping claims by the Holy Roman Emperor the Pope and numerous princes. The treaties recognised the principle of territorial sovereignty meaning that each state had exclusive authority within its own borders and was not subject to interference by other states or by religious authorities.\n\nThis principle of non interference became a cornerstone of international law. The Peace also confirmed the right of rulers to determine the religion of their own territory a concept known as cuius regio eius religio which had been established at the Peace of Augsburg in 1555. Westphalia thus reinforced the idea that the state rather than the Church was the primary political unit. The legacy of Westphalia is still invoked today when states resist external pressure on grounds of national sovereignty.",
        "category": "History"
      },
      {
        "id": "pass_78",
        "title": "Mitochondria and Cellular Energy",
        "text": "Mitochondria are often called the powerhouses of the cell because they produce most of the adenosine triphosphate or ATP that cells use as an energy currency. This process occurs through cellular respiration in which nutrients are broken down and the energy released is used to drive ATP synthesis. The inner membrane of the mitochondrion is highly folded into structures called cristae which greatly increase the surface area available for the proteins that carry out the electron transport chain.\n\nMitochondria are unusual in that they contain their own small circular DNA and can replicate independently of the cell nucleus. This has led scientists to conclude that mitochondria evolved from free living bacteria that were engulfed by an ancestral cell in an endosymbiotic event. Mitochondrial DNA is inherited only from the mother in most species because sperm mitochondria are usually destroyed after fertilisation. Defects in mitochondrial function are linked to a range of diseases including some forms of diabetes and neurodegenerative conditions.",
        "category": "Science"
      },
      {
        "id": "pass_79",
        "title": "Conscientious Objection in Healthcare",
        "text": "Some healthcare professionals refuse to provide certain lawful procedures on grounds of conscience. Common examples include participation in abortion assisted dying or contraception. Defenders of conscientious objection argue that forcing professionals to act against their deeply held moral or religious beliefs violates their right to freedom of conscience. They maintain that patients can seek care elsewhere and that the profession benefits from a diversity of views.\n\nOpponents counter that when objection is widespread or when the professional is the only provider in a region patients may be effectively denied access to care. In the United Kingdom the General Medical Council states that doctors may decline to participate in a procedure to which they object but they must refer the patient to another provider without delay and must not express judgment about the patient. The law in many jurisdictions protects the right to object but the scope of that right and whether it should extend to referral or to indirect involvement remains disputed.",
        "category": "Ethics"
      },
      {
        "id": "pass_80",
        "title": "The Scramble for Africa",
        "text": "In the last two decades of the nineteenth century European powers divided almost the entire African continent among themselves. The Berlin Conference of 1884 to 1885 had set the rules for claiming territory but the actual partition was driven by rivalry between Britain France Germany Belgium Portugal and Italy. No African rulers were invited to the conference. Economic motives were significant as European industry sought raw materials and new markets and strategic considerations such as controlling sea routes and military bases also played a role.\n\nThe borders imposed by the colonisers paid no attention to existing ethnic linguistic or political boundaries. This arbitrary division has been blamed for many of the conflicts and governance problems that have plagued post colonial Africa. Resistance to colonial rule was widespread and often brutally suppressed. The legacy of the scramble including the extraction of wealth and the imposition of European legal and administrative systems continues to shape the continent today.",
        "category": "History"
      },
      {
        "id": "pass_81",
        "title": "CRISPR and Gene Editing",
        "text": "CRISPR Cas9 is a revolutionary technology that allows scientists to edit DNA with unprecedented precision. The system was adapted from a defence mechanism found in bacteria which use it to recognise and cut the DNA of invading viruses. Researchers can design a short guide RNA that directs the Cas9 enzyme to a specific sequence in the genome where it creates a cut. The cell then repairs the cut and in doing so can introduce a desired change or correction.\n\nThe potential applications include correcting hereditary diseases in human embryos and developing disease resistant crops. However editing the germline so that changes are passed to future generations is banned in many countries because of unresolved ethical and safety concerns. Off target effects in which the enzyme cuts DNA at unintended locations remain a risk. The inventor of the first practical CRISPR system Emmanuelle Charpentier was awarded the Nobel Prize in Chemistry in 2020. The technology is developing rapidly and its long term implications for medicine and agriculture are still unfolding.",
        "category": "Science"
      },
      {
        "id": "pass_82",
        "title": "Pandemic Triage and the Disability Critique",
        "text": "During the COVID-19 pandemic many hospitals adopted triage guidelines that took into account a patient's likelihood of survival and their life expectancy. Some protocols explicitly or implicitly deprioritised patients with significant disabilities or chronic conditions on the grounds that they had a lower chance of benefit or a shorter expected lifespan. Disability rights advocates and many ethicists condemned these policies as discriminatory. They argued that quality of life judgments should not be used to deny treatment and that the value of a life should not be measured by longevity or ability.\n\nThe Americans with Disabilities Act and similar laws require that people with disabilities not be denied care on the basis of disability. In practice however the line between a permissible assessment of clinical prognosis and an impermissible devaluation of disabled lives is difficult to draw. Some guidelines were revised in response to criticism. The debate has highlighted the tension between utilitarian triage and the principle that each person has equal moral worth regardless of their condition.",
        "category": "Ethics"
      },
      {
        "id": "pass_83",
        "title": "The Haitian Revolution",
        "text": "The Haitian Revolution which began in 1791 was the only successful slave revolt in history that led to the founding of an independent state. The colony of Saint Domingue was the wealthiest in the Caribbean producing half the world's sugar and coffee but that wealth rested on the brutal labour of hundreds of thousands of enslaved Africans. Inspired by the French Revolution and by rumours that the French king had already freed the slaves the enslaved population rose in rebellion.\n\nUnder leaders such as Toussaint Louverture and Jean Jacques Dessalines the rebels fought not only the French but also Spanish and British forces who sought to seize the colony. Napoleon Bonaparte sent a large expedition to reassert French control and to restore slavery but disease and fierce resistance defeated it. Haiti declared independence in 1804. The new republic was forced to pay a large indemnity to France in exchange for recognition which crippled its economy for decades. The revolution terrified slave owning societies elsewhere and reinforced the determination of many to maintain the institution.",
        "category": "History"
      },
      {
        "id": "pass_84",
        "title": "The Blood Brain Barrier",
        "text": "The blood brain barrier is a protective layer of cells that lines the capillaries in the brain and restricts the passage of substances from the bloodstream into the brain tissue. This barrier is formed by endothelial cells that are tightly joined together and supported by astrocytes. It allows essential nutrients and oxygen to pass through while blocking many potentially harmful molecules including some drugs and pathogens. The barrier is essential for maintaining the stable environment that neurons need to function.\n\nOne consequence of the blood brain barrier is that many drugs that are effective elsewhere in the body cannot reach the brain in sufficient concentrations. This has made the treatment of brain tumours and neurological infections particularly challenging. Researchers are developing methods to temporarily open the barrier or to design drugs that can cross it. The barrier can also break down in conditions such as stroke or traumatic brain injury leading to swelling and further damage. Understanding how to manipulate the blood brain barrier is a major goal in neuroscience and drug development.",
        "category": "Science"
      },
      {
        "id": "pass_85",
        "title": "Medical Tourism and Equity",
        "text": "Medical tourism occurs when patients travel to another country to receive medical care often to access treatments that are cheaper faster or not available at home. Popular destinations include India Thailand and Mexico for procedures such as joint replacement dental work and cosmetic surgery. Proponents argue that medical tourism increases choice and can reduce waiting times and costs for individuals. It may also bring revenue and expertise to developing countries.\n\nCritics point out that medical tourism can exacerbate inequality. In destination countries resources may be diverted from local populations to serve wealthy foreigners. Complications or follow up care may fall on the home country's health system when patients return. There are also concerns about the quality and safety of care and the difficulty of seeking redress across borders. Some procedures such as organ transplantation may involve exploitation of living donors in countries with weak regulation. The growth of medical tourism has prompted calls for international standards and for policies that ensure local health systems are not undermined.",
        "category": "Ethics"
      },
      {
        "id": "pass_86",
        "title": "The Spanish Inquisition",
        "text": "The Spanish Inquisition was established in 1478 by the Catholic Monarchs Ferdinand and Isabella with the stated aim of ensuring the orthodoxy of converts from Judaism and Islam. In practice it became an instrument of political and religious control. Conversos or Jewish converts were often suspected of secretly practising their former faith and the Inquisition used torture to extract confessions. The auto da fe was a public ceremony at which the condemned were handed over to the secular authorities for punishment often burning at the stake.\n\nThe Inquisition also targeted Muslims who had converted to Christianity and later anyone deemed to hold heretical views including Protestants and those accused of witchcraft. Its power extended to the Spanish colonies in the Americas. The Inquisition was not abolished until 1834. Historians debate the number of victims but it is clear that the Inquisition created a climate of fear and conformity. It also contributed to the expulsion of Jews from Spain in 1492 and of Muslims in the early seventeenth century which had lasting demographic and economic effects.",
        "category": "History"
      },
      {
        "id": "pass_87",
        "title": "Antibiotic Stewardship in Hospitals",
        "text": "Antibiotic stewardship refers to coordinated interventions designed to improve and measure the appropriate use of antibiotics. In hospitals stewardship programs typically include guidelines for when to prescribe antibiotics which agents to choose and how long to continue treatment. The goal is to maximise the benefit to the patient while minimising the development of resistance and the risk of side effects such as Clostridioides difficile infection. Stewardship is often led by infectious disease physicians and pharmacists who review prescriptions and advise clinicians.\n\nEvidence shows that stewardship programs reduce unnecessary antibiotic use and improve patient outcomes. Many countries now require or encourage hospitals to implement such programs. Resistance to stewardship can come from clinicians who fear that restricting antibiotics will harm patients or who are reluctant to change established practice. Successful programs depend on education feedback and support from hospital leadership. As resistance grows stewardship is increasingly seen as an ethical duty to preserve antibiotics for future generations.",
        "category": "Science"
      },
      {
        "id": "pass_88",
        "title": "Parental Refusal of Treatment for Children",
        "text": "Parents generally have the right to make medical decisions on behalf of their children. When parents refuse recommended treatment however doctors may face a conflict between respecting parental autonomy and protecting the child's welfare. In cases where the child's life is at risk or where refusal would lead to serious harm courts in many jurisdictions can override parental refusal and order treatment. The best interests of the child are the usual standard applied by the court.\n\nReligious or cultural beliefs often underlie parental refusal as in the case of families who decline blood transfusions for their children. Some argue that the state should be reluctant to intervene in family decisions and that diversity of values should be respected. Others maintain that the child's right to life and health trumps parental beliefs when the two conflict. The law typically allows parents wide discretion for decisions that do not threaten life or serious harm but draws the line at refusal of life saving treatment. Balancing these principles in practice remains difficult.",
        "category": "Ethics"
      },
      {
        "id": "pass_89",
        "title": "The Congress of Vienna",
        "text": "The Congress of Vienna met from 1814 to 1815 after the defeat of Napoleon to redraw the map of Europe and to establish a balance of power that would prevent another continent wide war. The major powers Austria Britain Prussia and Russia were represented by their leading statesmen including Metternich and Castlereagh. France under the restored Bourbon monarchy was also included in the negotiations. The Congress restored many of the monarchies that Napoleon had overthrown and sought to contain the forces of liberalism and nationalism that had been unleashed by the French Revolution.\n\nThe principle of legitimacy held that rightful rulers should be restored to their thrones. The Congress also created a system of alliances and periodic meetings between the great powers known as the Concert of Europe which aimed to maintain stability and to suppress revolutionary movements. The territorial settlement gave Russia Finland and part of Poland gave Prussia territory in the Rhineland and created a loose German Confederation. Critics argue that the Congress ignored the aspirations of ordinary people for freedom and self determination. Nevertheless the peace it established lasted with relatively minor conflicts until the Crimean War and the unification of Italy and Germany.",
        "category": "History"
      },
      {
        "id": "pass_90",
        "title": "Circadian Rhythms and Health",
        "text": "Circadian rhythms are roughly twenty four hour cycles in the behaviour and physiology of living organisms that are driven by an internal biological clock. In humans the master clock is located in the suprachiasmatic nucleus of the brain and is synchronised to the environment mainly by light. Disruption of circadian rhythms such as through shift work or jet lag is associated with an increased risk of metabolic disorders cardiovascular disease and some cancers. Sleep deprivation and irregular sleep schedules can desynchronise the clock from the external day night cycle.\n\nMelatonin a hormone produced by the pineal gland in darkness helps to signal that it is time to sleep. Exposure to artificial light especially blue light in the evening can suppress melatonin and delay sleep onset. Shift workers who must sleep during the day often struggle to get sufficient rest because their internal clock continues to promote wakefulness. Understanding circadian biology has led to chronotherapy in which the timing of drug administration is optimised according to the patient's rhythm. The Nobel Prize in Physiology or Medicine in 2017 was awarded for discoveries of the molecular mechanisms controlling the circadian clock.",
        "category": "Science"
      },
      {
        "id": "pass_91",
        "title": "Disclosure of Medical Error",
        "text": "When a healthcare provider makes a mistake that harms a patient the question arises whether and how to disclose the error to the patient and their family. Ethicists and professional bodies generally agree that patients have a right to know what happened and that disclosure is a duty of honesty and respect. Disclosure can also allow the patient to seek appropriate follow up care and can support learning and improvement within the organisation. Nevertheless many providers find disclosure difficult because they fear litigation loss of reputation or the patient's anger.\n\nSome institutions have adopted policies of full disclosure and apology and have found that this can reduce rather than increase the likelihood of lawsuits. Apology laws in some jurisdictions protect expressions of regret from being used as evidence of liability. Critics of mandatory disclosure worry that it may be applied in a way that scapegoats individual providers while deflecting attention from systemic failures. The way in which disclosure is made matters: it should be timely clear and accompanied by a plan to prevent recurrence. Training in how to communicate about errors is increasingly part of medical education.",
        "category": "Ethics"
      },
      {
        "id": "pass_92",
        "title": "The Atlantic Slave Trade",
        "text": "The transatlantic slave trade lasted from the sixteenth to the nineteenth century and forcibly transported an estimated twelve to fifteen million Africans to the Americas. The trade was driven by the demand for labour on plantations producing sugar tobacco cotton and other commodities. European ships carried manufactured goods to Africa where they were exchanged for enslaved people who were then transported across the Atlantic in conditions of extreme cruelty. The middle passage as this leg of the journey was known had a mortality rate that could exceed twenty percent.\n\nThe trade was abolished by Britain in 1807 and by the United States in 1808 though the illegal trade continued for decades. Slavery itself persisted in the Americas until the nineteenth century with Brazil being the last country to abolish it in 1888. The slave trade had profound demographic economic and social effects on Africa where some societies were destabilised and others grew powerful through participation in the trade. In the Americas the legacy of slavery includes persistent inequality and the cultural contributions of African descended peoples. The trade is now widely recognised as a crime against humanity.",
        "category": "History"
      },
      {
        "id": "pass_93",
        "title": "Antiviral Drugs and Viral Replication",
        "text": "Antiviral drugs differ from antibiotics in that they target viruses rather than bacteria. Because viruses replicate inside host cells using the host's machinery they are harder to treat without harming the host. Most antiviral drugs work by interfering with a specific step in the viral life cycle such as entry into the cell replication of the viral genome or release of new virus particles. For example some drugs block the enzyme that the virus uses to copy its genetic material.\n\nAntiviral resistance can develop when viruses mutate and no longer respond to a drug. This is a particular concern with influenza and HIV for which treatment may need to be adjusted over time. Combination therapy using several drugs with different targets can reduce the risk of resistance. Vaccines remain the most effective way to prevent many viral infections because they prime the immune system before exposure. The development of antiviral drugs has been slower than that of antibiotics in part because of the difficulty of finding targets that are unique to the virus.",
        "category": "Science"
      },
      {
        "id": "pass_94",
        "title": "Resource Allocation and Age",
        "text": "Whether age should be a factor in allocating scarce healthcare resources is deeply controversial. One view holds that younger patients should be prioritised because they have had less opportunity to experience life and because saving them yields more years of life gained. This is sometimes framed in terms of fair innings: everyone is entitled to a certain span of life and those who have not yet had it have a stronger claim. An opposing view holds that age is irrelevant and that each person's life has equal value regardless of how long they have already lived.\n\nIn the COVID-19 pandemic some triage guidelines took age into account explicitly or through proxies such as frailty. Critics argued that this discriminated against older people and people with disabilities. The debate touches on fundamental questions about the value of life and the role of the state in making such judgments. Many ethicists argue that age may be used only as a proxy for likelihood of benefit and that when two patients have an equal chance of benefit they should be treated equally regardless of age. The law in some jurisdictions prohibits discrimination on the basis of age in healthcare.",
        "category": "Ethics"
      },
      {
        "id": "pass_95",
        "title": "The Cuban Missile Crisis",
        "text": "In October 1962 American intelligence discovered that the Soviet Union was installing nuclear missiles in Cuba capable of striking the United States. President Kennedy demanded their removal and imposed a naval quarantine around Cuba to prevent further shipments. For thirteen days the world stood on the brink of nuclear war as Kennedy and Soviet leader Khrushchev exchanged messages and sought a way out. Kennedy's advisers debated whether to launch an air strike against the missile sites or to invade Cuba but such actions could have triggered a Soviet response and escalation.\n\nIn the end Khrushchev agreed to remove the missiles in exchange for a public American pledge not to invade Cuba and a secret undertaking to remove American missiles from Turkey. The crisis is often cited as the closest the world has come to nuclear war. It led to the establishment of a direct hotline between Washington and Moscow to reduce the risk of miscalculation in future crises. The crisis also strengthened Kennedy's reputation at home and may have encouraged Khrushchev's successors to avoid similar confrontations. Historians continue to debate whether the outcome was a triumph of diplomacy or a product of luck.",
        "category": "History"
      },
      {
        "id": "pass_96",
        "title": "Stem Cell Niches",
        "text": "Stem cells in adult tissues are found in specialised microenvironments known as niches. The niche provides signals that maintain the stem cells in an undifferentiated state and that regulate when they divide and when their daughter cells differentiate. In the bone marrow for example the haematopoietic stem cell niche includes blood vessels osteoblasts and other cells that produce growth factors and adhesion molecules. If stem cells leave the niche or if the niche is damaged they may lose their stem cell properties or be depleted.\n\nUnderstanding niches is important for regenerative medicine because growing stem cells in the laboratory requires mimicking the right signals. It is also relevant to cancer: some tumours are thought to be driven by cancer stem cells that reside in a niche like environment and that may be resistant to conventional therapy. Research on niches has revealed that the same stem cell can give rise to different outcomes depending on its location and the signals it receives. The niche concept has transformed our understanding of how tissues maintain themselves and repair damage throughout life.",
        "category": "Science"
      },
      {
        "id": "pass_97",
        "title": "Conflicts of Interest in Medicine",
        "text": "Physicians and researchers may have financial or other interests that could bias their judgment. Common examples include payments from pharmaceutical companies for speaking or consulting ownership of stock in a company whose drug they are studying or incentives to enrol patients in trials. Disclosure of conflicts is widely required by journals professional bodies and institutions. The aim is to allow others to assess whether the conflict might have influenced the person's conduct or conclusions.\n\nSome argue that disclosure is sufficient and that knowledgeable readers or patients can discount for bias. Others maintain that certain conflicts are so serious that the person should be barred from the activity altogether such as when a researcher with a financial stake in a drug conducts the trial. The Sunshine Act in the United States requires drug and device manufacturers to report payments to physicians and the data are made public. Studies have shown that even small gifts can influence prescribing behaviour. Managing conflicts of interest is now a standard part of research ethics and professional regulation.",
        "category": "Ethics"
      },
      {
        "id": "pass_98",
        "title": "The Marshall Plan",
        "text": "After the Second World War much of Europe was in ruins with economies shattered and populations displaced. In 1947 American Secretary of State George Marshall proposed a program of substantial economic aid to help European countries recover. The Marshall Plan or European Recovery Program provided over twelve billion dollars in grants and loans to sixteen nations between 1948 and 1952. The aid was offered to all European countries including the Soviet Union and its allies but the Soviet bloc refused to participate and pressured Eastern European countries to do the same.\n\nThe United States had several motives: humanitarian concern for suffering allies a desire to create stable trading partners and a fear that poverty and instability would fuel the spread of communism. The Plan required recipient countries to cooperate in allocating the aid and to move towards economic integration. It is widely credited with accelerating Western European recovery and with strengthening the political and economic bonds between the United States and Western Europe. The Plan also contributed to the division of Europe into American and Soviet spheres of influence. Historians debate how much of the recovery was due to the Plan itself and how much to other factors such as the currency reforms and the existing capacity of European industry.",
        "category": "History"
      },
      {
        "id": "pass_99",
        "title": "Prion Diseases",
        "text": "Prion diseases are a group of rare fatal neurodegenerative conditions that include Creutzfeldt Jakob disease in humans and bovine spongiform encephalopathy or mad cow disease in cattle. Unlike conventional infectious agents prions consist only of misfolded protein with no DNA or RNA. The misfolded prion protein can induce normally folded proteins of the same type to adopt the abnormal shape in a cascade that damages the brain. Prions are highly resistant to standard methods of sterilisation that would destroy bacteria or viruses.\n\nThe variant form of Creutzfeldt Jakob disease in humans is linked to exposure to BSE contaminated beef and caused a major public health crisis in the United Kingdom in the 1990s. There is no cure for prion diseases and diagnosis is often only confirmed after death. Research into prions has broadened our understanding of how proteins can transmit disease and has raised the possibility that similar mechanisms may be involved in more common conditions such as Alzheimer's disease. The prion concept has also been applied in other fields such as yeast biology where certain proteins can adopt self propagating conformations.",
        "category": "Science"
      },
      {
        "id": "pass_100",
        "title": "Capacity and Refusal of Treatment",
        "text": "A patient with capacity has the right to refuse medical treatment even if the refusal will result in death. This principle applies regardless of the rationality of the refusal: a patient may refuse life saving treatment for reasons that others find foolish or wrong. The right is grounded in respect for bodily integrity and self determination. When a patient lacks capacity because of illness injury or intellectual disability decisions must be made on their behalf according to their best interests or where known their previously expressed wishes.\n\nAssessing capacity can be difficult especially when the patient's decision seems unwise or when they have a mental illness. Capacity is decision specific: a patient may have capacity to refuse one treatment but not to manage their finances. In England and Wales the Mental Capacity Act sets out a framework for assessing capacity and for making decisions on behalf of those who lack it. The Act requires that the person be supported to make their own decision where possible and that any decision made for them must be in their best interests and must be the least restrictive option. Disputes about capacity or about what is in a patient's best interests may be referred to the Court of Protection.",
        "category": "Ethics"
      },
      {
        "id": "pass_101",
        "title": "The Rise of the Ottoman Empire",
        "text": "The Ottoman Empire emerged in Anatolia in the late thirteenth century and grew to become one of the largest and longest lasting empires in history. The Ottomans expanded through a combination of military conquest and strategic marriage alliances. The capture of Constantinople in 1453 ended the Byzantine Empire and made the Ottomans the dominant power in the eastern Mediterranean. The empire was organised around a system of devshirme in which Christian boys from the Balkans were conscripted converted to Islam and trained as soldiers or administrators. These janissaries became the backbone of the Ottoman army and bureaucracy.\n\nThe empire was relatively tolerant of religious diversity: Jews and Christians were allowed to practise their faith in return for payment of a special tax. The millet system gave religious communities a degree of self governance. At its height under Suleiman the Magnificent in the sixteenth century the empire controlled much of Southeast Europe the Middle East and North Africa. Decline set in from the seventeenth century as the empire faced military defeats economic competition from European powers and internal unrest. The empire lasted until the early twentieth century when it was dissolved after the First World War.",
        "category": "History"
      },
      {
        "id": "pass_102",
        "title": "The Immune System and Vaccination",
        "text": "Vaccination works by stimulating the immune system to produce a response against a pathogen without causing the full disease. The immune system has two main arms: the innate response which is rapid and non specific and the adaptive response which is slower but highly specific and which creates memory. Vaccines typically trigger the adaptive response by presenting the immune system with antigens from the pathogen. This leads to the production of antibodies and of memory cells that can mount a faster and stronger response if the pathogen is encountered again.\n\nLive attenuated vaccines use weakened forms of the pathogen that can still replicate to a limited extent and thus produce a strong immune response. Inactivated vaccines use killed pathogens or key components and are generally safer but may require booster doses. The success of vaccination depends on herd immunity: when a sufficient proportion of the population is immune the pathogen cannot spread easily and even those who are not vaccinated are protected. Vaccine hesitancy has led to resurgences of diseases such as measles in some communities. Understanding the immune basis of vaccination has been essential for designing new vaccines including those using mRNA technology.",
        "category": "Science"
      },
      {
        "id": "pass_103",
        "title": "Double Effect and End of Life Care",
        "text": "The doctrine of double effect is used in ethics to distinguish between intended and merely foreseen consequences of an action. According to this doctrine it may be permissible to perform an action that has a bad effect if the action itself is good or neutral the good effect is what is intended the bad effect is not a means to the good effect and there is a proportionate reason to allow the bad effect. In end of life care the classic application is to the use of opioids for pain relief: the doctor intends to relieve pain but foresees that increasing the dose may shorten the patient's life. If the intention is relief of suffering and not to cause death the action may be morally acceptable even though death is a foreseeable side effect.\n\nCritics of the doctrine argue that the distinction between intending and foreseeing is psychologically and morally unclear. They question whether it makes a real difference whether the doctor intends death or merely accepts it as a side effect. Supporters reply that intention is central to moral evaluation and that the doctrine protects doctors who provide appropriate palliative care from the charge of killing. The doctrine remains influential in Catholic moral theology and in secular medical ethics.",
        "category": "Ethics"
      },
      {
        "id": "pass_104",
        "title": "The Wars of the Roses",
        "text": "The Wars of the Roses were a series of civil wars fought in England between the houses of Lancaster and York from the 1450s to 1485. The conflict was triggered by the weak rule of Henry VI and by rival claims to the throne. The name derives from the badges associated with the two houses the red rose of Lancaster and the white rose of York though the symbolism was largely invented by later writers. The wars were characterised by shifting alliances and by the execution or death in battle of many nobles. The ordinary population was less affected than in some conflicts but the instability disrupted trade and agriculture.\n\nEdward IV of York eventually secured the throne but after his death in 1483 his brother Richard III took power in controversial circumstances. Richard's reign was short: in 1485 he was defeated and killed at the Battle of Bosworth by Henry Tudor who claimed the throne as Henry VII. Henry married Elizabeth of York thus uniting the two houses and founding the Tudor dynasty. The wars had weakened the nobility and strengthened the monarchy creating conditions for the strong centralised rule of the Tudors. Shakespeare's plays have shaped the popular memory of the period though their historical accuracy is debated.",
        "category": "History"
      },
      {
        "id": "pass_105",
        "title": "Telomeres and Ageing",
        "text": "Telomeres are repetitive DNA sequences and associated proteins that cap the ends of chromosomes and protect them from degradation and fusion. Each time a cell divides the telomeres shorten slightly because the machinery that replicates DNA cannot fully copy the end of the chromosome. When telomeres become too short the cell may stop dividing or undergo programmed cell death. This process is thought to contribute to ageing and to the limited lifespan of many cell types in the laboratory.\n\nThe enzyme telomerase can add length back to telomeres and is active in stem cells and in some cancer cells. In most normal adult cells telomerase is not expressed which is one reason that cells have a finite number of divisions. Cancer cells often reactivate telomerase which allows them to divide indefinitely. Research on telomeres has raised the possibility of interventions to slow ageing though such applications remain speculative. Telomere length has been proposed as a biomarker of biological age but the relationship between telomere length and health is complex and not fully understood. The discovery of how chromosomes are protected by telomeres and the role of telomerase was recognised with the Nobel Prize in Physiology or Medicine in 2009.",
        "category": "Science"
      }
    ];

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function estimateDifficulty(text: string, category: string): number {
  const words = countWords(text);
  let base =
    words < 220 ? 3 :
    words < 320 ? 5 :
    words < 420 ? 7 :
    8; // very long / dense passages

  if (category === "Ethics") base += 1;
  if (category === "Science") base += 0;
  if (category === "History") base += 0;

  if (base < 1) base = 1;
  if (base > 10) base = 10;
  return base;
}

export const PASSAGES: Passage[] = RAW_PASSAGES.map((p) => ({
  ...p,
  difficulty: estimateDifficulty(p.text, p.category),
}));

