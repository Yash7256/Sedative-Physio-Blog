/**
 * Utilities for turning raw anatomical mesh identifiers coming from GLB files
 * into readable, human-presentable labels — and for optionally enriching them
 * with metadata from an anatomy database.
 *
 * The raw identifier is ALWAYS preserved (see `AnatomyInfo.rawName`). Nothing
 * derived from the mesh name is ever overwritten by database content.
 */

export interface AnatomyInfo {
  /** The untouched identifier exactly as it appears in the GLB (e.g. "Biceps_brachii_L"). */
  rawName: string
  /** Human-readable label without the side qualifier (e.g. "Biceps Brachii"). */
  baseName: string
  /** Side qualifier derived from _L / _R / _left / _right suffixes, if any. */
  side: "Left" | "Right" | null
  /** Fully formatted label including side (e.g. "Biceps Brachii — Left"). */
  displayName: string
  /** Anatomical system, only set when derivable with confidence. */
  system: string | null
  /** Optional database metadata. Undefined until an anatomy source is connected. */
  description?: string
  function?: string
  additionalInfo?: string
}

const SIDE_PATTERNS: { regex: RegExp; side: "Left" | "Right" }[] = [
  { regex: /_l$/i, side: "Left" },
  { regex: /_r$/i, side: "Right" },
  { regex: /_left$/i, side: "Left" },
  { regex: /_right$/i, side: "Right" },
  { regex: /\s(l|r)$/i, side: "Left" },
]

const SYSTEM_KEYWORDS: { system: string; keywords: string[] }[] = [
  { system: "Muscular", keywords: ["biceps", "triceps", "deltoid", "gastrocnemius", "quadriceps", "hamstring", "sartorius", "gluteus", "pectorali", "latissimus", "trapezius", "sternocleido", "iliopsoas", "tibialis", "soleus", "rectus", "femoris", "adductor", "abductor", "masseter", "temporalis", "orbitcularis", "brachioradialis", "supinator", "pronator", "flexor", "extensor", "levator", "omohyoid", "digastric", "buccinator", "zygomatic", "sternothyroid", "thyrohyoid", "stylohyoid", "vastus", "intercostal", "diaphragm", "erector", "rhomboid", "serratus", "subscapularis", "supraspinatus", "infraspinatus", "teres", "coracobrachialis", "palmaris"] },
  { system: "Skeletal", keywords: ["femur", "tibia", "fibula", "humerus", "radius", "ulna", "scapula", "clavicle", "vertebra", "cervical", "thoracic", "lumbar", "sacrum", "coccyx", "pelvis", "ilium", "ischium", "pubis", "skull", "cranium", "mandible", "maxilla", "sternum", "rib", "costa", "patella", "calcaneus", "talus", "phalanx", "metacarpal", "metatarsal", "carpal", "tarsal", "occipital", "frontal", "parietal", "temporal", "sphenoid", "ethmoid", "zygomatic", "nasal", "lacrimal", "vomer", "turbinate"] },
  { system: "Cardiovascular", keywords: ["heart", "cardiac", "aorta", "artery", "arterial", "vein", "venous", "aortic", "ventricle", "atrium", "atrial", "coronary", "pulmonar", "carotid", "femoral"] },
  { system: "Nervous", keywords: ["nerve", "nervous", "brain", "cerebr", "cerebell", "brainstem", "spinal", "medulla", "midbrain", "pons", "thalamus", "hypothalamus", "hippocampus", "ganglion", "neuron", "optic", "olfactory", "vagus", "sciatic", "brachial", "plexus", "motor", "sensory"] },
  { system: "Visceral", keywords: ["liver", "kidney", "renal", "stomach", "colon", "intestine", "pancreas", "spleen", "bladder", "ureter", "lung", "pulmonary", "trachea", "bronchus", "esophagus", "oesophagus", "gallbladder", "gall", "appendix", "thyroid", "adrenal", "ovary", "testicle"] },
]

/** Derive the side qualifier from the raw mesh identifier, if present. */
function deriveSide(rawName: string): "Left" | "Right" | null {
  for (const { regex, side } of SIDE_PATTERNS) {
    if (regex.test(rawName)) return side
  }
  return null
}

/**
 * Convert a raw GLB mesh name into a readable label.
 * "Biceps_brachii_L" -> "Biceps Brachii"
 */
function toReadableBase(rawName: string): string {
  const withoutSide = rawName.replace(/_(l|r)$/i, "").replace(/_(right)$/i, "").replace(/_(left)$/i, "")
  const words = withoutSide.split(/[_\s]+/).filter(Boolean)
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
}

/** Derive the anatomical system from a small vocabulary of known keywords. */
function deriveSystem(rawName: string): string | null {
  const lower = rawName.toLowerCase()
  for (const { system, keywords } of SYSTEM_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return system
  }
  return null
}

/**
 * Produce an AnatomyInfo for a raw GLB mesh name. Will enrich with database
 * metadata when an anatomy source is available, but never fabricates facts.
 */
export function getAnatomyInfo(rawName: string): AnatomyInfo {
  const baseName = toReadableBase(rawName)
  const side = deriveSide(rawName)
  const displayName = side ? `${baseName} — ${side}` : baseName
  return {
    rawName,
    baseName,
    side,
    displayName,
    system: deriveSystem(rawName),
  }
}

/**
 * Connect a readable base name to optional anatomy database content.
 * When no database is configured, returns an empty enrichment (no invented facts).
 * Add a lookup against your anatomy JSON/database here.
 */
export function enrichAnatomy(_baseName: string): Partial<AnatomyInfo> {
  return {
    description: undefined,
    function: undefined,
    additionalInfo: undefined,
  }
}
