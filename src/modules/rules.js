import { SlashCommandBuilder } from 'discord.js';
import { env } from '../core/config.js';
import { brandedEmbed, sendPanel } from '../core/brand.js';

const choices = [
  { name: 'Discord-Regelwerk', value: 'discord' },
  { name: 'Ingame-Regelwerk', value: 'ingame' },
  { name: 'Team-Regelwerk', value: 'team' },
  { name: 'Content-Creator-Regelwerk', value: 'creator' },
];

const mention = (key, fallback) => env(key) ? '<#' + env(key) + '>' : fallback;

const discordRules = () => [
  '**§ 1 • Geltungsbereich und Akzeptanz**',
  'Mit deiner Teilnahme am Rheinland-Netzwerk-Discord akzeptierst du dieses Regelwerk sowie die geltenden Discord-Richtlinien. Unwissenheit schützt nicht vor Konsequenzen. Anweisungen des zuständigen Teams sind zu beachten, solange sie nicht gegen geltendes Recht oder übergeordnete Plattformregeln verstoßen.',
  '',
  '**§ 2 • Respekt und Umgangston**',
  'Behandle alle Mitglieder respektvoll. Beleidigungen, gezielte Provokationen, Mobbing, Belästigung, Diskriminierung, Hassrede, Drohungen und die Herabwürdigung anderer Personen sind untersagt. Kritik ist erlaubt, persönliche Angriffe nicht. Konflikte werden sachlich und nicht durch öffentliche Streitigkeiten ausgetragen.',
  '',
  '**§ 3 • Spam, Werbung und Störungen**',
  'Spam, Massenpings, unnötige Markierungen, unerwünschte Werbung, Einladungslinks, Referral-Links, Scam, Phishing und das wiederholte Posten gleicher Inhalte sind verboten. Werbung für andere Communities oder Projekte benötigt eine ausdrückliche Freigabe der Projektleitung.',
  '',
  '**§ 4 • Inhalte und Sicherheit**',
  'Verboten sind pornografische, sexualisierte, extremistische, gewaltverherrlichende, rechtswidrige oder anderweitig unangemessene Inhalte. Veröffentliche keine schädlichen Dateien, verdächtigen Links, Malware oder Exploits. Das Umgehen von Sicherheitsmaßnahmen oder das gezielte Ausnutzen von Bots und Discord-Funktionen ist untersagt.',
  '',
  '**§ 5 • Privatsphäre und Identität**',
  'Veröffentliche keine privaten Daten, Adressen, Telefonnummern, Zugangsdaten, privaten Nachrichten oder Aufnahmen anderer Personen ohne deren Einwilligung. Doxxing, Identitätsdiebstahl, Impersonation und das Vortäuschen einer Team- oder Projektleitungszugehörigkeit sind verboten.',
  '',
  '**§ 6 • Accounts und Umgehung**',
  'Das Umgehen von Sanktionen mit Zweitaccounts, das Bereitstellen von Accounts zur Umgehung einer Sperre sowie koordinierte Belästigung sind untersagt. Sicherheitsrelevante Zugangsdaten dürfen niemals im Chat, in Tickets oder in Screenshots veröffentlicht werden.',
  '',
  '**§ 7 • Kanäle, Tickets und Teamkontakt**',
  'Nutze jeden Kanal ausschließlich für seinen vorgesehenen Zweck. Regelwerke sind in ' + mention('RULES_DISCORD_CHANNEL_ID', '#discord-regeln') + ', Ingame-Regeln in ' + mention('RULES_INGAME_CHANNEL_ID', '#ingame-regeln') + ' und Support im Ticketbereich ' + mention('TICKET_PANEL_CHANNEL_ID', '#tickets') + ' zu finden. Umgehe keine Support- oder Moderationsabläufe durch wiederholte Direktnachrichten an Teammitglieder.',
  '',
  '**§ 8 • Moderation und Sanktionen**',
  'Das Team darf Inhalte entfernen, Beiträge begrenzen sowie Verwarnungen, Timeouts, Kicks oder temporäre und permanente Ausschlüsse aussprechen. Die Maßnahme richtet sich nach Schwere, Absicht, Auswirkungen, Vorgeschichte und Wiederholung. Das Team kann bei besonders schweren Verstößen unmittelbar handeln.',
  '',
  '**§ 9 • Plattformregeln**',
  'Es gelten zusätzlich die offiziellen Vorgaben von Discord: Terms of Service https://discord.com/terms, Datenschutz https://discord.com/privacy und Community Guidelines https://discord.com/guidelines. Für Entwickler und Bots gelten außerdem https://discord.com/developers/docs/policies-and-agreements/developer-terms-of-service sowie https://discord.com/developers/docs/policies-and-agreements/developer-policy.',
  '',
  '**§ 10 • Schlussbestimmungen**',
  'Die Projektleitung darf dieses Regelwerk aktualisieren. Maßgeblich ist die jeweils veröffentlichte Fassung. Bei Fragen oder einem begründeten Einspruch nutze ein Ticket. Entscheidungen werden anhand des konkreten Sachverhalts geprüft.'
].join('\n');

