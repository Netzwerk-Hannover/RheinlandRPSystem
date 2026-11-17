import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { env } from '../core/config.js';
import { brandedEmbed } from '../core/brand.js';

const channel = (key, fallback) => env(key) ? '<#' + env(key) + '>' : fallback;

const questions = [
  [
    'Wie trete ich dem Rheinland-Netzwerk-Server bei?',
    'Öffne zuerst Roblox und starte das passende Spiel. Wechsle dort in den Bereich für private Server beziehungsweise „Join by Code“. Trage den aktuellen Code aus ' + channel('SERVER_INFO_CHANNEL_ID', '#server-informationen') + ' ein und bestätige den Beitritt. Achte darauf, dass du den Code vollständig und ohne zusätzliche Leerzeichen übernimmst. Falls der Code nicht funktioniert, prüfe zuerst, ob er aktualisiert wurde. Bei anhaltenden Problemen kannst du ein Ticket in ' + channel('TICKET_PANEL_CHANNEL_ID', '#tickets') + ' eröffnen.'
  ],
  [
    'Wie funktioniert die Verifizierung?',
    'Öffne ' + channel('VERIFY_CHANNEL_ID', '#verify') + ' und starte dort die Sicherheitsprüfung. Der Bot zeigt dir ein Bild mit einem sechsstelligen CAPTCHA-Code. Gib den Code über „Code eingeben“ ein. Nach erfolgreicher Prüfung erhältst du automatisch die Verifizierungsrolle und die freigeschalteten Serverbereiche. Der Code ist nur fünf Minuten gültig. Bei drei falschen Eingaben musst du fünf Minuten warten und danach ein neues Captcha starten.'
  ],
  [
    'Wo finde ich die Regelwerke?',
    'Die Regeln sind getrennt nach ihrem Zweck veröffentlicht: Das Ingame-Regelwerk findest du in ' + channel('RULES_INGAME_CHANNEL_ID', '#ingame-regeln') + ', das Discord-Regelwerk in ' + channel('RULES_DISCORD_CHANNEL_ID', '#discord-regeln') + ', das Team-Regelwerk in ' + channel('RULES_TEAM_CHANNEL_ID', '#team-regeln') + ' und die Vorgaben für Content Creator in ' + channel('RULES_CREATOR_CHANNEL_ID', '#creator-regeln') + '. Lies immer das Regelwerk, das zu deiner Aktivität gehört. Bei Unklarheiten kannst du ein Ticket eröffnen, bevor du handelst.'
  ],
  [
    'Wie erreiche ich den Support?',
    'Öffne ' + channel('TICKET_PANEL_CHANNEL_ID', '#tickets') + ' und wähle im Auswahlmenü die passende Ticketart. Anschließend füllst du das Formular vollständig aus. Beschreibe dein Anliegen sachlich, nenne beteiligte Personen und füge vorhandene Beweise wie Screenshots oder Videos hinzu. Erstelle nicht mehrere Tickets für dasselbe Problem und markiere keine Teammitglieder unnötig. Dein Ticket bleibt privat und ist nur für dich sowie das zuständige Team sichtbar.'
  ],
  [
    'Wie bewerbe ich mich für eine Fraktion oder das Team?',
    'Für eine Fraktionsbewerbung nutze das Bewerbungsfeld in ' + channel('FRACTION_APPLICATION_PANEL_CHANNEL_ID', '#fraktionsbewerbungen') + '. Für eine Team-Bewerbung findest du das Panel in ' + channel('APPLICATION_PANEL_CHANNEL_ID', '#team-bewerbungen') + '. Lies vor dem Absenden die Voraussetzungen und beantworte alle Fragen ehrlich. Eine Bewerbung ist kein Anspruch auf Annahme. Rückfragen oder Entscheidungen werden über Discord beziehungsweise per Direktnachricht mitgeteilt. Bitte eröffne nicht mehrere parallele Bewerbungen.'
  ],
  [
    'Wo sehe ich die Fraktionen und ihre Neuigkeiten?',
    'Die aktuelle Fraktionsübersicht wird in ' + channel('FRACTION_LIST_CHANNEL_ID', '#fraktionen') + ' geführt. Neuigkeiten und wichtige Hinweise erscheinen in ' + channel('FRACTION_NEWS_CHANNEL_ID', '#fraktions-news') + '. Wenn du einer Fraktion beitreten möchtest, verwende ausschließlich das offizielle Bewerbungs-Panel und beachte die jeweiligen Hinweise der Fraktionsleitung.'
  ],
  [
    'Wie bekomme ich Rollen und Benachrichtigungen?',
    'Öffne ' + channel('SELFROLE_CHANNEL_ID', '#rollen') + ' und nutze dort die angebotenen Selbstauswahl-Rollen. Wähle nur Rollen, deren Zweck du verstehst. Rollen können Benachrichtigungen auslösen oder Zugriff auf bestimmte Bereiche freischalten. Team- und Sonderrollen werden nicht über die Selbstauswahl vergeben, sondern ausschließlich durch berechtigte Teammitglieder.'
  ],
  [
    'Wie melde ich einen Bug oder mache einen Vorschlag?',
    'Fehler meldest du über ' + channel('BUG_CHANNEL_ID', '#bug-meldungen') + '. Beschreibe, was du getan hast, was passieren sollte und was tatsächlich passiert ist. Ergänze möglichst einen Screenshot oder eine genaue Reproduktionsanleitung. Ideen und Verbesserungen kannst du in ' + channel('SUGGESTION_CHANNEL_ID', '#vorschläge') + ' einreichen. Bitte prüfe vorher, ob der Fehler oder Vorschlag bereits gemeldet wurde.'
  ],
  [
    'Was muss ich in einer Safezone beachten?',
    'Die ausgewiesenen Safezones sind in ' + channel('SAFEZONE_CHANNEL_ID', '#safezones') + ' dokumentiert. Dort sind absichtliche Angriffe, Überfälle, Provokationen und das gezielte Stören anderer Spieler untersagt. Eine Flucht in eine Safezone beendet eine bereits laufende Konfliktsituation nicht automatisch. Halte Abstand zu laufenden Szenen und nutze den Support, wenn du einen Regelverstoß melden möchtest.'
  ],
  [
    'Was mache ich, wenn der Server-Code nicht funktioniert?',
    'Prüfe zuerst, ob du den Code aus ' + channel('SERVER_INFO_CHANNEL_ID', '#server-informationen') + ' vollständig übernommen hast und im richtigen Spielmenü für private Server eingibst. Achte auf ähnlich aussehende Zeichen und entferne versehentliche Leerzeichen. Falls der Code abgelaufen oder geändert wurde, verwende ausschließlich den aktuell veröffentlichten Code. Wenn der Fehler bleibt, erstelle in ' + channel('TICKET_PANEL_CHANNEL_ID', '#tickets') + ' ein Support-Ticket und beschreibe die angezeigte Fehlermeldung.'
  ],
  [
    'Wo finde ich wichtige Neuigkeiten und Termine?',
    'Offizielle Ankündigungen werden in ' + channel('NEWS_CHANNEL_ID', '#ankündigungen') + ' veröffentlicht. Team- oder Fraktionstermine können zusätzlich in den jeweils zuständigen Bereichen erscheinen. Verlasse dich bei Änderungen immer auf die neuesten Nachrichten in den offiziellen Kanälen und nicht auf ältere Screenshots oder weitergeleitete Nachrichten.'
  ],
];

