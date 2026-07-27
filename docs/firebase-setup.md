# Firebase-Start für MeepleMeter

## Ziel

Lokale Entwicklung mit Firebase Auth, Firestore, Rollen und späterer Rollensteuerung für den Admin-Bereich.

## Geplantes Datenmodell

```text
users/{uid}
  displayName
  email
  createdAt

groups/{groupId}
  name
  createdBy
  createdAt

groups/{groupId}/members/{uid}
  role: "admin" | "member"
  displayName
  joinedAt

groups/{groupId}/games/{gameId}
  title
  category
  minPlayers
  maxPlayers
  duration
  catalogYear
  expansions

groups/{groupId}/plays/{playId}
  gameId
  game
  date
  participants
  winner
  duration
  note

gameCatalog/{catalogGameId}
  name
  year
  minPlayers
  maxPlayers
  playingTime
```

## Rollen

- `admin`: darf Spiele und Partien löschen, Mitglieder verwalten und später Katalogimporte ausführen.
- `member`: darf Spiele, Partien und eigene Daten lesen/anlegen/bearbeiten.

## Lokale Schritte

1. Firebase-Projekt anlegen.
2. Authentication aktivieren.
3. Firestore aktivieren.
4. Web-App in Firebase anlegen.
5. Werte aus Firebase in `.env.local` nach Vorlage `.env.example` eintragen.
6. `firestore.rules` in Firebase veröffentlichen.

## Hinweis

Die App kann lokal gegen Firebase laufen. Ein Netlify-Deploy ist dafür nicht nötig.
