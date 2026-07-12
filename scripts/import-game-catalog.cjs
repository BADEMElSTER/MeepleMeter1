const fs = require("fs");
const path = require("path");

const DEFAULT_SOURCE = path.join("data", "bgg-top500.csv");
const OUTPUT_FILE = path.join("src", "data", "gameCatalog.js");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getArg(name) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : null;
}

function decodeHtml(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&ndash;/g, "\u2013")
    .replace(/&mdash;/g, "\u2014")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      fields.push(field.trim());
      field = "";
    } else {
      field += character;
    }
  }

  fields.push(field.trim());
  return fields;
}

function parseCsv(content) {
  const lines = content
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => normalizeHeader(header));

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((entry, header, index) => {
      entry[header] = values[index] ?? "";
      return entry;
    }, {});
  });
}

function normalizeHeader(header) {
  const normalized = String(header).trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  const aliases = {
    objectid: "bggId",
    bggid: "bggId",
    id: "bggId",
    gameid: "bggId",
    title: "name",
    name: "name",
    rank: "rank",
    boardgamerank: "rank",
    year: "year",
    yearpublished: "year",
    average: "rating",
    rating: "rating",
    geekrating: "rating",
    bayesaverage: "rating",
  };

  return aliases[normalized] ?? normalized;
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function normalizeSourceEntry(entry) {
  const bggId = toNumber(entry.bggId);
  const name = String(entry.name ?? "").trim();

  if (!name && !bggId) return null;

  return {
    bggId,
    name,
    rank: toNumber(entry.rank),
    year: toNumber(entry.year),
    rating: toNumber(entry.rating),
  };
}

function uniqueEntries(entries) {
  const seen = new Set();

  return entries.filter((entry) => {
    const key = entry.bggId ? `bgg:${entry.bggId}` : `name:${entry.name.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function readSource(source) {
  if (/^https?:\/\//i.test(source)) {
    const response = await fetch(source, {
      headers: { "user-agent": "MeepleMeter catalog import" },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} for ${source}`);
    }

    return response.text();
  }

  return fs.readFileSync(source, "utf8");
}

function parseSource(content, source) {
  const trimmed = content.trim();
  const rawEntries =
    source.endsWith(".json") || trimmed.startsWith("[")
      ? JSON.parse(trimmed)
      : parseCsv(trimmed);

  if (!Array.isArray(rawEntries)) {
    throw new Error("Catalog source must contain an array or CSV rows.");
  }

  return uniqueEntries(rawEntries.map(normalizeSourceEntry).filter(Boolean));
}

function getXmlValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*value="([^"]*)"`));
  return match ? decodeHtml(match[1]) : null;
}

function getNumberValue(xml, tag) {
  return toNumber(getXmlValue(xml, tag));
}

function getPrimaryName(xml) {
  const match = xml.match(/<name type="primary"[^>]*value="([^"]+)"/);
  return match ? decodeHtml(match[1]) : null;
}

function getImage(xml) {
  const match = xml.match(/<image>([^<]+)<\/image>/);
  return match ? decodeHtml(match[1]) : null;
}

function getExpansions(xml) {
  return [...xml.matchAll(/<link type="boardgameexpansion"[^>]*value="([^"]+)"/g)].map((match) => ({
    name: decodeHtml(match[1]),
  }));
}

function chunk(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function toId(name, bggId) {
  const slug = String(name)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return bggId ? `${slug}-${bggId}` : slug;
}

async function fetchBggDetails(entries) {
  const entriesWithBggId = entries.filter((entry) => entry.bggId);
  const details = new Map();

  for (const group of chunk(entriesWithBggId, 20)) {
    const ids = group.map((entry) => entry.bggId).join(",");
    console.log(`Fetching BGG details for ${ids}`);
    const response = await fetch(`https://boardgamegeek.com/xmlapi2/thing?id=${ids}&stats=1`, {
      headers: { "user-agent": "MeepleMeter catalog import" },
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText} while loading BGG details`);
    }

    const xml = await response.text();
    const itemXmls = xml.split(/<item /).slice(1).map((item) => `<item ${item}`);

    for (const itemXml of itemXmls) {
      const idMatch = itemXml.match(/<item[^>]*id="(\d+)"/);
      if (idMatch) details.set(Number(idMatch[1]), itemXml);
    }

    await sleep(1500);
  }

  return details;
}

function buildCatalogEntry(sourceEntry, xml) {
  const minPlayTime = getNumberValue(xml, "minplaytime");
  const maxPlayTime = getNumberValue(xml, "maxplaytime");
  const playingTimeNumber = getNumberValue(xml, "playingtime");
  const name = sourceEntry.name || getPrimaryName(xml);

  let playingTime = null;
  if (minPlayTime && maxPlayTime && minPlayTime !== maxPlayTime) {
    playingTime = `${minPlayTime}\u2013${maxPlayTime} Min.`;
  } else if (playingTimeNumber || minPlayTime || maxPlayTime) {
    playingTime = `${playingTimeNumber ?? minPlayTime ?? maxPlayTime} Min.`;
  }

  return {
    id: toId(name, sourceEntry.bggId),
    bggId: sourceEntry.bggId,
    name,
    year: getNumberValue(xml, "yearpublished") ?? sourceEntry.year,
    minPlayers: getNumberValue(xml, "minplayers"),
    maxPlayers: getNumberValue(xml, "maxplayers"),
    minPlayTime,
    maxPlayTime,
    playingTime,
    rank: sourceEntry.rank,
    rating:
      sourceEntry.rating ??
      (getNumberValue(xml, "average") ? Math.round(getNumberValue(xml, "average") * 10) / 10 : null),
    image: getImage(xml),
    expansions: getExpansions(xml),
  };
}

async function main() {
  const source = getArg("source") ?? DEFAULT_SOURCE;
  const limit = toNumber(getArg("limit")) ?? 500;

  if (!fs.existsSync(source) && !/^https?:\/\//i.test(source)) {
    throw new Error(
      `Missing catalog source "${source}". Create it as CSV/JSON or pass --source=https://...`,
    );
  }

  const sourceContent = await readSource(source);
  const sourceEntries = parseSource(sourceContent, source)
    .sort((first, second) => (first.rank ?? 999999) - (second.rank ?? 999999))
    .slice(0, limit);

  console.log(`Loaded ${sourceEntries.length} source entries`);
  const details = await fetchBggDetails(sourceEntries);

  const catalog = sourceEntries
    .map((entry) => buildCatalogEntry(entry, details.get(entry.bggId) ?? ""))
    .filter((entry) => entry.name)
    .map((entry, index) => ({ ...entry, rank: entry.rank ?? index + 1 }));

  const output = `export const gameCatalog = ${JSON.stringify(catalog, null, 2)};\n`;
  fs.writeFileSync(OUTPUT_FILE, output, "utf8");
  console.log(`Wrote ${catalog.length} catalog entries to ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
