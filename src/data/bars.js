export const BASE_BARS = [
  {
    id: 'name', label: 'Full Name', section: 'demographic', baseWidth: 85,
    color: '#D4572A',
    description: 'Your legal name as recorded across hospital and clinic systems.',
    why: 'Used to match your record to trial consent forms and link visits over time. Almost always removed before data is shared for research.',
    stepNotes: {
      4: 'The most obvious identifier — removed first. But your name being gone doesn\'t mean you\'re gone. Everything else stays.',
    },
  },
  {
    id: 'dob', label: 'Date of Birth', section: 'demographic', baseWidth: 85,
    color: '#B34030',
    description: 'Your exact date of birth as recorded in your medical record.',
    why: 'Used to confirm patient identity and calculate age-based eligibility criteria for the trial.',
  },
  {
    id: 'ssn', label: 'Social Security #', section: 'demographic', baseWidth: 85,
    color: '#C45E38',
    description: 'Your government-issued national identifier.',
    why: 'Used for identity verification and insurance billing during enrollment. Removed before any research dataset is shared.',
    stepNotes: {
      4: 'Removed before your data leaves the hospital. Your SSN is the clearest link between your medical record and your legal identity — so it\'s the first to go.',
    },
  },
  {
    id: 'zip', label: 'ZIP Code', section: 'demographic', baseWidth: 85,
    color: '#7A9E6E',
    description: 'Your 5-digit postal code, retained as a geographic marker.',
    why: 'Retained as a quasi-identifier to study geographic health patterns and socioeconomic disparities — but it\'s also one of the fields most useful to an attacker.',
    stepNotes: {
      4: 'Your full address is removed, but ZIP survives — generalized to a 3-digit prefix. Precise enough to study geography. Usually vague enough to protect you.',
      7: 'Your ZIP region survived de-identification. Combined with your age bracket and diagnosis, it may be enough for someone to find you in a public dataset.',
    },
  },
  {
    id: 'diagnosis', label: 'Diagnosis Codes', section: 'clinical', baseWidth: 85,
    color: '#E09B2F',
    description: 'ICD-10 codes describing your documented medical conditions.',
    why: 'Defines trial eligibility and helps researchers study how the intervention performs across different disease subgroups.',
    stepNotes: {
      4: 'Generalized — specific codes are replaced with broader categories. "Type 2 diabetes, poorly controlled" becomes just "diabetes."',
      6: 'The pattern emerges here. Your diagnosis codes, crossed with lab trends and wearable signals, reveal how patients like you respond to treatment.',
      7: 'A rare diagnosis can make you uniquely identifiable even in a stripped dataset. The rarer your condition, the smaller your crowd.',
    },
  },
  {
    id: 'notes', label: 'Clinical Notes', section: 'clinical', baseWidth: 85,
    color: '#9A5A8A',
    description: 'Free-text observations written by your care team.',
    why: 'Contain nuanced clinical context that structured codes miss. AI uses natural language processing to screen these notes for eligibility.',
    stepNotes: {
      1: 'AI reads these notes using Natural Language Processing — finding eligibility clues that structured codes miss, like a passing mention of a symptom or a dosage change.',
      4: 'Removed entirely before sharing. Free-text notes are too rich in incidental detail — names, relationships, locations — to safely generalize.',
    },
  },
  {
    id: 'meds', label: 'Medications', section: 'clinical', baseWidth: 85,
    color: '#C98B2E',
    description: 'The full list of prescription and over-the-counter drugs in your record.',
    why: 'Screens for drug interactions with the trial intervention and helps characterize the patient population being studied.',
  },
  {
    id: 'labs', label: 'Lab Results', section: 'measurement', baseWidth: 85,
    color: '#3A9A8F',
    description: 'Blood panels, urine tests, and other clinical measurements.',
    why: 'Establishes your baseline health status and tracks how your body responds to the trial intervention over time.',
    stepNotes: {
      4: 'Noise is added — your exact values shift slightly. Your real cholesterol was 187; the dataset records 184. Close enough for statistics, far enough to break an exact match.',
    },
  },
  {
    id: 'wearable', label: 'Wearable Data', section: 'measurement', baseWidth: 85,
    color: '#8B3A2A',
    description: 'Continuous sensor data from fitness trackers or medical-grade wearables.',
    why: 'Captures real-world activity, sleep, and physiological patterns outside of scheduled clinical visits — data that didn\'t exist in your record before you enrolled.',
    stepNotes: {
      3: 'This bar didn\'t exist before you enrolled. Your wearable, now linked to your trial record, streams data that no one collected from you before you signed the consent form.',
      6: 'Continuous wearable signals — steps, heart rate, sleep — give researchers a window into your daily life that scheduled clinic visits can\'t capture.',
    },
  },
];

export const NEW_BARS = [
  {
    id: 'trial_treatment', label: 'Trial Treatment', section: 'new', baseWidth: 85,
    color: '#3A8E72',
    description: 'The experimental treatment or placebo you receive during the trial.',
    why: 'Links your identity to your assigned arm — the core variable the trial is designed to study.',
    stepNotes: {
      3: 'Recorded from the moment you\'re assigned to a treatment arm. This field links your identity to whether you received the drug or the placebo.',
    },
  },
];

export const INFERRED_BARS = [
  {
    id: 'inferred_income', label: 'Inferred: Income Bracket', section: 'inferred', baseWidth: 85,
    color: '#A2284C',
    description: 'Not collected — predicted by AI from prescription patterns and geographic data.',
    why: 'A model trained on medication history and ZIP region can estimate socioeconomic status without ever asking.',
  },
];

export const SUPPRESSED_IDS  = ['name', 'ssn', 'notes'];
export const GENERALIZED_IDS = ['dob', 'zip', 'diagnosis'];
export const NOISE_IDS       = ['labs', 'wearable'];
export const PATTERN_A_ID    = 'diagnosis';
export const PATTERN_B_ID    = 'wearable';
export const REID_IDS        = ['zip', 'diagnosis', 'meds'];

// Kept for any legacy references; bar colors are now defined per-bar above.
export const SECTION_COLORS = {
  inferred:    '#A2284C',
  demographic: '#CC4830',
  clinical:    '#5A9E52',
  measurement: '#E09818',
  new:         '#3A8E72',
};
