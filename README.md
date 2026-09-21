# Lernen Sprachen — Karteikarten

Eine Webseite zum Vokabellernen mit Karteikarten in **Slowenisch, Englisch,
Deutsch und Französisch**. Du klickst auf eine Karte, überlegst im Kopf die
Übersetzung, drehst die Karte um und siehst, ob du richtig lagst. Zu jedem
Wort kann man sich die Aussprache anhören lassen.

Jeder Nutzer hat ein **eigenes Konto** (Registrieren/Anmelden) — die Karten
und der Lernfortschritt werden auf einem **Server mit Datenbank**
gespeichert, nicht nur lokal im Browser.

## Funktionen

- **Login/Registrierung**: eigenes Konto per E-Mail + Passwort, Passwörter
  werden gehasht gespeichert (bcrypt), Anmeldung über ein sicheres
  HTTP-only-Cookie.
- **Karteikarten üben**: Wort in einer Sprache sehen, nachdenken, umdrehen,
  Übersetzung in einer anderen Sprache sehen — beliebige Kombination aus
  Slowenisch 🇸🇮, Englisch 🇬🇧, Deutsch 🇩🇪 und Französisch 🇫🇷 wählbar (mit
  Tauschen-Button ⇄).
- **Aussprache anhören** 🔊 über die Sprachausgabe des Browsers (Web Speech
  API), auf Vorder- und Rückseite der Karte.
- **Eigene Karten anlegen**: Wort in allen vier Sprachen eintragen, dazu
  optional ein Bild (per Bild-URL oder Datei-Upload) und eine Kategorie.
- **Karten verwalten**: durchsuchen, bearbeiten, löschen — jeder Nutzer sieht
  nur seine eigenen Karten.
- **Lernfortschritt**: "Ich wusste es" / "Nochmal üben" merkt sich den
  Fortschritt pro Karte (einfaches Leitner-System) und kann Karten nach
  Fälligkeit filtern ("Nur fällige Karten").
- **Kategorie-Filter** (Tiere, Farben, Zahlen, Essen, Verben, …) fürs
  gezielte Üben.
- **Import/Export**: Karten als JSON-Datei sichern oder wieder einspielen,
  sowie Zurücksetzen auf die mitgelieferte Standard-Wortliste (~50 Wörter).
- Tastatursteuerung: `Leertaste` = umdrehen, `→`/`1` = gewusst, `←`/`0` =
  nicht gewusst, `s` = Aussprache anhören.

Bei der Registrierung bekommt jedes Konto zunächst nur 2 Beispielkarten, um
das Prinzip zu zeigen — die volle Standard-Wortliste (~50 Wörter) lässt sich
jederzeit über "Zurücksetzen auf Standard" im Tab Import/Export laden.

## Architektur

- **Backend**: Node.js + Express (`server/`), REST-API unter `/api/...`.
- **Datenbank**: PostgreSQL (Nutzer, Karten, Lernfortschritt).
- **Auth**: E-Mail/Passwort, Passwort-Hashing mit bcrypt, Sitzungen als
  signiertes JWT in einem `httpOnly`-Cookie.
- **Frontend**: reines HTML/CSS/JavaScript (`public/`), wird vom selben
  Express-Server ausgeliefert.

```
server/
  index.js          # Express-Server, liefert API + Frontend aus
  db.js              # PostgreSQL-Verbindung & Tabellen-Setup
  auth.js            # Cookie/JWT-Hilfsfunktionen
  defaultCards.js    # Standard-Wortliste (~50 Wörter, 4 Sprachen)
  routes/
    auth.js          # /api/auth/register, /login, /logout, /me
    cards.js         # /api/cards (CRUD), Import/Export, Lernfortschritt
public/
  index.html          # Login/Registrierung + App-Oberfläche
  css/style.css        # Styles, Karten-Flip-Animation, Dark-Mode
  js/app.js            # Frontend-Logik (spricht mit der API)
```

## Lokal ausführen

Voraussetzungen: Node.js (≥ 18) und eine PostgreSQL-Datenbank.

```bash
npm install
cp .env.example .env
# .env anpassen: DATABASE_URL auf deine Postgres-Datenbank zeigen lassen,
# JWT_SECRET auf einen langen Zufallswert setzen
npm start
```

Danach ist die Seite unter `http://localhost:3000` erreichbar (Port über
`PORT` in `.env` änderbar).

Für die Entwicklung mit automatischem Neustart bei Codeänderungen:

```bash
npm run dev
```

## Deployment auf Render (kostenlos)

1. Dieses Repository nach GitHub pushen.
2. Auf [render.com](https://render.com) einloggen (oder Konto erstellen) und
   **New → Blueprint** wählen, dann dieses Repository auswählen. Render
   erkennt automatisch die mitgelieferte `render.yaml` und legt sowohl den
   Web-Service als auch eine kostenlose PostgreSQL-Datenbank an
   (`DATABASE_URL` und ein zufälliger `JWT_SECRET` werden automatisch
   gesetzt).
3. Alternativ manuell: **New → Web Service** (Build: `npm install`, Start:
   `npm start`) plus **New → PostgreSQL** anlegen und die
   `Internal Database URL` als `DATABASE_URL`-Umgebungsvariable beim
   Web-Service eintragen, dazu selbst einen `JWT_SECRET` setzen.
4. Nach dem ersten Deploy ist die Seite unter der von Render vergebenen URL
   erreichbar.

> Hinweis: Render-Datenbanken im kostenlosen Tarif laufen zeitlich befristet
> (aktuell 90 Tage) und müssen danach ggf. erneuert werden — für ein
> dauerhaftes/produktives Projekt später auf einen bezahlten Datenbank-Tarif
> wechseln.

## Eigene Wörter/Bilder hinzufügen

Im Tab **"Karten verwalten"** ein Wort in allen vier Sprachen eintragen,
optional eine Kategorie sowie ein Bild (Bild-URL einfügen oder Datei
hochladen) und auf "Karte hinzufügen" klicken. Die Karte erscheint danach
sofort beim Üben.

> Hinweis: Hochgeladene Bilder werden als Text (Base64) in der Datenbank
> gespeichert (max. ca. 2 MB pro Bild). Für viele/große Bilder lieber
> Bild-URLs (z. B. von einem Bildhoster) statt Uploads verwenden.