const ingameRules = () => [
  '**§ 1 • Grundprinzipien des Roleplays**',
  'Spiele einen glaubwürdigen Charakter und reagiere realistisch auf Gefahr, Verletzungen und Konsequenzen. Respektiere andere Spieler und laufende Szenen.',
  '',
  '**§ 2 • RDM (Random Deathmatch)**',
  'Grundloses Angreifen, Beschießen oder Töten ohne nachvollziehbaren RP-Anlass ist verboten. Gewalt darf nicht aus Langeweile oder nur für einen Kampf begonnen werden.',
  '',
  '**§ 3 • VDM (Vehicle Deathmatch)**',
  'Absichtliches Anfahren, Überfahren oder Rammen von Personen zur Verletzung, Ausschaltung oder Störung einer Szene ist verboten. Fahrzeuge sind keine Waffen.',
  '',
  '**§ 4 • Fail-RP**',
  'Unrealistisches Verhalten, das die Spielwelt oder Situation ignoriert, ist Fail-RP. Spiele Verletzungen, Bewusstlosigkeit, Unfälle und erkennbare Gefahren angemessen aus.',
  '',
  '**§ 5 • Powergaming / PowerRP**',
  'Zwinge anderen keine Ergebnisse auf und lasse ihnen eine faire Reaktion. Unmögliche Fähigkeiten oder das Ausnutzen von Mechaniken für einen sicheren Szenensieg sind verboten.',
  '',
  '**§ 6 • Metagaming (MG)**',
  'Nutze kein Wissen, das dein Charakter nicht IC erhalten hat. Informationen aus Discord, Streams, privaten Nachrichten oder OOC-Gesprächen dürfen keine IC-Entscheidungen beeinflussen.',
  '',
  '**§ 7 • Fear-RP und Selbstschutz**',
  'Spiele glaubhafte Lebensgefahr aus. Bei unmittelbarer Waffengewalt darfst du nicht unrealistisch Gegenwehr leisten, wenn dein Charakter keine realistische Möglichkeit dazu hat.',
  '',
  '**§ 8 • New-Life-Rule (NLR)**',
  'Nach abgeschlossener Wiederbelebung oder dem vorgesehenen Respawn kehrst du nicht in dieselbe Situation zurück. Nutze keine Erinnerungen daraus für Rache oder gezielte Verfolgung.',
  '',
  '**§ 9 • Combat-Logging und RP-Flucht**',
  'Verlasse den Server oder unterbrich absichtlich die Verbindung nicht, um Festnahmen, Verfolgungen oder Konsequenzen zu umgehen. Technische Abstürze meldest du dem Team nach deiner Rückkehr.',
  '',
  '**§ 10 • OOC und Kommunikation**',
  'OOC-Gespräche gehören nicht in laufende IC-Szenen. Nutze den Support für Beschwerden. OOC-Streit oder Beleidigungen rechtfertigen keine IC-Gewalt.',
  '',
  '**§ 11 • Safezones**',
  'In ausgewiesenen Safezones sind Angriffe, Überfälle, Entführungen und absichtliche Störungen verboten. Eine Safezone beendet keine bereits laufende Szene automatisch. Bereiche: ' + mention('SAFEZONE_CHANNEL_ID', '#safezones') + '.',
  '',
  '**§ 12 • Fahrzeuge und Straßenverkehr**',
  'Fahre passend zu Fahrzeug und Situation. Absichtliche Massenunfälle, unrealistische Stunts, unnötiges Offroad-Fahren und grundloses Blockieren von Straßen sind verboten.',
  '',
  '**§ 13 • Polizei, Rettungsdienst und Feuerwehr**',
  'Respektiere Einsatzkräfte und spiele Kontrollen, Festnahmen und Rettungen aus. Cop-/Medic-Baiting und missbräuchliche Notrufe ohne RP-Anlass sind untersagt.',
  '',
  '**§ 14 • Überfälle, Geiseln und kriminelles RP**',
  'Kriminelle Handlungen benötigen einen nachvollziehbaren RP-Anlass. Nutze Geiseln und Überfälle nicht nur, um Schüsse oder Beute zu erzwingen. Unbeteiligte werden nicht grundlos hineingezogen.',
  '',
  '**§ 15 • Drittpartei und Szenenstörung**',
  'Mische dich ohne RP-Bezug nicht in fremde Konflikte ein. Trolling, Spawn-Killing, grundloses Provozieren und gezieltes Stören laufender Szenen sind verboten.',
  '',
  '**§ 16 • Cheats, Exploits und Bugusing**',
  'Cheats, unerlaubte Programme und das Ausnutzen von Spielfehlern zum Vorteil sind verboten. Melde Bugs in ' + mention('BUG_CHANNEL_ID', '#bug-meldungen') + ' und nutze sie nicht aus.',
  '',
  '**§ 17 • Beweise und Support**',
  'Melde Regelverstöße zeitnah über ' + mention('TICKET_PANEL_CHANNEL_ID', '#tickets') + '. Sichere Screenshots und Videos unverändert. Manipulierte Beweise und falsche Anschuldigungen sind verboten.',
  '',
  '**§ 18 • Schlussregel**',
  'Das Team bewertet Kontext, Beweise, Absicht und Wiederholungen. Bei Unklarheiten frage vor einer riskanten Handlung im Support nach. Die Projektleitung kann Regeln aktualisieren.'
].join('\\n');

