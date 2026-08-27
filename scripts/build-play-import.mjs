import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const sourcePath = "C:/Users/b_wan/.codex/attachments/79e02505-7b0c-4127-a112-2dc05d26e1ad/pasted-text.txt";
const placementSourcePath = "C:/Users/b_wan/.codex/attachments/e6e3aee2-40b2-41bb-a9f8-62d771b04a1e/pasted-text.txt";
const outputDir = "C:/Users/b_wan/OneDrive/Documents/MeepleMeter/outputs/spielpartien-import";
const workbookPath = path.join(outputDir, "gespielte-partien-import-mit-platzierungen.xlsx");
const csvPath = path.join(outputDir, "gespielte-partien-upload-mit-platzierungen.csv");
const canonicalTitles = new Set([
  "6 nimmt!", "Arche Nova", "Architekten des Westfrankenreiches", "Die verlorenen Ruinen von Arnak",
  "Beast", "Captain Sonar", "Clank!", "Cryptid", "Die weiße Burg", "Dinogenics", "Dune: Imperium",
  "Eclipse – Second Dawn for the Galaxy", "Evenfall", "Everdell", "Evil Corp.", "Faraway", "Flügelschlag",
  "Fractured Sky", "Frantic", "Grab dich frei", "Human Punishment", "Der Kartograph", "Machi Koro",
  "Mindbug", "Mischwald", "Moonrakers", "Mythic Battles: Pantheon", "Nemesis", "Peak Oil", "Pest",
  "Power Plants", "Rebirth", "Robo Rally", "Roll for the Galaxy", "Root", "Scythe", "7 Wonders",
  "Skymines", "Terraforming Mars", "The Vale of Eternity", "Tyrannen des Unterreichs",
  "Valeria – Königreich der Karten", "Vollpfosten", "Worms – The Board Game", "Eine wundervolle Welt",
]);
const titleMap = new Map([
  ["Kartograf", "Der Kartograph"],
  ["Architekten des Westfrankenreich", "Architekten des Westfrankenreiches"],
  ["Arnak", "Die verlorenen Ruinen von Arnak"],
  ["Dune", "Dune: Imperium"],
  ["Eclipse", "Eclipse – Second Dawn for the Galaxy"],
  ["Evil Corp", "Evil Corp."],
  ["Evel Corp.", "Evil Corp."],
  ["Forest Shuffle", "Mischwald"],
  ["Seven Wonders", "7 Wonders"],
  ["The Vale of Eterity", "The Vale of Eternity"],
  ["Valeria", "Valeria – Königreich der Karten"],
  ["Worms", "Worms – The Board Game"],
  ["Wundervolle Welt", "Eine wundervolle Welt"],
  ["6nimmt", "6 nimmt!"],
]);

const raw = (await fs.readFile(sourcePath, "utf8")).replace(/^\uFEFF/, "");
const lines = raw.split(/\r?\n/).filter((line) => line.trim());
const placementRaw = (await fs.readFile(placementSourcePath, "utf8")).replace(/^\uFEFF/, "");
const plays = [];
let current = null;

for (const line of lines.slice(1)) {
  const [gameCell = "", dateCell = "", playerCell = "", scoreCell = ""] = line.split("\t");
  const originalGame = gameCell.trim();
  const game = titleMap.get(originalGame) ?? originalGame;
  const date = dateCell.trim();
  const player = playerCell.trim();
  const scoreText = scoreCell.trim();

  if (game) {
    current = { game, date: germanToIso(date), participants: [] };
    plays.push(current);
  }
  if (!current || !player) continue;
  current.participants.push({
    name: player,
    score: scoreText === "" ? null : Number(scoreText.replace(",", ".")),
  });
}

const placementGroups = new Map();
let currentPlacement = null;
for (const line of placementRaw.split(/\r?\n/).filter((entry) => entry.trim())) {
  const [gameCell = "", dateCell = "", playerCell = "", , placementCell = ""] = line.split("\t");
  const originalGame = gameCell.trim();
  if (originalGame) {
    const game = titleMap.get(originalGame) ?? originalGame;
    const date = germanToIso(dateCell.trim());
    currentPlacement = { game, date, participants: new Map() };
    const key = `${game}|${date}`;
    const groupsForKey = placementGroups.get(key) ?? [];
    groupsForKey.push(currentPlacement);
    placementGroups.set(key, groupsForKey);
  }
  const player = playerCell.trim();
  if (currentPlacement && player) {
    const value = placementCell.trim() === "" ? null : Number(placementCell.trim().replace(",", "."));
    currentPlacement.participants.set(player, value);
  }
}

for (const play of plays) {
  const hasRegularScores = play.participants.every((p) => Number.isFinite(p.score));
  if (hasRegularScores) {
    play.scoringMode = "high";
  } else {
    play.scoringMode = "low";
    const placementGroup = (placementGroups.get(`${play.game}|${play.date}`) ?? []).find((group) =>
      [...group.participants.values()].some((value) => Number.isFinite(value) && value > 0),
    );
    if (!placementGroup) throw new Error(`Keine Platzierungsgruppe für ${play.game} am ${play.date}`);
    const rawPlacements = play.participants.map((p) => placementGroup.participants.get(p.name));
    const positivePlacements = rawPlacements.filter((value) => Number.isFinite(value) && value > 0);
    if (!positivePlacements.length) throw new Error(`Keine Platzierungen für ${play.game} am ${play.date}`);
    const fallbackPlacement = Math.max(...positivePlacements) + 1;
    for (const [index, participant] of play.participants.entries()) {
      const placement = rawPlacements[index];
      participant.score = Number.isFinite(placement) && placement > 0
        ? placement
        : fallbackPlacement;
    }
  }
  const reducer = play.scoringMode === "low"
    ? (best, p) => (p.score < best.score ? p : best)
    : (best, p) => (p.score > best.score ? p : best);
  play.winner = play.participants.reduce(reducer).name;
  play.participantText = play.participants
    .map((p) => `${p.name}:${String(p.score)}`)
    .join("|");
}

