import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { env, list } from '../core/config.js';
import { brandedEmbed, sendLog, sendPanel } from '../core/brand.js';
import { requireStaff } from '../core/permissions.js';

const factionCommand = new SlashCommandBuilder().setName('fraktion').setDescription('Verwaltet die Fraktionen')
  .addSubcommand((s) => s.setName('erstellen').setDescription('Fraktion erstellen').addStringOption((o) => o.setName('name').setDescription('Name').setRequired(true)).addUserOption((o) => o.setName('leitung').setDescription('Fraktionsleitung').setRequired(true)).addRoleOption((o) => o.setName('rolle').setDescription('Discord-Rolle der Fraktion').setRequired(false)))
  .addSubcommand((s) => s.setName('loeschen').setDescription('Fraktion löschen').addStringOption((o) => o.setName('name').setDescription('Fraktionsname').setRequired(true)))
  .addSubcommand((s) => s.setName('hinzufuegen').setDescription('Mitglied hinzufügen').addStringOption((o) => o.setName('name').setDescription('Fraktionsname').setRequired(true)).addUserOption((o) => o.setName('mitglied').setDescription('Mitglied').setRequired(true)))
  .addSubcommand((s) => s.setName('entfernen').setDescription('Mitglied entfernen').addStringOption((o) => o.setName('name').setDescription('Fraktionsname').setRequired(true)).addUserOption((o) => o.setName('mitglied').setDescription('Mitglied').setRequired(true)))
  .addSubcommand((s) => s.setName('liste').setDescription('Alle Fraktionen anzeigen')).toJSON();

const applyButton = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('application:fraction').setLabel('Fraktion beantragen').setStyle(ButtonStyle.Primary),
);
async function buildFactionEmbed(ctx) {
  const factions = ctx.db.all('factions');
  const fields = factions.slice(0, 25).map(([name, value]) => ({
    name,
    value: `Leitung: ${value.leaderId ? `<@${value.leaderId}>` : 'Nicht festgelegt'}\nRolle: ${value.roleId ? `<@&${value.roleId}>` : 'Nicht festgelegt'}\nMitglieder: ${value.members?.length ?? 0}\n${(value.members ?? []).slice(0, 12).map((id) => `<@${id}>`).join(', ') || 'Keine Mitglieder'}`,
  }));
  return brandedEmbed('Rheinland Netzwerk • Fraktionsliste', 'Übersicht der registrierten Fraktionen.', { fields });
}
async function refreshFactionPanel(ctx) {
  await sendPanel(ctx, 'fraction-list', 'FRACTION_LIST_CHANNEL_ID', { embeds: [await buildFactionEmbed(ctx)] });
}

