# Rheinland Netzwerk Bot

Modularer Discord-Bot für Rheinland Netzwerk. Einstiegspunkt ist die **`index.js` im Repository-Hauptverzeichnis**. Zielplattform ist Bot-Hosting mit **Node.js 24**. Alle Server-IDs, Rollen, Kanäle und Moduloptionen werden zentral über `.env` konfiguriert. Embeds verwenden keine gesetzte Farbleiste; das Layout bleibt einheitlich und schlicht.

## Installation auf Bot-Hosting

1. Repository `Netzwerk-Hannover/RheinlandRPSystem` auf den Branch `main` laden bzw. verbinden.
2. Runtime auf **Node.js 24** stellen.
3. Startdatei / Startbefehl auf `node index.js` setzen. Die Datei `index.js` liegt direkt im Root.
4. `npm install` ausführen.
5. `.env.example` als `.env` übernehmen und Bot-Token, Application-ID, Server-ID sowie die noch offenen Kanal- und Rollen-IDs eintragen.
6. Die GIF-Datei im Dateimanager als `assets/logo.gif` hochladen. `BOT_AVATAR_ON_START=true` aktiviert den Avatar-Upload beim Start. Der Discord-Endpunkt kann Avatar-Änderungen abhängig von den Bot-/Anwendungsrechten und Rate-Limits ablehnen; der Bot startet bei einem solchen Fehler trotzdem.
7. Bot im Discord Developer Portal mit den erforderlichen Intents aktivieren und mit den benötigten Berechtigungen einladen.

### Erforderliche Discord-Einstellungen

Im Developer Portal müssen mindestens **Server Members Intent** und **Message Content Intent** eingeschaltet werden. Der Bot benötigt je nach aktivierten Modulen unter anderem Rollen verwalten, Kanäle verwalten, Nachrichten senden/verwalten, Threads erstellen/verwalten, Nachrichtenverlauf lesen, Mitglieder moderieren, Mitglieder kicken/bannen, Audit-Log einsehen und Voice verbinden/sprechen.

Die Bot-Rolle muss über den Rollen liegen, die er vergeben oder entfernen soll. Kategorien, Kanäle, Rollen und IDs müssen zum richtigen Discord-Server gehören.

## Module

Alle Module liegen einzeln unter `src/modules/` und werden beim Start automatisch geladen:

| Datei | Funktion |
|---|---|
| `applications.js` | Team- und Fraktionsbewerbungen, Formular, DM-Bestätigung und Bewerbungs-Logs |
| `autoroles.js` | Mehrere Autorollen beim Serverbeitritt |
| `blacklist.js` | Blacklist verwalten, prüfen und gelistete Mitglieder beim Beitritt bannen |
| `bot-dms.js` | Team-DMs und IC-Rechte-Anfragen direkt an die konfigurierte Projektleitung |
| `boosts.js` | Server-Boost-Nachrichten |
| `bugs.js` | Bug-Formular, Team-Ping und automatischer Thread |
| `dispatch.js` | Leitstelle und Einsätze für Polizei, Feuerwehr, HARS, Tuningwerkstatt, Autohaus und Krankenhaus |
| `faq.js` | FAQ im Forum mit vorbereiteten Fragen und `/faq` |
| `factions.js` | Fraktionsverwaltung, Fraktionsliste, News, DM-Fraktionsbeantragung und Speicherung |
| `help.js` | `/help`-Übersicht |
| `introduction.js` | automatische Einführung / Onboarding |
| `logs.js` | Discord-, Server-, Team-, Nachrichten-, Rollen-, Kanal-, Ban- und Voice-Logs |
| `moderation.js` | Warn, Timeout, Kick, Ban, Purge und Slowmode |
| `newspaper.js` | Zeitungsartikel mit Bild-Upload und optionalem Rollen-Ping |
| `rules.js` | Discord-, Ingame-, Team- und Content-Creator-Regelwerke |
| `safezones.js` | Safezone-Hinweise und Verwaltung |
| `security.js` | Anti-Raid, Anti-Nuke, Anti-Spam, Wortfilter und Honeypot |
| `selfroles.js` | konfigurierbare Selfroles per Buttons |
| `server-info.js` | Server-Code, Voraussetzungen und wichtige Informationen |
| `shifts.js` | Einstempeln, Ausstempeln, Zeiterfassung, Teamübersicht per `/schichtliste` und automatisches Ausstempeln nach 3 Stunden |
| `suggestions.js` | Vorschläge mit automatisch erzeugtem Thread und Upvotes |
| `support-ping.js` | Support-Rollen-Ping mit Cooldown |
| `team.js` | Teamliste, höchste Teamrolle pro Person |
| `team-management.js` | Uprank, Downrank, Teamwarnungen, Kick und Rollenverwaltung |
| `team-meetings.js` | automatische Erinnerung zur Teambesprechung freitags um 18:00 Uhr (Europe/Berlin) |
| `tickets.js` | Tickets, private Kanäle, Schließen, Sterne-Feedback und Bearbeiter-Log |
| `verify.js` | Verifizierungs-Panel und Rollenvergabe |
| `voice247.js` | 24/7-Voice-Raum mit Stille-Audio |
| `welcome.js` | Willkommen und Verlassen |