const unmatchedTitles = [...new Set(plays.map((play) => play.game).filter((title) => !canonicalTitles.has(title)))];
if (unmatchedTitles.length) {
  throw new Error(`Nicht abgeglichene Spieltitel: ${unmatchedTitles.join(", ")}`);
}

function germanToIso(value) {
  const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return value;
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

await fs.mkdir(outputDir, { recursive: true });
const headers = ["game", "date", "duration", "scoringMode", "participants", "winner"];
const csvRows = [headers, ...plays.map((p) => [p.game, p.date, "", p.scoringMode, p.participantText, p.winner])];
const csv = "\uFEFF" + csvRows.map((row) => row.map(csvEscape).join(";")).join("\r\n") + "\r\n";
await fs.writeFile(csvPath, csv, "utf8");

const workbook = Workbook.create();
const sheet = workbook.worksheets.add("Upload");
sheet.showGridLines = false;
sheet.getRange(`A1:F${plays.length + 1}`).values = csvRows;
sheet.freezePanes.freezeRows(1);
sheet.getRange("A1:F1").format = {
  fill: "#245B4A",
  font: { bold: true, color: "#FFFFFF" },
  rowHeight: 24,
  verticalAlignment: "center",
};
sheet.getRange(`A2:F${plays.length + 1}`).format = {
  font: { color: "#1F2937" },
  verticalAlignment: "center",
};
sheet.getRange(`A1:F${plays.length + 1}`).format.borders = {
  insideHorizontal: { style: "thin", color: "#D8E2DD" },
  bottom: { style: "thin", color: "#AFC4BA" },
};
sheet.getRange(`B2:B${plays.length + 1}`).setNumberFormat("@");
sheet.getRange(`C2:C${plays.length + 1}`).setNumberFormat("0");
sheet.getRange(`A1:F${plays.length + 1}`).format.autofitColumns();
sheet.getRange("A:A").format.columnWidth = 31;
sheet.getRange("B:B").format.columnWidth = 14;
sheet.getRange("C:D").format.columnWidth = 15;
sheet.getRange("E:E").format.columnWidth = 72;
sheet.getRange("F:F").format.columnWidth = 18;

const readme = workbook.worksheets.add("Hinweise");
readme.showGridLines = false;
readme.getRange("A1:F1").merge();
readme.getRange("A1").values = [["Importhinweise"]];
readme.getRange("A1:F1").format = {
  fill: "#245B4A",
  font: { bold: true, color: "#FFFFFF", size: 16 },
  rowHeight: 32,
  verticalAlignment: "center",
};
readme.getRange("A3:B7").values = [
  ["Partien", plays.length],
  ["Punktewertung (high)", plays.filter((p) => p.scoringMode === "high").length],
  ["Platzierung (low)", plays.filter((p) => p.scoringMode === "low").length],
  ["duration", "absichtlich leer"],
  ["scoringMode", "high für Punkte, low für Platzierungen"],
];
readme.getRange("A3:A7").format = { fill: "#E8F1ED", font: { bold: true, color: "#245B4A" } };
readme.getRange("A3:B7").format.borders = { preset: "outside", style: "thin", color: "#AFC4BA" };
readme.getRange("A9:F10").merge(true);
readme.getRange("A9").values = [["Für den Upload in der App die CSV-Datei verwenden. Fehlende Punkte wurden durch Platzierungen ergänzt; bei low gewinnt die niedrigste Platzierung. Fehlende oder als 0 angegebene Verlierer-Platzierungen wurden hinter die höchste vorhandene Platzierung gesetzt."]];
readme.getRange("A9:F10").format = { fill: "#FFF6D8", font: { color: "#5C4813" }, wrapText: true, verticalAlignment: "center" };
readme.getRange("A:F").format.columnWidth = 17;
readme.getRange("A:A").format.columnWidth = 22;

const check = await workbook.inspect({ kind: "table", range: `Upload!A1:F${Math.min(plays.length + 1, 12)}`, include: "values,formulas", tableMaxRows: 12, tableMaxCols: 6 });
console.log(check.ndjson);
const errors = await workbook.inspect({ kind: "match", searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A", options: { useRegex: true, maxResults: 50 }, summary: "final formula error scan" });
console.log(errors.ndjson);

for (const [sheetName, range, previewName] of [
  ["Upload", `A1:F${Math.min(plays.length + 1, 18)}`, "preview-upload.png"],
  ["Hinweise", "A1:F10", "preview-hinweise.png"],
]) {
  const preview = await workbook.render({ sheetName, range, scale: 1.5, format: "png" });
  await fs.writeFile(path.join(outputDir, previewName), new Uint8Array(await preview.arrayBuffer()));
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);
console.log(JSON.stringify({ workbookPath, csvPath, plays: plays.length, high: plays.filter((p) => p.scoringMode === "high").length, low: plays.filter((p) => p.scoringMode === "low").length, unmatchedTitles }));
