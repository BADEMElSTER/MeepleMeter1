# MeepleMeter

React-App für private Brettspielrunden: Sammlung verwalten, Partien tracken und Statistiken auswerten.

## Lokal ansehen

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Spielekatalog importieren

Der zentrale Katalog liegt in `src/data/gameCatalog.js`. Für echte Top-500-Daten wird eine vorbereitete CSV/JSON-Quelle genutzt und anschließend über die BGG-XML-API mit Spielerzahl, Spielzeit, Bild, Bewertung und Erweiterungen angereichert.

1. CSV als `data/bgg-top500.csv` ablegen. Vorlage: `data/bgg-top500.example.csv`
2. Import starten:

```bash
npm run catalog:import
```

Alternativ kann eine Quelle direkt angegeben werden:

```bash
node scripts/import-game-catalog.cjs --source=data/bgg-top500.csv --limit=500
node scripts/import-game-catalog.cjs --source=https://example.com/bgg-top500.csv --limit=500
```

Erwartete Mindestspalten: `rank,bggId,name`. Unterstützt werden außerdem `year` und `rating`. Bestehende Spieler, Spiele, Partien und Ergebnisse bleiben unberührt, weil nur der statische Katalog ersetzt wird.

## Netlify

Die Seite ist für Netlify vorbereitet:

- Build command: `npm run build`
- Publish directory: `dist`
- Konfiguration: `netlify.toml`
