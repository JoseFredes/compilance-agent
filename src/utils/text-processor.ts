/**
 * Text processing utilities
 */

import { RELEVANT_KEYWORDS, TEXT_LIMITS } from "../config/constants";

/**
 * Intelligently truncates law text to fit within LLM context window
 * Prioritizes sections containing relevant keywords
 */
export const truncateLawText = (
  text: string,
  maxChars: number = TEXT_LIMITS.MAX_LAW_TEXT_CHARS
): string => {
  // Return complete text if it's within limits
  if (text.length <= maxChars) {
    return text;
  }

  // Search for relevant sections containing keywords
  const keywords = RELEVANT_KEYWORDS;
  const lines = text.split("\n");
  const relevantLines: string[] = [];
  let charCount = 0;

  // First, add lines containing keywords
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (keywords.some((keyword) => lowerLine.includes(keyword))) {
      if (charCount + line.length > maxChars) break;
      relevantLines.push(line);
      charCount += line.length;
    }
  }

  // If not enough relevant content found, add from the beginning
  if (charCount < maxChars / 2) {
    for (const line of lines) {
      if (charCount + line.length > maxChars) break;
      if (!relevantLines.includes(line)) {
        relevantLines.push(line);
        charCount += line.length;
      }
    }
  }

  return relevantLines.join("\n");
};
