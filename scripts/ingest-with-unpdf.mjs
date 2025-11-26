import fs from "fs/promises";
import { extractText } from "unpdf";

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
    try {
      const res = await fetch(law.url);
      if (!res.ok) {
        console.error(`❌ Error fetching ${law.url}: ${res.status}`);
        continue;
      }

      const arrayBuffer = await res.arrayBuffer();

      console.log(`📄 Parseando ${law.name}...`);
      const extracted = await extractText(new Uint8Array(arrayBuffer));

      // unpdf returns text as array or string
      let fullText = "";
      if (Array.isArray(extracted.text)) {
        fullText = extracted.text.join("\n");
      } else if (typeof extracted.text === "string") {
        fullText = extracted.text;
      } else {
        console.log("Text type:", typeof extracted.text);
        console.log("Is array?:", Array.isArray(extracted.text));
        throw new Error("Unexpected text type");
      }

      const cleanText = fullText.replace(/\r/g, "").trim();
      console.log(`✅ ${law.name}: ${cleanText.length} caracteres, ${extracted.totalPages} páginas`);

      result[law.id] = cleanText;
    } catch (err) {
      console.error(`❌ Error processing ${law.name}:`, err.message);
    }
  }

  console.log(`\n📊 Resumen:`);
  console.log(`  Leyes procesadas: ${Object.keys(result).length}/${LAW_DOCS.length}`);
  for (const [id, text] of Object.entries(result)) {
    console.log(`  ${id}: ${text.length.toLocaleString()} caracteres`);
  }

  await fs.mkdir("src", { recursive: true });

  const out = `/**
 * Texto extraído automáticamente desde los PDFs de las leyes.
 * Generado por scripts/ingest-with-unpdf.mjs
 * Fecha: ${new Date().toISOString()}
 */
export const LAW_TEXT_REAL: Record<string, string> = ${JSON.stringify(result, null, 2)} as const;
`;

  await fs.writeFile("src/law_text_ingested.ts", out, "utf8");
  console.log("\n✅ Ingesta completada: src/law_text_ingested.ts");
}

ingest().catch((err) => {
  console.error("❌ Error en ingesta:", err);
  process.exit(1);
});
