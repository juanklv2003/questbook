/** Strip Qwen-style reasoning blocks and markdown fences before JSON parse. */
export function stripLlmPreamble(text: string): string {
  let s = text.trim();
  s = s.replace(/[\s\S]*?<\/think>/gi, '').trim();
  s = s.replace(/[\s\S]*?<\/redacted_reasoning>/gi, '').trim();
  const arrayStart = s.indexOf('[');
  if (arrayStart > 0) {
    const prefix = s.slice(0, arrayStart);
    if (/think|reasoning/i.test(prefix)) {
      s = s.slice(arrayStart);
    }
  }
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*\r?\n?/i, '').replace(/\r?\n?```\s*$/, '');
  }
  return s.trim();
}

export function extractJsonArraySlice(text: string): string {
  const stripped = stripLlmPreamble(text);
  const start = stripped.indexOf('[');
  const end = stripped.lastIndexOf(']');
  if (start !== -1 && end > start) {
    return stripped.slice(start, end + 1);
  }
  if (start !== -1) {
    return stripped.slice(start);
  }
  return stripped;
}

/** Pull complete `{...}` objects from a truncated JSON array. */
function salvageObjectEntries(arrayBody: string): unknown[] {
  const out: unknown[] = [];
  let depth = 0;
  let inString = false;
  let escape = false;
  let objStart = -1;

  for (let i = 0; i < arrayBody.length; i++) {
    const c = arrayBody[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') {
      if (depth === 0) objStart = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0 && objStart >= 0) {
        const chunk = arrayBody.slice(objStart, i + 1);
        try {
          out.push(JSON.parse(chunk));
        } catch {
          /* skip malformed object */
        }
        objStart = -1;
      }
    }
  }
  return out;
}

function salvageTruncatedArray(jsonSlice: string): unknown[] {
  let s = jsonSlice.trim();
  if (!s.startsWith('[')) {
    const i = s.indexOf('[');
    if (i < 0) return [];
    s = s.slice(i);
  }

  for (let i = 0; i < 40; i++) {
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      const lastBrace = s.lastIndexOf('}');
      if (lastBrace <= 0) break;
      s = s.slice(0, lastBrace + 1).replace(/,\s*$/, '');
      if (!s.endsWith(']')) s += ']';
    }
  }

  const innerStart = s.indexOf('[');
  if (innerStart < 0) return [];
  return salvageObjectEntries(s.slice(innerStart + 1));
}

/**
 * Best-effort parse of a flashcard JSON array from model output.
 * Returns null if nothing usable was found.
 */
export function parseFlashcardJsonArray(raw: string): unknown[] | null {
  const jsonSlice = extractJsonArraySlice(raw);

  try {
    const parsed = JSON.parse(jsonSlice);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      for (const key of ['cards', 'flashcards', 'items']) {
        const nested = record[key];
        if (Array.isArray(nested)) return nested;
      }
    }
  } catch {
    const salvaged = salvageTruncatedArray(jsonSlice);
    if (salvaged.length > 0) return salvaged;
  }
  return null;
}
