# Rheinland Netzwerk Bot

Modularer Discord-Bot für Rheinland Netzwerk. Einstiegspunkt ist die **index.js im Repository-Hauptverzeichnis**. Zielplattform ist Bot-Hosting mit **Node.js 24**. Alle Server-IDs, Rollen, Kanäle und Moduloptionen werden zentral über `.env` konfiguriert.

## Installation auf Bot-Hosting

1. Repository `Netzwerk-Hannover/RheinlandRPSystem` auf Branch `main` verbinden.
2. Runtime auf **Node.js 24** stellen.
3. Startbefehl: `node index.js`. Die Datei `index.js` liegt direkt im Repository-Root.
4. `npm install` ausführen.
5. `.env.example` kopieren und als `.env` speichern. Bot-Token, Client-ID, Guild-ID und die noch fehlenden Rollen-IDs selbst im Hosting eintragen. **Nie einen Bot-Token in GitHub oder in einen Chat kopieren.**
6. Das animierte GIF als `assets/logo.gif` hochladen. `BOT_AVATAR_ON_START=true` lädt es beim Start als Bot-Avatar hoch.
7. Im Discord Developer Portal mindestens Server Members Intent und Message Content Intent einschalten.

Die Bot-Rolle muss über den Rollen liegen, die der Bot verwalten soll. Der Bot braucht abhängig von aktivierten Modulen u. a. Rollen verwalten, Kanäle verwalten, Nachrichten senden/verwalten, Threads erstellen, Audit-Log einsehen, Mitglieder moderieren/kicken/bannen und Voice verbinden/sprechen.

## Ticket-System

Das Panel in `TICKET_PANEL_CHANNEL_ID` bietet fünf Ticketarten:

- **Support:** Roblox-Name, Discord-Name, Betreff und Ticket-Anliegen.
- **HighTeam:** dasselbe Formular, in der HighTeam-Kategorie.
- **Fraktion:** dasselbe Formular, in der Fraktions-Kategorie.
- **Entbannung:** Roblox-Name, Discord-Name, Roblox-ID, Ban-Grund und Entbannungs-Begründung.
- **Leitung:** Anliegen für Owner / Co-Owner; wenn `TICKET_CATEGORY_LEADERSHIP_ID` leer ist, wird die Leitungskategorie beim ersten Leitungsticket automatisch erstellt; alternativ kann ihre bestehende Kategorie-ID dort eingetragen werden.

Jede Ticketart kann eigene Teamrollen erhalten (`TICKET_*_ROLE_IDS`). Ein Teammitglied kann ein Ticket übernehmen. Beim Schließen wird ein Transcript erzeugt und der Nutzer erhält eine Sternebewertung per DM. Die Bewertung wird mit dem tatsächlichen Bearbeiter protokolliert.

## Module

Alle Module liegen einzeln unter `src/modules/` und werden automatisch geladen: Bewerbungen, Autorollen, Blacklist, Bot-DMs/IC-Rechte, Boosts, Bugs, Leitstelle/Einsätze, FAQ-Forum, Fraktionen, Hilfe, Einführung, Server-/Discord-/Team-Logs, Moderation, Zeitung, Regelwerke, Safezones, Anti-Raid/Anti-Nuke/Anti-Spam/Honeypot, Selfroles, Server-Code, Schichtsystem, Vorschläge, Support-Ping, Teamliste, Teamverwaltung, Team-Besprechung, Tickets, Verify, 24/7-Voice, Willkommen/Verlassen.

## Kanäle aus deiner aktuellen Zuordnung

Die neuen Kanal-IDs sind in `.env.example` hinterlegt. Nicht gelieferte IDs (insbesondere Rollen, Token, Client-ID, Guild-ID, Teamliste, Einsatzkanal und Leitungskategorie) sind absichtlich leer.

## Speicherung

Die Datenbank liegt in `DATA_DIR/rheinland-data.json`. Auf Bot-Hosting muss `DATA_DIR` auf einen dauerhaft gespeicherten Pfad zeigen, damit Bewerbungen, Tickets, Schichten, Fraktionen, Feedback und weitere Daten Deployments und Neustarts überstehen.

## Slash-Commands

Slash-Commands werden beim Start aus den Modulen registriert. Ist `GUILD_ID` gesetzt, werden sie direkt für diesen Server registriert. Es gibt absichtlich keine Settings-Slash-Commands; Einstellungen erfolgen zentral über `.env`.

## Prüfung

`npm run check` prüft die JavaScript-Syntax und die grundlegende Exportstruktur aller Module. Ein echter Gateway-, Rollen- und Berechtigungstest benötigt die Pakete und einen gültigen Token in der Hosting-Umgebung.
