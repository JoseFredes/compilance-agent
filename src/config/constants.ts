/**
 * Application constants and configuration
 */

/**
 * KV storage key prefixes
 */
export const KV_PREFIX = {
  LAW_TEXT: "law_text:",
  RUN: "", // Runs are stored with their UUID directly
} as const;

/**
 * LLM configuration
 */
export const LLM_CONFIG = {
  MODEL: "@cf/meta/llama-3-8b-instruct",
  DEFAULT_MAX_TOKENS: 1500,
  SELECTION_MAX_TOKENS: 200,
} as const;

/**
 * Text processing limits
 */
export const TEXT_LIMITS = {
  MAX_LAW_TEXT_CHARS: 15000,
  QUESTION_MIN_LENGTH: 10,
  QUESTION_MAX_LENGTH: 2000,
} as const;

/**
 * Keywords for law text truncation
 */
export const RELEVANT_KEYWORDS = [
  "personal data",
  "data protection",
  "privacy",
  "personal information",
  "data processing",
  "datos personales",
  "protección de datos",
  "privacidad",
  "información personal",
  "tratamiento de datos",
] as const;
