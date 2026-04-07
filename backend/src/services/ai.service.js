import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_TIME_MATCH_MINUTES = 180;

const MEDICAL_DISCLAIMER =
  "I can help with your medication schedule and tracking, but I cannot provide medical advice. Please consult a licensed clinician for diagnosis or treatment questions.";

const getModelName = () => {
  const configured = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  return configured.replace(/^models\//, "");
};
const getGeminiApiKey = () => process.env.GEMINI_API_KEY || "";
const getModelCandidates = () => {
  const configured = getModelName();
  return Array.from(
    new Set([
      configured,
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-2.5-flash-lite",
    ])
  );
};

const ACTION_PATTERNS = [
  {
    status: "taken",
    patterns: [
      /\bi\s+(?:just\s+)?(?:took|had)\b/,
      /\bi\s+have\s+taken\b/,
      /\bi\s+ve\s+taken\b/,
      /\bmark\b.*\b(?:as\s+)?taken\b/,
      /\blog(?:ged)?\b.*\btaken\b/,
    ],
  },
  {
    status: "missed",
    patterns: [
      /\bi\s+(?:have\s+)?missed\b/,
      /\bi\s+ve\s+missed\b/,
      /\bi\s+skipp?ed\b/,
      /\bmark\b.*\b(?:as\s+)?missed\b/,
    ],
  },
  {
    status: "delayed",
    patterns: [
      /\bi\s+(?:am\s+)?(?:late|delayed)\b/,
      /\bi\s+postponed\b/,
      /\bi\s+ve\s+delayed\b/,
      /\bmark\b.*\b(?:as\s+)?delayed\b/,
    ],
  },
];

const UPDATE_INTENT_PATTERNS = [/\bmark\b/, /\bupdate\b/, /\blog\b/];

const MEDICAL_ADVICE_PATTERNS = [
  /\bdiagnos(?:e|is|ing)\b/,
  /\bside effect\b/,
  /\bis it safe\b/,
  /\bsafe to\b/,
  /\binteraction\b/,
  /\boverdose\b/,
  /\bpregnant\b/,
  /\bemergency\b/,
  /\bshould i\b/,
  /\bcan i\b/,
  /\bwhat should (?:i|one|someone|we) take for\b/,
  /\bwhat to take for\b/,
  /\bwhich (?:medicine|medication)\b/,
  /\b(?:medicine|medication) for\b/,
];

const SCHEDULE_QUERY_PATTERNS = [
  /\btoday'?s schedule\b/,
  /\bmedication schedule\b/,
  /\bwhat do i take(?: today| tonight| this morning| this evening)?\b/,
  /\bwhat should i take today\b/,
  /\bwhat do i need to take(?: today)?\b/,
  /\bwhat do i have to take(?: today)?\b/,
  /\bwhat pills do i have(?: today)?\b/,
  /\bwhat medications? (?:do i have|are due)(?: today)?\b/,
  /\bwhen do i take\b/,
  /\bnext dose\b/,
  /\bnext medication\b/,
  /\bwhat(?:'s| is) due\b/,
  /\bdue today\b/,
];

const normalizeText = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const minutesFromDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.getHours() * 60 + date.getMinutes();
};

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDateTime = (value) => {
  const date = formatDate(value);
  const time = formatTime(value);
  if (!date && !time) return "";
  if (!date) return time;
  if (!time) return date;
  return `${date} at ${time}`;
};

const formatRequestedTime = (hour, minute) =>
  new Date(2000, 0, 1, hour, minute).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const to24Hour = (hour, meridiem) => {
  let normalizedHour = Number(hour);
  if (Number.isNaN(normalizedHour)) return null;

  const suffix = meridiem ? meridiem.toLowerCase() : "";
  if (!suffix) return normalizedHour;
  if (normalizedHour === 12) normalizedHour = 0;
  return suffix === "pm" ? normalizedHour + 12 : normalizedHour;
};

export const getMedsInWindow = (logs = [], windowStart, windowEnd) => {
  if (!Array.isArray(logs)) return [];

  const start = windowStart ? new Date(windowStart) : null;
  const end = windowEnd ? new Date(windowEnd) : null;
  const withinWindow = (value) => {
    const time = new Date(value).getTime();
    if (Number.isNaN(time)) return false;
    if (start && time < start.getTime()) return false;
    if (end && time > end.getTime()) return false;
    return true;
  };

  const entries = [];

  logs.forEach((log) => {
    const elixir = log.elixirId || log.elixir || {};
    const name = elixir.name || log.name || "Medication";
    const dosage = elixir.dosage || log.dosage || "";
    const timings = Array.isArray(log.timings) ? log.timings : [];

    timings.forEach((timing) => {
      if (!timing?.time) return;
      if (!withinWindow(timing.time)) return;

      entries.push({
        name,
        dosage,
        time: new Date(timing.time),
        status: timing.status || "pending",
      });
    });
  });

  return entries.sort((a, b) => new Date(a.time) - new Date(b.time));
};

const summarizeMedications = (medications = []) =>
  medications.map((med) => ({
    name: med.name,
    dosage: med.dosage || "",
    frequency: med.frequency || "",
    notes: med.notes || "",
    timings: Array.isArray(med.timings)
      ? med.timings.map((time) => new Date(time).toISOString())
      : [],
    startDate: med.startDate ? new Date(med.startDate).toISOString() : null,
    endDate: med.endDate ? new Date(med.endDate).toISOString() : null,
  }));

const summarizeLogs = (logs = []) =>
  logs.map((log) => ({
    scheduledDate: log.scheduledDate
      ? new Date(log.scheduledDate).toISOString()
      : null,
    medication: log.elixirId?.name || log.elixir?.name || log.name || "",
    timings: Array.isArray(log.timings)
      ? log.timings.map((timing) => ({
          time: timing?.time ? new Date(timing.time).toISOString() : null,
          status: timing?.status || "pending",
          takenAt: timing?.takenAt ? new Date(timing.takenAt).toISOString() : null,
        }))
      : [],
  }));

export const buildSanjiPrompt = ({ query, sessionId, healthData }) => {
  const today = new Date().toISOString().split("T")[0];
  const summarizedMeds = summarizeMedications(healthData?.medications || []);
  const summarizedLogs = summarizeLogs(healthData?.logs || []);

  return `You are MediAlert's AI health assistant.\n\nCurrent date: ${today}\nSession ID: ${sessionId}\n\nUser question: "${query}"\n\nUser health data (JSON):\n${JSON.stringify(
    {
      lastDose: healthData?.lastDose || null,
      medications: summarizedMeds,
      recentLogs: summarizedLogs,
    },
    null,
    2
  )}\n\nInstructions:\n- Use the provided health data whenever the question is about the user's medication schedule, adherence, or logged doses.\n- For general health education or preventive-care questions that do not require diagnosis, treatment, or medication recommendations, give a short, non-personalized educational answer.\n- If the user asks for diagnosis, treatment, medication recommendations, dosing advice, symptom-specific recommendations, interactions, or safety of taking something, respond with exactly: "${MEDICAL_DISCLAIMER}"\n- Never invent personal health facts that are not in the provided data.\n- Be concise, friendly, and specific.\n- If you cannot determine a user-specific answer from the data, say you don't have enough info and suggest checking the Medications page.\n\nExamples:\n- User: "What do I take today?" -> Answer from the provided schedule data.\n- User: "How is my adherence this week?" -> Answer from the provided logs.\n- User: "Do I need regular health checkups?" -> Give brief general wellness guidance, not the disclaimer.\n- User: "What should I take for a headache?" -> Respond with exactly the disclaimer.`;
};

const isMedicalAdviceQuery = (text) =>
  MEDICAL_ADVICE_PATTERNS.some((pattern) => pattern.test(text));

const isScheduleQuery = (text) =>
  SCHEDULE_QUERY_PATTERNS.some((pattern) => pattern.test(text));

export const formatMedicationList = (medications = []) => {
  const names = medications
    .map((medication) => medication?.name)
    .filter(Boolean);
  const uniqueNames = Array.from(
    new Map(names.map((name) => [name.toLowerCase(), name])).values()
  );

  if (uniqueNames.length === 0) return "";
  if (uniqueNames.length === 1) return uniqueNames[0];
  if (uniqueNames.length === 2) return `${uniqueNames[0]} or ${uniqueNames[1]}`;
  return `${uniqueNames.slice(0, -1).join(", ")}, or ${uniqueNames[uniqueNames.length - 1]}`;
};

export const buildActionNeedsStatusMessage = (medicationName) =>
  `I found ${medicationName || "that medication"}. Tell me whether to mark it as taken, delayed, or missed.`;

export const findMedicationMatch = (query, medications = []) => {
  const normalizedQuery = normalizeText(query);
  let bestMatch = null;

  medications.forEach((medication) => {
    const normalizedName = normalizeText(medication?.name || "");
    if (!normalizedName) return;

    let score = 0;

    if (normalizedQuery.includes(normalizedName)) {
      score = normalizedName.length + 100;
    } else {
      const tokens = normalizedName.split(" ").filter((token) => token.length > 1);
      if (tokens.length > 0 && tokens.every((token) => normalizedQuery.includes(token))) {
        score = tokens.join("").length + 50;
      }
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = score > 0 ? { medication, score } : bestMatch;
    }
  });

  return bestMatch?.medication || null;
};

export const parseTimeFromQuery = (query) => {
  if (!query) return null;

  const patterns = [
    /(?:at|around|by)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i,
    /(?:at|around|by)\s+(\d{1,2}):(\d{2})\b/i,
    /\b(\d{1,2})(?::(\d{2}))\s*(am|pm)\b/i,
    /\b(\d{1,2})\s*(am|pm)\b/i,
    /\b(\d{1,2}):(\d{2})\b/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (!match) continue;

    const hour = to24Hour(match[1], match[3]);
    const minute = Number(match[2] || 0);

    if (hour === null || Number.isNaN(minute) || hour > 23 || minute > 59) {
      continue;
    }

    return {
      hour,
      minute,
      minutesOfDay: hour * 60 + minute,
      label: formatRequestedTime(hour, minute),
    };
  }

  return null;
};

export const extractMedicationActionIntent = ({ query, medications = [] }) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return null;

  const medication = findMedicationMatch(normalizedQuery, medications);

  let status = null;
  for (const action of ACTION_PATTERNS) {
    if (action.patterns.some((pattern) => pattern.test(normalizedQuery))) {
      status = action.status;
      break;
    }
  }

  if (!status) {
    const wantsUpdate = UPDATE_INTENT_PATTERNS.some((pattern) =>
      pattern.test(normalizedQuery)
    );

    if (wantsUpdate) {
      return {
        type: "track_status_update_needs_status",
        medication,
      };
    }

    return null;
  }

  return {
    type: "track_status_update",
    status,
    medication,
    requestedTime: parseTimeFromQuery(query),
  };
};

