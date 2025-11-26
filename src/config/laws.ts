/**
 * Law documents configuration
 * Contains metadata for all supported Chilean laws
 */

import type { LawDoc } from "../types";

export const LAW_DOCUMENTS: LawDoc[] = [
  {
    id: "LEY_19886",
    name: "Law 19.886 (Public Procurement)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-19886.pdf",
  },
  {
    id: "LEY_19496",
    name: "Law 19.496 (Consumer Protection)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-19496.pdf",
  },
  {
    id: "LEY_20393",
    name: "Law 20.393 (Corporate Criminal Liability)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-20393.pdf",
  },
  {
    id: "LEY_19913",
    name: "Law 19.913 (Financial Intelligence Unit; AML)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-19913.pdf",
  },
  {
    id: "LEY_21521",
    name: "Law 21.521 (Fintech)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-21521.pdf",
  },
];

/**
 * Gets a law document by its ID
 */
export const getLawById = (id: string): LawDoc | undefined => {
  return LAW_DOCUMENTS.find((law) => law.id === id);
};