export default {
  name: 'fraktionssystem',
  commands: [
    factionCommand,
    new SlashCommandBuilder().setName('frakliste').setDescription('Zeigt die aktuelle Fraktionsliste').toJSON(),
    new SlashCommandBuilder().setName('fraknews').setDescription('Veröffentlicht Fraktions-News').addStringOption((o) => o.setName('titel').setDescription('Überschrift').setRequired(true).setMaxLength(100)).addStringOption((o) => o.setName('text').setDescription('Nachricht').setRequired(true).setMaxLength(1800)).toJSON(),
    new SlashCommandBuilder().setName('fraktion-beantragen').setDescription('Stellt eine Fraktionsbewerbung per Formular').toJSON(),
  ],
  async setup(ctx) {
    await refreshFactionPanel(ctx);
    await sendPanel(ctx, 'fraction-news-info', 'FRACTION_NEWS_CHANNEL_ID', {
      embeds: [brandedEmbed('Rheinland Netzwerk • Fraktions-News', 'Hier veröffentlicht die Projektleitung offizielle Neuigkeiten und Informationen zu den Fraktionen.')],
    });
    await sendPanel(ctx, 'fraction-apply-info', 'FRACTION_APPLICATION_PANEL_CHANNEL_ID', {
      embeds: [brandedEmbed('Rheinland Netzwerk • Fraktion beantragen', 'Über den Button startest du die Beantragung deiner eigenen Fraktion. Der Fragebogen wird dir per Direktnachricht gestellt.')],
      components: [applyButton()],
    });
  },
  async execute(i, ctx) {
    if (i.commandName === 'fraktion-beantragen') {
      if (ctx.db.get('fractionFlows', i.user.id)) { await i.reply({ content: 'Du hast bereits eine laufende Fraktionsbeantragung per DM. Beantworte zuerst die offenen Fragen.', ephemeral: true }); return; }
      try {
        await i.user.send('**Rheinland Netzwerk • Fraktion beantragen**\nIch stelle dir nacheinander fünf Fragen. Antworte bitte jeweils direkt auf diese DM.\n\n**1/5:** Wie soll deine Fraktion heißen?');
        await ctx.db.set('fractionFlows', i.user.id, { step: 0, answers: [], startedAt: Date.now() });
        await i.reply({ content: 'Ich habe dir eine DM mit dem Fraktions-Fragebogen geschickt.', ephemeral: true });
      } catch { await i.reply({ content: 'Ich konnte dir keine DM senden. Aktiviere Direktnachrichten vom Server und starte erneut.', ephemeral: true }); }
      return;
    }
    if (i.commandName === 'frakliste' || (i.commandName === 'fraktion' && i.options.getSubcommand() === 'liste')) {
      await i.reply({ embeds: [await buildFactionEmbed(ctx)], ephemeral: i.commandName === 'fraktion' }); return;
    }
    if (i.commandName === 'fraknews') {
      if (!await requireStaff(i)) return;
      const channelId = env('FRACTION_NEWS_CHANNEL_ID');
      const channel = channelId ? await ctx.client.channels.fetch(channelId).catch(() => null) : null;
      if (!channel?.isTextBased()) { await i.reply({ content: 'FRACTION_NEWS_CHANNEL_ID ist nicht eingerichtet.', ephemeral: true }); return; }
      const roleId = env('FRACTION_NEWS_ROLE_ID'); const title = i.options.getString('titel'); const text = i.options.getString('text');
      await channel.send({ content: roleId ? `<@&${roleId}>` : undefined, embeds: [brandedEmbed(title, text)], allowedMentions: { roles: roleId ? [roleId] : [] } });
      await i.reply({ content: 'Fraktions-News wurden veröffentlicht.', ephemeral: true }); return;
    }
    if (!await requireStaff(i)) return;
    const sub = i.options.getSubcommand(); const name = i.options.getString('name');
    if (sub === 'erstellen') {
      const leader = i.options.getUser('leitung');
      if (ctx.db.get('factions', name)) { await i.reply({ content: 'Diese Fraktion existiert bereits.', ephemeral: true }); return; }
      const role = i.options.getRole('rolle');
      const allowedRoleIds = list('FRACTION_ROLE_IDS');
      if (role && ((allowedRoleIds.length && !allowedRoleIds.includes(role.id)) || role.managed || role.position >= i.guild.members.me.roles.highest.position)) { await i.reply({ content: 'Diese Rolle ist nicht freigegeben oder liegt über der Bot-Rolle.', ephemeral: true }); return; }
      await ctx.db.set('factions', name, { name, leaderId: leader.id, roleId: role?.id ?? null, members: [leader.id], createdAt: Date.now() });
      if (role) { const guildMember = await i.guild.members.fetch(leader.id).catch(() => null); await guildMember?.roles.add(role).catch(() => null); }
      await i.reply({ content: `Fraktion **${name}** wurde erstellt. Leitung: ${leader}${role ? `\nRolle: ${role.name}` : ''}.`, ephemeral: true });
    } else if (sub === 'loeschen') {
      const existing = ctx.db.get('factions', name);
      if (existing?.roleId) for (const id of existing.members ?? []) { const member = await i.guild.members.fetch(id).catch(() => null); await member?.roles.remove(existing.roleId).catch(() => null); }
      await ctx.db.delete('factions', name); await i.reply({ content: `Fraktion **${name}** wurde gelöscht.`, ephemeral: true });
    } else {
      const entry = ctx.db.get('factions', name);
      if (!entry) { await i.reply({ content: 'Fraktion nicht gefunden.', ephemeral: true }); return; }
      const member = i.options.getUser('mitglied');
      const guildMember = await i.guild.members.fetch(member.id).catch(() => null);
      if (sub === 'hinzufuegen') { entry.members = [...new Set([...(entry.members ?? []), member.id])]; if (entry.roleId) await guildMember?.roles.add(entry.roleId).catch(() => null); }
      else { entry.members = (entry.members ?? []).filter((id) => id !== member.id); if (entry.roleId) await guildMember?.roles.remove(entry.roleId).catch(() => null); if (entry.leaderId === member.id) entry.leaderId = entry.members[0] ?? null; }
      await ctx.db.set('factions', name, entry); await i.reply({ content: `${member} wurde ${sub === 'hinzufuegen' ? 'zu' : 'aus'} **${name}** ${sub === 'hinzufuegen' ? 'hinzugefügt' : 'entfernt'}.`, ephemeral: true });
    }
    await refreshFactionPanel(ctx);
    await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Fraktionsverwaltung', `Aktion: ${sub}\nFraktion: ${name}\nVon: ${i.user}`);
  },
  async onMessage(message, ctx) {
    if (message.guild || message.author.bot) return;
    const flow = ctx.db.get('fractionFlows', message.author.id);
    if (!flow) return;
    const answer = [message.content?.trim(), ...message.attachments.map((file) => file.url)].filter(Boolean).join('\n').slice(0, 1500);
    if (!answer) { await message.reply('Bitte sende eine Textantwort oder einen Anhang.'); return; }
    flow.answers.push(answer);
    flow.step += 1;
    const questions = [
      'Wie soll deine Fraktion heißen?',
      'Wer soll die Fraktionsleitung übernehmen? Nenne Discord- und Ingame-Namen.',
      'Beschreibe das Konzept, die Aufgaben und das Ziel deiner Fraktion.',
      'Wie viele Mitglieder planst du und wer gehört bereits dazu?',
      'Wie oft seid ihr aktiv und warum sollte die Fraktion aufgenommen werden?',
    ];
    if (flow.step < questions.length) {
      await ctx.db.set('fractionFlows', message.author.id, flow);
      await message.reply(`**${flow.step + 1}/${questions.length}:** ${questions[flow.step]}`);
      return;
    }
    const payload = { userId: message.author.id, name: flow.answers[0], leader: flow.answers[1], concept: flow.answers[2], members: flow.answers[3], activity: flow.answers[4], createdAt: Date.now(), status: 'open' };
    const key = `${message.author.id}-${Date.now()}`;
    const application = { type: 'fraction', userId: message.author.id, age: 'Nicht angegeben', name: payload.name, experience: payload.concept, motivation: `Fraktionsleitung: ${payload.leader}\nMitglieder: ${payload.members}\nAktivität: ${payload.activity}`, createdAt: payload.createdAt, status: 'open' };
    await ctx.db.set('fractionApplications', key, payload);
    await ctx.db.set('applications', key, application);
    await ctx.db.delete('fractionFlows', message.author.id);
    const channelKey = env('FRACTION_APPLICATION_LOG_CHANNEL_ID') ? 'FRACTION_APPLICATION_LOG_CHANNEL_ID' : 'APPLICATION_LOG_CHANNEL_ID';
    const channelId = env(channelKey);
    const channel = channelId ? await ctx.client.channels.fetch(channelId).catch(() => null) : null;
    if (channel?.isTextBased()) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`application:decision:${key}:approve`).setLabel('Annehmen').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`application:decision:${key}:reject`).setLabel('Ablehnen').setStyle(ButtonStyle.Danger),
      );
      await channel.send({ embeds: [brandedEmbed('Neue Fraktionsbeantragung', `Antragsteller: <@${message.author.id}>\nFraktion: ${payload.name}\nLeitung: ${payload.leader}\nKonzept: ${payload.concept}\nMitglieder: ${payload.members}\nAktivität: ${payload.activity}`)], components: [row], allowedMentions: { parse: [] } });
    }
    await message.reply('Dein Fraktionsantrag wurde vollständig übermittelt. Die Projektleitung erhält ihn im Bewerbungs-Log und meldet sich per DM.');
  },
};