const makeAnswer = ([title, answer]) => brandedEmbed(title, answer + '\n\nBei weiteren Fragen hilft dir das Team über ' + channel('TICKET_PANEL_CHANNEL_ID', '#tickets') + '.');

export default {
  name: 'faq',
  commands: [new SlashCommandBuilder().setName('faq').setDescription('Zeigt häufige Fragen zu Rheinland Netzwerk').toJSON()],
  async setup(ctx) {
    const forum = await ctx.client.channels.fetch(env('FAQ_FORUM_CHANNEL_ID')).catch(() => null);
    if (!forum || forum.type !== ChannelType.GuildForum) return;

    // Find existing active and archived FAQ posts so a reset JSON store cannot create copies.
    const activeResult = await forum.threads.fetchActive().catch(() => null);
    const archivedResult = await forum.threads.fetchArchived({ type: 'public', limit: 100 }).catch(() => null);
    const knownThreads = new Map();
    for (const thread of activeResult?.threads?.values?.() ?? []) knownThreads.set(thread.id, thread);
    for (const thread of archivedResult?.threads?.values?.() ?? []) knownThreads.set(thread.id, thread);

    for (const [index, question] of questions.entries()) {
      const key = 'faq-' + index;
      const threadName = question[0].slice(0, 100);
      const savedId = ctx.db.get('faqThreads', key);
      let existing = savedId ? await forum.threads.fetch(savedId).catch(() => null) : null;
      const matching = [...knownThreads.values()]
        .filter((thread) => thread.name === threadName)
        .sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      if (!existing) existing = matching[0] ?? null;
      if (existing) {
        await ctx.db.set('faqThreads', key, existing.id);
        const starter = await existing.fetchStarterMessage().catch(() => null);
        if (starter) {
          await starter.edit({ embeds: [makeAnswer(question)] }).catch((error) =>
            ctx.logger.warn('[FAQ] Thread konnte nicht aktualisiert werden: ' + error.message));
        }
        for (const duplicate of matching) {
          if (duplicate.id !== existing.id) {
            await duplicate.delete().catch((error) =>
              ctx.logger.warn('[FAQ] Doppelte FAQ konnte nicht entfernt werden: ' + error.message));
          }
        }
        continue;
      }

      try {
        const thread = await forum.threads.create({
          name: threadName,
          message: { embeds: [makeAnswer(question)] },
          autoArchiveDuration: 10080,
        });
        await ctx.db.set('faqThreads', key, thread.id);
        knownThreads.set(thread.id, thread);
      } catch (error) {
        ctx.logger.warn('[FAQ] ' + error.message);
      }
    }
  },
  async execute(interaction) {
    const fields = questions.map(([title, answer]) => ({ name: title, value: answer.slice(0, 1024), inline: false }));
    await interaction.reply({
      embeds: [brandedEmbed('FAQ • Rheinland Netzwerk', 'Hier findest du Antworten zu Beitritt, Verifizierung, Regeln, Support, Bewerbungen und den wichtigsten Serverbereichen.', { fields })],
      ephemeral: true,
    });
  },
};
