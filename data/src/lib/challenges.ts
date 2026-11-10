/**
 * EVOAIQU — Challenge Catalog and Helper Module
 *
 * Safe, curated, fun challenge catalog.
 * No dangerous stunts, harassment, humiliation, or commercial pressure.
 * Side-effect-free pure module with full English & Tamil localization support.
 */

export type ChallengeCategory =
  | "dance"
  | "singing"
  | "acting"
  | "mimicry"
  | "tongue_twister"
  | "comedy";

export type ChallengeStatus =
  | "pending"
  | "accepted"
  | "submitted"
  | "retry_requested"
  | "completed"
  | "skipped"
  | "declined"
  | "cancelled";

export type ChallengeVisibility = "private" | "public";

export interface ChallengeItem {
  id: string;
  category: ChallengeCategory;
  title: string;
  description: string;
  instructions: string;
  emoji: string;
  durationSecs: number;
}

export interface CategoryInfo {
  category: ChallengeCategory;
  emoji: string;
  labelEn: string;
  labelTa: string;
  descEn: string;
  descTa: string;
}

export const CATEGORY_META: Record<ChallengeCategory, { name: string; emoji: string }> = {
  dance:          { name: "Dance",          emoji: "💃" },
  singing:        { name: "Singing",        emoji: "🎤" },
  acting:         { name: "Acting",         emoji: "🎭" },
  mimicry:        { name: "Mimicry",        emoji: "🦸" },
  tongue_twister: { name: "Tongue Twister", emoji: "👅" },
  comedy:         { name: "Comedy",         emoji: "😜" },
};

export const CHALLENGE_CATEGORIES: CategoryInfo[] = [
  {
    category: "dance",
    emoji: "💃",
    labelEn: "Dance",
    labelTa: "நடனம்",
    descEn: "Show off creative and fun dance moves.",
    descTa: "வேடிக்கையான நடன அசைவுகளைக் காட்டுங்கள்.",
  },
  {
    category: "singing",
    emoji: "🎤",
    labelEn: "Singing",
    labelTa: "பாடல்",
    descEn: "Vocal and musical performances with a twist.",
    descTa: "வித்தியாசமான பாணியில் ஒரு பாடல்.",
  },
  {
    category: "acting",
    emoji: "🎭",
    labelEn: "Acting",
    labelTa: "நடிப்பு",
    descEn: "Dramatic, theatrical, and cinematic scenes.",
    descTa: "நாடக மற்றும் சினிமா பாணி நடிப்பு காட்சிகள்.",
  },
  {
    category: "mimicry",
    emoji: "🦸",
    labelEn: "Mimicry",
    labelTa: "மிமிக்ரி",
    descEn: "Imitate animals, objects, and quirky personas.",
    descTa: "விலங்குகள், பொருட்கள் மற்றும் கதாபாத்திரங்களை போல நடித்தல்.",
  },
  {
    category: "tongue_twister",
    emoji: "👅",
    labelEn: "Tongue Twister",
    labelTa: "நா நெகிழ் பயிற்சி",
    descEn: "Fast-paced wordplay and verbal agility.",
    descTa: "தடுமாறாமல் வேகமாக உச்சரிக்கும் சவால்கள்.",
  },
  {
    category: "comedy",
    emoji: "😜",
    labelEn: "Comedy",
    labelTa: "நகைச்சுவை",
    descEn: "Laughs, funny poses, and hilarious performances.",
    descTa: "சிரிப்பு, வேடிக்கையான நிலைகள் மற்றும் சேட்டைகள்.",
  },
];

