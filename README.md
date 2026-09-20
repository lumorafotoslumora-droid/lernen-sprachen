# Lernen Sprachen — Karteikarten

Eine kleine Webseite zum Vokabellernen mit Karteikarten in **Slowenisch,
Englisch, Deutsch und Französisch**. Du klickst auf eine Karte, überlegst
im Kopf die Übersetzung, drehst die Karte um und siehst, ob du richtig
lagst. Zu jedem Wort kann man sich die Aussprache anhören lassen.

Reines HTML/CSS/JavaScript — kein Build-Schritt nötig. Läuft direkt im
Browser und lässt sich kostenlos über **GitHub Pages** veröffentlichen.

## Funktionen

- **Karteikarten üben**: Wort in einer Sprache sehen, nachdenken, umdrehen,
  Übersetzung in einer anderen Sprache sehen — beliebige Kombination aus
  Slowenisch 🇸🇮, Englisch 🇬🇧, Deutsch 🇩🇪 und Französisch 🇫🇷 wählbar (mit
  Tauschen-Button ⇄).
- **Aussprache anhören** 🔊 über die Sprachausgabe des Browsers (Web Speech
  API), auf Vorder- und Rückseite der Karte.
- **Eigene Karten anlegen**: Wort in allen vier Sprachen eintragen, dazu
  optional ein Bild (per Bild-URL oder Datei-Upload) und eine Kategorie.
- **Karten verwalten**: durchsuchen, bearbeiten, löschen.
- **Lernfortschritt**: "Ich wusste es" / "Nochmal üben" merkt sich den
  Fortschritt pro Karte (einfaches Leitner-System) und kann Karten nach
  Fälligkeit filtern ("Nur fällige Karten").
- **Kategorie-Filter** (Tiere, Farben, Zahlen, Essen, Verben, …) fürs
  gezielte Üben.
- **Import/Export**: Karten als JSON-Datei sichern oder wieder einspielen,
  sowie Zurücksetzen auf die mitgelieferte Standard-Wortliste (~50 Wörter).
- Tastatursteuerung: `Leertaste` = umdrehen, `→`/`1` = gewusst, `←`/`0` =
  nicht gewusst, `s` = Aussprache anhören.

Alle Daten (eigene Karten, Bilder, Lernfortschritt) werden **nur lokal im
Browser** gespeichert (`localStorage`) — es gibt keinen Server und keine
Datenbank.

## Benutzung

Einfach `index.html` öffnen (lokal per Doppelklick oder über einen
Webserver) — es ist keine Installation nötig.

## Veröffentlichen mit GitHub Pages

1. Dieses Repository nach GitHub pushen.
2. In den Repository-Einstellungen unter **Settings → Pages** die Quelle
   auf **GitHub Actions** stellen (der mitgelieferte Workflow unter
   `.github/workflows/pages.yml` deployt bei jedem Push auf `main`
   automatisch).
3. Nach dem ersten erfolgreichen Deploy ist die Seite unter der von GitHub
   angezeigten URL erreichbar (z. B.
   `https://<benutzername>.github.io/<repo-name>/`).

## Projektstruktur

```
index.html        # Seitenstruktur (Üben / Karten verwalten / Import-Export)
css/style.css      # Styles, Karten-Flip-Animation, Dark-Mode
js/data.js         # Standard-Wortliste (~50 Wörter, 4 Sprachen)
js/app.js          # App-Logik (Üben, Verwalten, Import/Export, Sprachausgabe)
```

## Eigene Wörter/Bilder hinzufügen

Im Tab **"Karten verwalten"** ein Wort in allen vier Sprachen eintragen,
optional eine Kategorie sowie ein Bild (Bild-URL einfügen oder Datei
hochladen) und auf "Karte hinzufügen" klicken. Die Karte erscheint danach
sofort beim Üben.

> Hinweis: Hochgeladene Bilder werden direkt im Browser gespeichert
> (`localStorage`, Kapazität ca. 5 MB). Für viele/große Bilder lieber
> Bild-URLs (z. B. von einem Bildhoster) statt Uploads verwenden.