export const getTimingDistance = (requestedTime, timingValue) => {
  if (!requestedTime) return null;
  const candidateMinutes = minutesFromDate(timingValue);
  if (candidateMinutes === null) return null;
  return Math.abs(requestedTime.minutesOfDay - candidateMinutes);
};

export const isTimingWithinMatchWindow = (
  requestedTime,
  timingValue,
  maxDistance = MAX_TIME_MATCH_MINUTES
) => {
  const distance = getTimingDistance(requestedTime, timingValue);
  if (distance === null) return false;
  return distance <= maxDistance;
};

export const buildActionNeedsMedicationMessage = (medications = []) => {
  const medicationList = formatMedicationList(medications);
  if (!medicationList) {
    return "I don't see any medications yet. Add one on the Medications page and then I can update it for you.";
  }

  return `I can update that for you, but I couldn't tell which medication you meant. Try naming one of: ${medicationList}.`;
};

export const buildActionNoMatchMessage = ({
  medicationName,
  status,
  requestedTime,
}) => {
  const displayName = medicationName || "that medication";
  const requestedTimeText = requestedTime?.label
    ? ` close to ${requestedTime.label}`
    : "";

  if (status === "taken") {
    return `I couldn't find another ${displayName} dose${requestedTimeText} to mark as taken today.`;
  }

  return `I couldn't find a pending ${displayName} dose${requestedTimeText} to mark as ${status} today.`;
};

