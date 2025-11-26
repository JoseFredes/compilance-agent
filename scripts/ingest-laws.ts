import fs from "fs/promises";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const LAW_DOCS = [
  {
    id: "LEY_19886",
    name: "Ley 19.886 (Compras Públicas)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-19886.pdf",
  },
  {
    id: "LEY_19496",
    name: "Ley 19.496 (Protección de los consumidores)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-19496.pdf",
  },
  {
    id: "LEY_20393",
    name: "Ley 20.393 (Responsabilidad penal de personas jurídicas)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-20393.pdf",
  },
  {
    id: "LEY_19913",
    name: "Ley 19.913 (UAF; sujetos obligados y reportes)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-19913.pdf",
  },
  {
    id: "LEY_21521",
    name: "Ley 21.521 (Fintec)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-21521.pdf",
  },
];

async function ingest() {
  const result: Record<string, string> = {};

  for (const law of LAW_DOCS) {
    const res = await fetch(law.url);
    if (!res.ok) {
      console.error(`Error fetching ${law.url}: ${res.status}`);
      continue;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);


    const parse = pdfParse.default || pdfParse;
    const parsed = await parse(buffer);

    const text = parsed.text.replace(/\r/g, "").trim();

    result[law.id] = text;
  }

  await fs.mkdir("src", { recursive: true });

  const out = `export const PRE_INGESTED_LAW_TEXT: Record<string, string> = ${JSON.stringify(
    result,
    null,
    2
  )} as const;
  `;

  await fs.writeFile("src/law_text_ingested.ts", out, "utf8");
}

ingest().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
