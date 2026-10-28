/**
 * Protects strings that must survive machine translation byte-for-byte.
 *
 * The editor only sends prose, but prose still contains the brand, links,
 * prices, tour codes and `{placeholders}`. Each is swapped for a stable token
 * before the request and restored afterwards. If a token comes back missing or
 * mangled the caller must treat the response as invalid rather than write a
 * corrupted value into the form.
 */

const TOKEN_PREFIX = "[[SEATRIP_";
const TOKEN_PATTERN = /\[\[SEATRIP_([A-Z]+)\]\]/g;

/** Digits cannot be used: the numeric mask would rewrite the token itself. */
function tokenIndex(value: number): string {
  let index = value;
  let out = "";
  do {
    out = String.fromCharCode(65 + (index % 26)) + out;
    index = Math.floor(index / 26) - 1;
  } while (index >= 0);
  return out;
}

function tokenNumber(value: string): number {
  let index = 0;
  for (const char of value) index = index * 26 + (char.charCodeAt(0) - 64);
  return index - 1;
}

export type ProtectedText = { text: string; tokens: string[] };

export function protectTranslationText(value: string): ProtectedText {
  const tokens: string[] = [];
  const tokenFor = (match: string) => {
    tokens.push(match);
    return `${TOKEN_PREFIX}${tokenIndex(tokens.length - 1)}]]`;
  };

  // One pass so a token inserted for one match is never matched again by a
  // later rule (e.g. the numeric mask hitting the token's own index).
  const protectedPattern =
    /((?:https?:\/\/|www\.)[^\s<>"']+)|([\w.+-]+@[\w.-]+\.[A-Za-z]{2,})|(\{[^{}\n]{1,120}\})|(sea\s+trip)|(\d[\d.,]*\s*(?:₫|VN[ĐD]))|(\b[A-Z]{2,}[A-Z0-9]*(?:[-_][A-Z0-9]+)+\b)|(\d+(?:[.,]\d+)*)/gi;
  const text = value.replace(protectedPattern, (match) => tokenFor(match));
  return { text, tokens };
}

export function restoreTranslationText(
  value: string,
  tokens: readonly string[],
): { text: string; restored: boolean } {
  const seen = new Set<number>();
  const text = value.replace(TOKEN_PATTERN, (whole, index: string) => {
    const at = tokenNumber(index);
    const token = tokens[at];
    if (token === undefined) return whole;
    seen.add(at);
    return token;
  });
  const restored =
    seen.size === tokens.length && !/\[\[SEATRIP_[A-Z]+\]\]/.test(text);
  return { text, restored };
}

/** Google's Basic v2 endpoint HTML-escapes plain text responses. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
};

export function decodeTranslationEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (whole, body: string) => {
    if (body.startsWith("#")) {
      const hex = body[1]?.toLowerCase() === "x";
      const code = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}