Gemeinsame Hilfsfunktionen, Datenbank und Design liegen unter `src/core/`.

## Speicherung

Die Datenbank wird als JSON-Datei atomar nach `DATA_DIR/rheinland-data.json` geschrieben. Fraktionen, Bewerbungen, Tickets, Schichtzeiten, Feedback, Vorschläge, Bugreports, Warnungen, Blacklist, Panel-IDs und weitere Zustände bleiben bei Neustarts erhalten. Auf Bot-Hosting muss `DATA_DIR` auf einen **dauerhaft gespeicherten** Ordner zeigen, falls die Plattform das Dateisystem bei Deployments zurücksetzt.

## Wichtige Konfiguration

Die vollständige Variablenliste steht in `.env.example`. Besonders wichtig:

- `DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`
- `BOT_OWNER_IDS`, `ADMIN_ROLE_IDS`, `MANAGEMENT_ROLE_IDS`, `TEAM_ROLE_IDS`, `TEAM_HIERARCHY_ROLE_IDS`
- `*_CHANNEL_ID` und `*_ROLE_ID` für die jeweiligen Module
- `BOT_AVATAR_PATH`, `BOT_AVATAR_ON_START`
- `DATA_DIR`
- `ANTI_SPAM_*`, `ANTI_RAID_*`, `ANTI_NUKE_*`, `BLACKLIST_AUTO_BAN`, `HONEYPOT_CHANNEL_IDS`, `BAD_WORDS`
- `SERVER_CODE`, `SERVER_JOIN_LINK`, `TEAM_REQUIREMENTS`, `TEAM_MEETING_CHANNEL_ID`

Für `TEAM_HIERARCHY_ROLE_IDS` gilt: **höchste Rolle zuerst**, niedrigste Rolle zuletzt. `AUTOROLE_IDS` und `SELFROLE_OPTIONS` sind kommaseparierte Listen. `SELFROLE_OPTIONS` verwendet das Format `Anzeigename|ROLE_ID,Anzeigename|ROLE_ID`.

`ANTI_NUKE_ACTION` steht standardmäßig auf `log`. Automatisches Bannen von mutmaßlichen Ausführenden sollte erst nach einem Test mit den tatsächlichen Audit-Log-Berechtigungen aktiviert werden.

## Slash-Commands

Slash-Commands werden beim Bot-Start aus den einzelnen Modulen registriert. Ist `GUILD_ID` gesetzt, werden sie direkt für diesen Server registriert. Ohne `GUILD_ID` erfolgt eine globale Registrierung, deren Verfügbarkeit bei Discord länger dauern kann. Es gibt absichtlich keine Settings-Slash-Commands; die Konfiguration erfolgt über `.env`.

## Prüfung

`npm run check` prüft die JavaScript-Syntax der Startdatei und aller 29 Module sowie deren grundlegende Exportstruktur. Der Check benötigt keine installierten Discord-Pakete. Ein echter Gateway-, Rollen- und Berechtigungs-Test ist erst nach `npm install` mit gültigem Bot-Token in einem Testserver möglich.

## Discord-Richtlinien

Das Discord-Regelwerk verlinkt die offiziellen Seiten: [Terms of Service](https://discord.com/terms), [Privacy Policy](https://discord.com/privacy), [Community Guidelines](https://discord.com/guidelines), [Developer Terms of Service](https://discord.com/developers/docs/policies-and-agreements/developer-terms-of-service) und [Developer Policy](https://discord.com/developers/docs/policies-and-agreements/developer-policy).