export const CHALLENGE_CATALOG: ChallengeItem[] = [
  // ── Dance ───────────────────────────────────────────────────────────────────
  {
    id: "dance_robot",
    category: "dance",
    title: "The Mechanical Robot",
    description: "Perform an ultra-stiff, mechanical robot dance.",
    instructions: "Move only one joint at a time with sharp robotic pauses for 20 seconds. Make bleep-bloop sound effects if you want!",
    emoji: "🤖",
    durationSecs: 20,
  },
  {
    id: "dance_slowmo",
    category: "dance",
    title: "Slow-Motion Victory Goal",
    description: "Celebrate an imaginary soccer goal in dramatic slow motion.",
    instructions: "Run across the room, drop to your knees, and raise your arms as if watching an Olympic stadium replay in 0.25x speed.",
    emoji: "⚽",
    durationSecs: 25,
  },
  {
    id: "dance_retro_disco",
    category: "dance",
    title: "80s Retro Disco Boogie",
    description: "Classic Saturday night fever finger-pointing disco moves.",
    instructions: "Alternate pointing your index finger up to the sky and down to the floor while stepping side-to-side with a groovy smile.",
    emoji: "🕺",
    durationSecs: 20,
  },

  // ── Singing ─────────────────────────────────────────────────────────────────
  {
    id: "sing_dramatic_opera",
    category: "singing",
    title: "Dramatic Opera Groceries",
    description: "Sing everyday sentences like an Italian opera tenor.",
    instructions: "Sing your favorite food order or what you had for breakfast using intense, vibrato-heavy, high-drama opera vocals.",
    emoji: "🎶",
    durationSecs: 30,
  },
  {
    id: "sing_whisper_rock",
    category: "singing",
    title: "Whispering Rock Star",
    description: "Sing a loud, high-energy rock song entirely in a stage whisper.",
    instructions: "Deliver the chorus of your favorite rock or pop anthem with intense rockstar hand gestures, but in a completely hushed whisper.",
    emoji: "🤫",
    durationSecs: 25,
  },
  {
    id: "sing_alien_lullaby",
    category: "singing",
    title: "Extraterrestrial Lullaby",
    description: "Sing a gentle lullaby using invented Martian syllables.",
    instructions: "Use silly sounds like 'zorp-glorp-beep' in a sweet, calming melody to put an imaginary baby alien to sleep.",
    emoji: "👽",
    durationSecs: 25,
  },

  // ── Acting ──────────────────────────────────────────────────────────────────
  {
    id: "act_soap_opera",
    category: "acting",
    title: "The Lost Sock Betrayal",
    description: "An over-the-top soap opera monologue about a missing sock.",
    instructions: "Gasp dramatically, turn to the camera with widening eyes, and deliver a tearful speech mourning the tragic betrayal of a single lost sock.",
    emoji: "🧦",
    durationSecs: 30,
  },
  {
    id: "act_extreme_weather",
    category: "acting",
    title: "Hurricane Weather Reporter",
    description: "Report live from the center of a ferocious pretend storm.",
    instructions: "Hold a pretend microphone, lean violently against imaginary 100mph gale winds, and shout breaking news updates over the howling storm.",
    emoji: "🌪️",
    durationSecs: 25,
  },
  {
    id: "act_silent_film",
    category: "acting",
    title: "1920s Melodrama Star",
    description: "A silent movie reaction to discovering an empty cookie jar.",
    instructions: "No words allowed! Use exaggerated facial expressions, hand-on-forehead fainting gestures, and silent weeping.",
    emoji: "🎬",
    durationSecs: 20,
  },

  // ── Mimicry ─────────────────────────────────────────────────────────────────
  {
    id: "mimic_t_rex",
    category: "mimicry",
    title: "Tiny-Armed T-Rex",
    description: "Perform an ordinary task with tiny dinosaur arms.",
    instructions: "Tuck your elbows tightly into your ribs, curl your fingers into two-claw hands, and try to inspect something on the table while making dinosaur grunts.",
    emoji: "🦖",
    durationSecs: 20,
  },
  {
    id: "mimic_espresso_machine",
    category: "mimicry",
    title: "Espresso Coffee Machine",
    description: "Recreate the sounds and actions of a barista coffee machine.",
    instructions: "Make the grinding sound (grrrr), the high-pressure steam hiss (pssshhhh), and the final happy dripping pour (drip... drip... ping!).",
    emoji: "☕",
    durationSecs: 20,
  },
  {
    id: "mimic_penguin_march",
    category: "mimicry",
    title: "Diplomatic Penguin March",
    description: "Waddle like an emperor penguin inspecting royal ice guards.",
    instructions: "Keep your knees glued together, flippers straight at your sides, and solemnly waddle around your chair with utmost royal dignity.",
    emoji: "🐧",
    durationSecs: 20,
  },

  // ── Tongue Twister ──────────────────────────────────────────────────────────
  {
    id: "tt_peter_piper",
    category: "tongue_twister",
    title: "Peter Piper Challenge",
    description: "Recite the classic pickled pepper twister three times without stopping.",
    instructions: "Say: 'Peter Piper picked a peck of pickled peppers' 3 times in a row, clearly and at high speed!",
    emoji: "🌶️",
    durationSecs: 20,
  },
  {
    id: "tt_woodchuck",
    category: "tongue_twister",
    title: "Woodchuck Wonder",
    description: "The timeless riddle of the wood-chucking woodchuck.",
    instructions: "Say: 'How much wood would a woodchuck chuck if a woodchuck could chuck wood?' 3 times consecutively without stumbling.",
    emoji: "🪵",
    durationSecs: 25,
  },
  {
    id: "tt_betty_botter",
    category: "tongue_twister",
    title: "Betty Botter's Butter",
    description: "Betty bought some bitter butter and tried to make it better.",
    instructions: "Say: 'Betty Botter bought some butter, but she said the butter's bitter!' 3 times in rapid succession.",
    emoji: "🧈",
    durationSecs: 25,
  },

  // ── Comedy / Performance ────────────────────────────────────────────────────
  {
    id: "comedy_statue_freeze",
    category: "comedy",
    title: "The Impatient Museum Statue",
    description: "Hold an absurd statuesque pose without laughing.",
    instructions: "Strike the silliest artistic pose you can imagine and freeze completely motionless for 15 seconds without laughing or blinking.",
    emoji: "🗿",
    durationSecs: 15,
  },
  {
    id: "comedy_giggle_loop",
    category: "comedy",
    title: "The Contagious Giggle",
    description: "Start from a tiny snicker and escalate into a belly laugh.",
    instructions: "Begin with a silent nose snort, build up to a squeaky giggle, and finish with a full, loud, hearty belly laugh for 15 seconds.",
    emoji: "😂",
    durationSecs: 15,
  },
  {
    id: "comedy_invisible_mirror",
    category: "comedy",
    title: "Living Reflection",
    description: "Pretend you are in front of a mirror fixing an imaginary outrageous hairstyle.",
    instructions: "Style an imaginary two-foot-tall beehive or mohawk haircut, checking your side profile with total serious dedication.",
    emoji: "🪞",
    durationSecs: 20,
  },
];

// ── Pure helpers ──────────────────────────────────────────────────────────────

export function getChallengeById(id: string): ChallengeItem | undefined {
  return CHALLENGE_CATALOG.find((c) => c.id === id);
}

export function getChallengesByCategory(category: ChallengeCategory): ChallengeItem[] {
  return CHALLENGE_CATALOG.filter((c) => c.category === category);
}

export function isValidCategory(val: string): val is ChallengeCategory {
  return [
    "dance",
    "singing",
    "acting",
    "mimicry",
    "tongue_twister",
    "comedy",
  ].includes(val);
}

export function isValidVisibility(val: string): val is ChallengeVisibility {
  return val === "private" || val === "public";
}

export function isValidStatus(val: string): val is ChallengeStatus {
  return [
    "pending",
    "accepted",
    "submitted",
    "retry_requested",
    "completed",
    "skipped",
    "declined",
    "cancelled",
  ].includes(val);
}
