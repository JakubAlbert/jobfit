// Removes personal data from CV text before it is sent to the Gemini API.
// Deliberately deterministic (regex + exact matching), not AI: the result is predictable,
// testable, and the personal data never reaches a model in the first place.
//
// Names and addresses cannot be recognized reliably by a pattern, so the user enters them once
// and every occurrence is replaced (ignoring case and diacritics). Emails, phone numbers,
// profile links and postal codes with a city are recognized by pattern.

export interface PersonalInfo {
  fullName: string
  address: string
}

export const PLACEHOLDERS = {
  email: '[EMAIL]',
  link: '[ODKAZ]',
  address: '[ADRESA]',
  phone: '[TELEFÓN]',
  name: '[MENO]',
} as const

export type PersonalDataKind = keyof typeof PLACEHOLDERS

export interface AnonymizeResult {
  text: string
  /** How many occurrences of each kind were replaced, for showing a summary to the user. */
  counts: Record<PersonalDataKind, number>
}

const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g

const LINK =
  /(?:https?:\/\/|www\.)[^\s,;)]+|\b(?:[\w-]+\.)*(?:linkedin\.com|github\.com|gitlab\.com|behance\.net|dribbble\.com)\/[^\s,;)]*/gi

// Must start with +, 00 or 0 (international or local format), so years like "2019 2020" never match.
// Groups may be separated by one space, dot, dash or slash.
const PHONE_CANDIDATE = /(?<![\w+])(?:(?:\+|00)\d{1,3}|0\d{1,3})(?:[ .\-/]?\d{2,4}){2,4}(?!\w)/g

// Slovak/Czech postal code followed by a capitalized city, e.g. "811 01 Bratislava".
const POSTAL_CODE_WITH_CITY = /\b\d{3} ?\d{2}\b\s+\p{Lu}[\p{L}-]*(?:\s\d{1,2}\b)?/gu

export function anonymize(input: string, personal: PersonalInfo): AnonymizeResult {
  const counts: Record<PersonalDataKind, number> = { email: 0, link: 0, address: 0, phone: 0, name: 0 }
  const count = (kind: PersonalDataKind) => () => {
    counts[kind]++
    return PLACEHOLDERS[kind]
  }

  // Order matters: emails before links (an email contains a domain),
  // addresses before phones (postal codes are digits too).
  let text = input.normalize('NFC')
  text = text.replace(EMAIL, count('email'))
  text = text.replace(LINK, count('link'))

  const address = personal.address.trim()
  if (address) {
    text = replaceLiteral(text, address, count('address'))
    // Also each comma-separated part with a digit ("Hlavná 12", "811 01 Bratislava"),
    // since CVs often split the address across lines. A city alone stays: it is not identifying.
    for (const part of address.split(/[,\n]/).map((p) => p.trim())) {
      if (/\d/.test(part) && part.length >= 4) text = replaceLiteral(text, part, count('address'))
    }
  }
  text = text.replace(POSTAL_CODE_WITH_CITY, count('address'))

  text = text.replace(PHONE_CANDIDATE, (match) => {
    const digits = match.replace(/\D/g, '').length
    return digits >= 9 && digits <= 15 ? count('phone')() : match
  })

  const fullName = personal.fullName.trim()
  if (fullName) {
    text = replaceLiteral(text, fullName, count('name'))
    for (const part of fullName.split(/\s+/)) {
      if (part.length >= 2) text = replaceLiteral(text, part, count('name'))
    }
  }

  return { text, counts }
}

/**
 * Replaces whole-word occurrences of `needle`, ignoring case and diacritics
 * ("Ján Kováč" also matches "JAN KOVAC").
 */
export function replaceLiteral(text: string, needle: string, replacement: () => string): string {
  const foldedNeedle = fold(needle)
  if (!foldedNeedle) return text
  // Whitespace inside the needle matches any whitespace, e.g. a line break in the CV.
  const pattern = foldedNeedle
    .split(/\s+/)
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('\\s+')
  const regex = new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, 'gu')

  // fold() keeps every character at its index, so match positions apply to the original text.
  const folded = fold(text)
  let result = ''
  let last = 0
  for (const match of folded.matchAll(regex)) {
    result += text.slice(last, match.index) + replacement()
    last = match.index + match[0].length
  }
  return result + text.slice(last)
}

/** Lowercases and strips diacritics character by character, preserving string length and indexes. */
function fold(text: string): string {
  let result = ''
  for (const char of text) {
    const folded = char.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    result += folded.length === char.length ? folded : char
  }
  return result
}