const teamRules = [
  '**§ 1 • Auftreten und Verantwortung**',
  'Teammitglieder repräsentieren Rheinland Netzwerk. Freundlichkeit, Sachlichkeit, Zuverlässigkeit und ein professioneller Umgang sind Pflicht. Private Konflikte dürfen Entscheidungen oder den Umgang mit Mitgliedern nicht beeinflussen.',
  '',
  '**§ 2 • Neutralität und Gleichbehandlung**',
  'Behandle alle Mitglieder unabhängig von Freundschaften, Fraktionszugehörigkeit oder persönlicher Meinung gleich. Bevorzuge keine Freunde und benachteilige keine Kritiker. Bei Interessenkonflikten gib die Bearbeitung an ein anderes Teammitglied ab.',
  '',
  '**§ 3 • Rechte und Befugnisse**',
  'Nutze Team- und Administrationsrechte ausschließlich für dienstliche Aufgaben. Missbrauch, unnötige Eingriffe, Drohungen mit Rechten, Selbstbegünstigung und das Umgehen technischer Schutzmaßnahmen sind untersagt. Sanktionen müssen begründet und nachvollziehbar sein.',
  '',
  '**§ 4 • Support und Kommunikation**',
  'Bearbeite Tickets respektvoll und vollständig. Bleibe beim Thema, stelle Rückfragen und erkläre Entscheidungen verständlich. Schließe keine Tickets aus Bequemlichkeit und führe keine unnötigen Diskussionen in öffentlichen Kanälen. Sensible Fälle werden nur mit zuständigen Personen geteilt.',
  '',
  '**§ 5 • Datenschutz und Vertraulichkeit**',
  'Interne Gespräche, Bewerbungen, Logs, personenbezogene Daten und nicht öffentliche Projektinformationen bleiben intern. Screenshots oder Inhalte aus internen Bereichen dürfen nicht ohne Freigabe weitergegeben werden. Zugangsdaten, Tokens und Passwörter sind geheim zu halten.',
  '',
  '**§ 6 • Aktivität und Abwesenheit**',
  'Erledige übernommene Aufgaben zuverlässig und informiere die zuständige Leitung bei längerer Abwesenheit. Aktivität darf nicht künstlich durch sinnlose Nachrichten oder unnötige Aktionen vorgetäuscht werden. Übergib offene Fälle sauber an die nächste zuständige Person.',
  '',
  '**§ 7 • Teaminterne Zusammenarbeit**',
  'Respektiere Dienstwege und Zuständigkeiten. Kritik wird sachlich und intern angesprochen. Öffentliche Streitigkeiten, das Untergraben anderer Teammitglieder und das bewusste Zurückhalten wichtiger Informationen schaden dem Projekt und sind zu unterlassen.',
  '',
  '**§ 8 • Dienst und Roleplay**',
  'Trenne Teamdienst und normales Roleplay. Nutze administrative Informationen nicht im RP und verschaffe dir oder deiner Fraktion keine Vorteile. Während einer administrativen Bearbeitung bleibt die Neutralität gewahrt.',
  '',
  '**§ 9 • Sanktionen und Dokumentation**',
  'Verwarnungen, Ausschlüsse und sonstige Maßnahmen müssen zum Vorfall passen. Prüfe Beweise und den Kontext, bevor du handelst. Dokumentiere relevante Entscheidungen in den vorgesehenen Protokollbereichen und halte dich an die internen Zuständigkeiten.',
  '',
  '**§ 10 • Interessenschutz und Außenwirkung**',
  'Veröffentliche keine internen Aussagen als offizielle Projektentscheidung. Zusagen im Namen der Projektleitung benötigen eine entsprechende Befugnis. Eigenwerbung, Vorteilsnahme oder private Geschäfte unter Ausnutzung der Teamposition sind verboten.',
  '',
  '**§ 11 • Konsequenzen**',
  'Verstöße können je nach Schwere zu einem Gespräch, einer Verwarnung, Rechteentzug, Degradierung oder Entfernung aus dem Team führen. Besonders schwerer Rechte- oder Datenmissbrauch kann einen permanenten Ausschluss nach sich ziehen.'
].join('\n');