export const buildActionSuccessMessage = ({
  medicationName,
  dosage,
  status,
  time,
}) => {
  const displayName = `${medicationName || "Medication"}${dosage ? ` (${dosage})` : ""}`;
  const scheduledTime = formatTime(time);
  const timeText = scheduledTime ? ` for ${scheduledTime}` : "";

  return `Marked ${displayName} as ${status}${timeText}.`;
};

export const ruleBasedFallback = ({ query, healthData }) => {
  const text = normalizeText(query);
  if (!text) return null;

  const medications = Array.isArray(healthData?.medications)
    ? healthData.medications
    : [];
  const logs = Array.isArray(healthData?.logs) ? healthData.logs : [];
  const lastDose = healthData?.lastDose || null;

  if (isMedicalAdviceQuery(text)) {
    return MEDICAL_DISCLAIMER;
  }

  if (medications.length === 0) {
    return "I don't see any medications yet. Add a medication in the Medications page so I can help you track it.";
  }

  if (
    text.includes("last dose") ||
    text.includes("last taken") ||
    text.includes("last time")
  ) {
    if (lastDose?.takenAt) {
      const takenAt = formatDateTime(lastDose.takenAt);
      const name = lastDose.name || "your medication";
      const dosage = lastDose.dosage ? ` (${lastDose.dosage})` : "";
      return `Your last recorded dose was ${name}${dosage} on ${takenAt}.`;
    }
    return "I don't have any recorded taken doses yet.";
  }

  if (
    text.includes("missed") ||
    text.includes("overdue") ||
    text.includes("late")
  ) {
    const missed = [];
    logs.forEach((log) => {
      const medName = log.elixirId?.name || log.elixir?.name || log.name || "";
      (log.timings || []).forEach((timing) => {
        if (timing?.status === "missed" || timing?.status === "delayed") {
          missed.push({
            name: medName,
            time: timing?.time,
            status: timing?.status,
          });
        }
      });
    });

    if (missed.length === 0) {
      return "I don't see any missed or delayed doses in the last 7 days.";
    }

    const summary = missed
      .slice(0, 5)
      .map((entry) =>
        `${entry.name || "Medication"} at ${formatDateTime(entry.time)} (${entry.status})`
      )
      .join("; ");

    return `Here are the most recent missed or delayed doses: ${summary}.`;
  }

  if (isScheduleQuery(text)) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const entries = getMedsInWindow(logs, start, end);
    if (entries.length === 0) {
      return "I don't see any doses scheduled for today based on the last 7 days of logs.";
    }

    const schedule = entries
      .map(
        (entry) =>
          `${entry.name}${entry.dosage ? ` (${entry.dosage})` : ""} at ${formatTime(entry.time)} (${entry.status})`
      )
      .join("; ");

    return `Today's schedule: ${schedule}.`;
  }

  if (
    text.includes("adherence") ||
    text.includes("streak") ||
    text.includes("progress")
  ) {
    let total = 0;
    let taken = 0;
    let missed = 0;
    let delayed = 0;

    logs.forEach((log) => {
      (log.timings || []).forEach((timing) => {
        total += 1;
        if (timing?.status === "taken") taken += 1;
        if (timing?.status === "missed") missed += 1;
        if (timing?.status === "delayed") delayed += 1;
      });
    });

    if (total === 0) {
      return "I don't see any logged doses in the last 7 days yet.";
    }

    const adherence = Math.round(((taken + delayed) / total) * 100);
    return `In the last 7 days you logged ${total} doses: ${taken} taken, ${delayed} delayed, ${missed} missed. Adherence is about ${adherence}%.`;
  }

  return null;
};

