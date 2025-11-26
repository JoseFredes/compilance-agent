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
  const result = {};

  for (const law of LAW_DOCS) {
    console.log(`⏬ Descargando ${law.name}...`);
    const res = await fetch(law.url);
    if (!res.ok) {
      console.error(`❌ Error fetching ${law.url}: ${res.status}`);
      continue;
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`📄 Parseando ${law.name}...`);
    try {
      // pdf-parse exports a PDFParse class/constructor
      const PDFParser = pdfParse.PDFParse || pdfParse;

      // Create instance and parse
      let parsed;
      if (typeof PDFParser === 'function') {
        // Try as constructor
        try {
          const parser = new PDFParser();
          parsed = await parser.parse(buffer);
        } catch {
          // Or try as function directly
          parsed = await PDFParser(buffer);
        }
      } else {
        console.error(`❌ Cannot find parser in pdfParse`);
        console.log('Available keys:', Object.keys(pdfParse));
        continue;
      }

      const text = parsed.text.replace(/\r/g, "").trim();
      console.log(`✅ ${law.name}: ${text.length} caracteres`);

      result[law.id] = text;
    } catch (err) {
      console.error(`❌ Error parsing ${law.name}:`, err.message);
      console.error(err.stack);
    }
  }

  await fs.mkdir("src", { recursive: true });

  const out = `/**
 * Texto extraído automáticamente desde los PDFs de las leyes.
 * Generado por scripts/ingest-laws.mjs
 */
export const LAW_TEXT_REAL = ${JSON.stringify(result, null, 2)};
`;

  await fs.writeFile("src/law_text_ingested.ts", out, "utf8");
  console.log("✅ Ingesta completada: src/law_text_ingested.ts");
}

ingest().catch((err) => {
  console.error("❌ Error en ingesta:", err);
  process.exit(1);
});