const creatorRules = [
  '**§ 1 • Zugehörigkeit und Darstellung**',
  'Content Creator dürfen ihre Verbindung zu Rheinland Netzwerk nur im tatsächlich vereinbarten Umfang darstellen. Eine offizielle Partnerschaft, Freigabe oder Teamzugehörigkeit darf nicht vorgetäuscht werden.',
  '',
  '**§ 2 • Respektvolle Inhalte**',
  'Veröffentlichte Inhalte dürfen keine gezielte Belästigung, Hassrede, Diskriminierung, Drohungen oder rechtswidrigen Inhalte enthalten. Andere Spieler dürfen nicht absichtlich bloßgestellt oder zu Belästigungszielen gemacht werden.',
  '',
  '**§ 3 • Privatsphäre und Einwilligung**',
  'Veröffentliche keine privaten Daten, Direktnachrichten, Support-Tickets, internen Teamgespräche oder personenbezogenen Informationen ohne Erlaubnis. Bei Aufnahmen sind die geltenden Plattformregeln und die Rechte der beteiligten Personen zu beachten.',
  '',
  '**§ 4 • Faires Roleplay und Aufnahmen**',
  'Keine gestellten Regelverstöße, absichtlichen VDM-/RDM-Szenen, Stream-Sniping-Aufrufe oder absichtliche Provokation anderer Mitglieder für Reichweite. OOC-Informationen aus Streams dürfen nicht ins IC übertragen werden. Zeige RP-Situationen möglichst vollständig und nicht irreführend.',
  '',
  '**§ 5 • Marken und Medien**',
  'Logos, Grafiken und Projektmaterial dürfen nicht verändert oder außerhalb der erteilten Freigabe verwendet werden. Kennzeichne eigene Inhalte klar und erwecke nicht den Eindruck, fremde Arbeiten seien deine eigenen. Nutze nur Musik, Bilder und Videos, für die du die erforderlichen Rechte besitzt.',
  '',
  '**§ 6 • Werbung und Kooperationen**',
  'Werbung für andere Server, Communities oder Produkte ist nur nach vorheriger Freigabe zulässig. Verknüpfe Rheinland Netzwerk nicht mit fremden Angeboten, die gegen Plattformregeln oder geltendes Recht verstoßen.',
  '',
  '**§ 7 • Fehler und Sicherheitslücken**',
  'Zeige Cheats, Exploits, Sicherheitslücken oder vertrauliche Funktionen nicht als Anleitung zur Nachahmung. Melde solche Funde zuerst vertraulich über den Support. Verbreite keine Zugangsdaten oder internen Testinformationen.',
  '',
  '**§ 8 • Regelverstöße und Freigaben**',
  'Das Team kann die Nutzung von Projektmaterial untersagen oder eine Creator-Freigabe bei Verstößen widerrufen. Bei Unsicherheit ist vor einer Veröffentlichung eine schriftliche Freigabe einzuholen.'
].join('\n');

const rules = {
  discord: { channel: 'RULES_DISCORD_CHANNEL_ID', title: 'Discord-Regelwerk', content: discordRules },
  ingame: { channel: 'RULES_INGAME_CHANNEL_ID', title: 'Ingame-Regelwerk', content: ingameRules() },
  team: { channel: 'RULES_TEAM_CHANNEL_ID', title: 'Team-Regelwerk', content: env('RULES_TEAM', teamRules) },
  creator: { channel: 'RULES_CREATOR_CHANNEL_ID', title: 'Content-Creator-Regelwerk', content: env('RULES_CREATOR', creatorRules) },
};

export default {
  name: 'regelwerke',
  commands: [new SlashCommandBuilder().setName('regelwerk').setDescription('Zeigt ein Regelwerk von Rheinland Netzwerk').addStringOption((option) => option.setName('bereich').setDescription('Gewünschtes Regelwerk').setRequired(true).addChoices(...choices)).toJSON()],
  async setup(ctx) {
    for (const [key, rule] of Object.entries(rules)) {
      await sendPanel(ctx, 'rules-' + key, rule.channel, {
        embeds: [brandedEmbed('Rheinland Netzwerk • ' + rule.title, rule.content)],
      });
    }
  },
  async execute(interaction) {
    const area = interaction.options.getString('bereich');
    const rule = rules[area];
    if (!rule) {
      await interaction.reply({ content: 'Dieses Regelwerk wurde nicht gefunden.', ephemeral: true });
      return;
    }
    await interaction.reply({ embeds: [brandedEmbed('Rheinland Netzwerk • ' + rule.title, rule.content)], ephemeral: true });
  },
};
