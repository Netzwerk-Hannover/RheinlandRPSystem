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
  'Spiele einen glaubwürdigen Charakter mit nachvollziehbaren Motiven und realistischen Reaktionen. Respektiere andere Spieler, laufende Szenen und die Spielwelt. Dein Charakter besitzt ein eigenes Leben: Handle nicht so, als wären Verletzungen, Gefahren oder Konsequenzen bedeutungslos.',
  '',
  '**§ 2 • RDM (Random Deathmatch)**',
  'RDM ist das grundlose Angreifen, Beschießen oder Töten eines Spielers ohne ausreichenden und nachvollziehbaren Roleplay-Hintergrund. Gewalt darf nicht aus Langeweile, wegen einer Beleidigung außerhalb des Spiels oder nur für einen Kampf begonnen werden. Eine Eskalation muss aus der Situation heraus verständlich sein.',
  '',
  '**§ 3 • VDM (Vehicle Deathmatch)**',
  'VDM ist das absichtliche Anfahren, Überfahren oder Rammen von Personen mit einem Fahrzeug, um sie zu verletzen, auszuschalten oder eine Szene zu stören. Fahrzeuge sind kein Ersatz für Waffen. Unfälle und nachvollziehbare Notwehrsituationen werden anhand des konkreten Ablaufs bewertet; absichtliches Griefing bleibt verboten.',
  '',
  '**§ 4 • Fail-RP**',
  'Fail-RP sind Handlungen, die offensichtlich unrealistisch sind oder die Logik der Situation ignorieren. Dazu gehören beispielsweise das Ignorieren schwerer Verletzungen, unrealistische Fluchten, Handlungen trotz Bewusstlosigkeit oder das Missachten klar erkennbarer Gefahren. Spiele Folgen von Unfällen, Verletzungen und Festnahmen angemessen aus.',
  '',
  '**§ 5 • Powergaming / PowerRP**',
  'Powergaming bedeutet, anderen Spielern Handlungen oder Ergebnisse aufzuzwingen, ihnen keine faire Reaktionsmöglichkeit zu lassen oder unmögliche Fähigkeiten auszuspielen. Beschreibe deine Handlung, aber entscheide nicht ohne Gegenreaktion über den Ausgang für andere. Nutze Spielmechaniken nicht, um eine RP-Situation künstlich zu gewinnen.',
  '',
  '**§ 6 • Metagaming (MG)**',
  'Metagaming ist die Nutzung von Informationen, die dein Charakter nicht innerhalb des Roleplays erhalten hat. Dazu zählen Informationen aus Discord, Streams, privaten Nachrichten, Namensanzeigen oder Gesprächen außerhalb des Spiels. OOC-Wissen darf nicht als IC-Wissen verwendet werden.',
  '',
  '**§ 7 • Fear-RP und Selbstschutz**',
  'Dein Charakter muss auf glaubhafte Lebensgefahr angemessen reagieren. Wenn eine Person dich unter unmittelbarer Waffengewalt kontrolliert und du realistisch keine sichere Gegenwehr hast, spiele die Angst und die Situation aus. Unüberlegte Suizidaktionen, unrealistische Gegenwehr und das Ignorieren klarer Bedrohungen sind untersagt.',
  '',
  '**§ 8 • New-Life-Rule (NLR)**',
  'Nach dem vollständigen Verlust des Bewusstseins und einer abgeschlossenen Wiederbelebung beziehungsweise dem vorgesehenen Respawn darfst du nicht einfach in dieselbe Situation zurückkehren. Nutze keine Erinnerungen aus der Szene, um Rache zu nehmen oder Beteiligte gezielt erneut aufzusuchen. Bereits laufende medizinische Abläufe werden nicht eigenmächtig abgebrochen.',
  '',
  '**§ 9 • Combat-Logging und RP-Flucht**',
  'Das absichtliche Verlassen des Servers, Wechseln des Accounts oder Unterbrechen der Verbindung, um einer laufenden Festnahme, Verfolgung, Schießerei, Verletzung oder anderen Konsequenz zu entgehen, ist verboten. Bei einem technischen Absturz informiere das Team nach deiner Rückkehr zeitnah und erkläre die Situation nachvollziehbar.',
  '',
  '**§ 10 • OOC und Kommunikation**',
  'Out-of-Character-Gespräche gehören nicht in laufende IC-Situationen. Nutze vorgesehene Supportwege für Regelhinweise und Beschwerden. Beleidigungen oder Drohungen außerhalb des Spiels rechtfertigen keine IC-Gewalt. Das absichtliche Vermischen von IC- und OOC-Konflikten ist untersagt.',
  '',
  '**§ 11 • Safezones**',
  'In den ausgewiesenen Safezones sind Angriffe, Überfälle, Entführungen, absichtliches Rammen und gezielte Störungen verboten. Eine Safezone ist kein Werkzeug, um eine bereits laufende Situation durch bloßes Hineinfahren unfair abzubrechen. Die ausgewiesenen Bereiche stehen in ' + mention('SAFEZONE_CHANNEL_ID', '#safezones') + '.',
  '',
  '**§ 12 • Fahrzeuge und Straßenverkehr**',
  'Fahre passend zu Fahrzeug, Straße, Wetter und Situation. Absichtliche Massenunfälle, unrealistische Stunts, dauerhaftes Fahren abseits geeigneter Wege und das Blockieren von Straßen ohne RP-Grund sind untersagt. Beschädigte Fahrzeuge sind entsprechend ihrer Schäden zu behandeln. Einsatzfahrzeuge dürfen nicht ohne Grund behindert werden.',
  '',
  '**§ 13 • Polizei, Rettungsdienst und Feuerwehr**',
  'Respektiere Zuständigkeiten und spiele Kontrollen, Festnahmen, Rettungen und Einsätze angemessen aus. Cop-Baiting oder Medic-Baiting, also das grundlose Provozieren von Einsatzkräften, ist verboten. Gib medizinischem Personal Zeit für Behandlung und missbrauche Notrufe nicht als Unterhaltung.',
  '',
  '**§ 14 • Überfälle, Geiseln und kriminelles RP**',
  'Kriminelle Handlungen benötigen einen nachvollziehbaren RP-Anlass. Geiselnahmen, Überfälle und Verhandlungen dürfen nicht nur dazu dienen, möglichst schnell Schüsse oder Beute zu erzwingen. Binde keine unbeteiligten Spieler ohne plausiblen Grund ein und halte dich an situationsbezogene Team-Anweisungen.',
  '',
  '**§ 15 • Drittpartei und Szenenstörung**',
  'Mische dich nicht ohne nachvollziehbaren RP-Bezug in fremde Konflikte ein. Das gezielte Stören fremder Szenen, Spawn-Killing, sinnloses Provozieren, Rammen oder Verfolgen ohne RP-Grund gilt als Trolling beziehungsweise Baiting.',
  '',
  '**§ 16 • Cheats, Exploits und Bugusing**',
  'Cheats, Skripte, unerlaubte Drittprogramme, Exploits und das absichtliche Ausnutzen von Spielfehlern zum eigenen Vorteil sind verboten. Melde reproduzierbare Fehler über ' + mention('BUG_CHANNEL_ID', '#bug-meldungen') + ' und nutze sie nicht weiter aus. Das Verbreiten von Exploits kann ebenfalls sanktioniert werden.',
  '',
  '**§ 17 • Beweise und Support**',
  'Melde Regelverstöße möglichst zeitnah und sachlich über ' + mention('TICKET_PANEL_CHANNEL_ID', '#tickets') + '. Sichere vorhandene Screenshots oder Videos unverändert. Manipulierte Beweise, falsche Anschuldigungen und das Veröffentlichen privater Supportinhalte sind untersagt.',
  '',
  '**§ 18 • Schlussregel**',
  'Das Team bewertet jede Situation anhand des vollständigen Ablaufs, der verfügbaren Beweise, der Absicht und möglicher Wiederholungen. Bei Unklarheiten frage vor einer riskanten Handlung im Support nach. Dieses Regelwerk kann durch die Projektleitung aktualisiert werden.'
].join('\n');

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