export const getAIResponse = async (query, sessionId, healthData) => {
  const GEMINI_API_KEY = getGeminiApiKey();
  const MODEL_CANDIDATES = getModelCandidates();
  const fallback = ruleBasedFallback({ query, healthData });

  if (!GEMINI_API_KEY) {
    return {
      answer:
        fallback ||
        "The AI service isn't configured yet. Please set GEMINI_API_KEY in the backend .env file.",
      source: "local_fallback",
    };
  }

  let lastError = null;

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const prompt = buildSanjiPrompt({ query, sessionId, healthData });

    for (const modelName of MODEL_CANDIDATES) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result?.response?.text?.();

        if (!text || !text.trim()) {
          return {
            answer: fallback || MEDICAL_DISCLAIMER,
            source: fallback ? "local_fallback" : "gemini_empty",
          };
        }

        return {
          answer: text.trim(),
          source: "gemini",
          model: modelName,
        };
      } catch (error) {
        lastError = error;
        const status = Number(error?.status || error?.response?.status || 0);
        const shouldTryAnotherModel =
          status === 404 || status === 429 || status === 500 || status === 503;

        if (!shouldTryAnotherModel || modelName === MODEL_CANDIDATES.at(-1)) {
          throw error;
        }
      }
    }

  } catch (error) {
    console.error("Gemini error:", error || lastError);
    return {
      answer: fallback
        ? `I couldn't reach the full AI right now, so I'm answering from your app data.\n\n${fallback}`
        : "I couldn't reach the full AI right now. Please try again in a moment.",
      source: "local_fallback",
    };
  }
};
