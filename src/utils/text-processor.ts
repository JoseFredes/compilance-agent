import { RELEVANT_KEYWORDS, TEXT_LIMITS } from "../config/constants";

export const truncateLawText = (
  text: string,
  maxChars: number = TEXT_LIMITS.MAX_LAW_TEXT_CHARS
): string => {
  if (text.length <= maxChars) return text;

  const keywords = RELEVANT_KEYWORDS;
  const lines = text.split("\n");
  const relevantLines: string[] = [];
  let charCount = 0;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    if (keywords.some((keyword) => lowerLine.includes(keyword))) {
      if (charCount + line.length > maxChars) break;
      relevantLines.push(line);
      charCount += line.length;
    }
  }

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
