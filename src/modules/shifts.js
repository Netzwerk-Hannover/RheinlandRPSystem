import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { bool, int } from '../core/config.js';
import { brandedEmbed, sendLog, sendPanel } from '../core/brand.js';
import { isTeam, requireStaff } from '../core/permissions.js';

const elapsed = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 3600)}h ${Math.floor((total % 3600) / 60)}m`;
};
const shiftButtons = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('shift:in').setLabel('Einstempeln').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId('shift:out').setLabel('Ausstempeln').setStyle(ButtonStyle.Secondary),
);
async function clockIn(userId, guildId, ctx) {
  const existing = ctx.db.get('activeShifts', userId);
  if (existing) return { ok: false, message: `Du bist bereits seit <t:${Math.floor(existing.startedAt / 1000)}:R> eingestempelt.` };
  await ctx.db.set('activeShifts', userId, { startedAt: Date.now(), guildId });
  return { ok: true, message: 'Du bist jetzt eingestempelt. Danke für deinen Dienst!' };
}
async function clockOut(userId, ctx) {
  const shift = ctx.db.get('activeShifts', userId);
  if (!shift) return { ok: false, message: 'Du bist aktuell nicht eingestempelt.' };
  const duration = Date.now() - shift.startedAt;
  await ctx.db.delete('activeShifts', userId);
  const totals = ctx.db.get('shiftTotals', userId, { totalMs: 0, shifts: 0 });
  totals.totalMs += duration; totals.shifts += 1;
  await ctx.db.set('shiftTotals', userId, totals);
  return { ok: true, message: `Schicht beendet. Dauer: **${elapsed(duration)}**. Gesamtzeit: **${elapsed(totals.totalMs)}**.`, duration, totals };
}

export default {
  name: 'schichtsystem',
  commands: [
    new SlashCommandBuilder().setName('einstempeln').setDescription('Startet deine Teamschicht').toJSON(),
    new SlashCommandBuilder().setName('ausstempeln').setDescription('Beendet deine Teamschicht').toJSON(),
    new SlashCommandBuilder().setName('schichtstatus').setDescription('Zeigt deine aktuelle Schicht').toJSON(),
    new SlashCommandBuilder().setName('schichtzeit').setDescription('Zeigt die Schichtzeit eines Teammitglieds').addUserOption((o) => o.setName('mitglied').setDescription('Mitglied').setRequired(false)).toJSON(),
    new SlashCommandBuilder().setName('schichtliste').setDescription('Zeigt die gespeicherten Schichtzeiten des gesamten Teams').toJSON(),
  ],
  async setup(ctx) {
    await sendPanel(ctx, 'shift-system', 'SHIFT_CHANNEL_ID', {
      embeds: [brandedEmbed('Rheinland Netzwerk • Schichtsystem', 'Teammitglieder können hier ihre Schicht starten und beenden.\n\n**Maximale Schichtdauer:** 3 Stunden (automatische Abmeldung)\n**Befehle:** /einstempeln · /ausstempeln · /schichtstatus · /schichtzeit · /schichtliste')],
      components: [shiftButtons()],
    });
    if (ctx.shiftTimer) clearInterval(ctx.shiftTimer);
    ctx.shiftTimer = setInterval(async () => {
      if (!bool('SHIFT_AUTO_CLOCKOUT', true)) return;
      const max = int('SHIFT_MAX_HOURS', 3, 1, 24) * 3600000;
      for (const [userId, shift] of ctx.db.all('activeShifts')) {
        if (Date.now() - shift.startedAt < max) continue;
        await ctx.db.delete('activeShifts', userId);
        const totals = ctx.db.get('shiftTotals', userId, { totalMs: 0, shifts: 0 });
        totals.totalMs += max; totals.shifts += 1;
        await ctx.db.set('shiftTotals', userId, totals);
        await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Automatisch ausgestempelt', `<@${userId}> wurde nach ${int('SHIFT_MAX_HOURS', 3)} Stunden automatisch ausgestempelt. Dauer: ${elapsed(max)}.`);
      }
    }, 60000);
  },
  async onInteraction(i, ctx) {
    if (!i.isButton() || !['shift:in', 'shift:out'].includes(i.customId)) return false;
    if (!isTeam(i.member)) { await i.reply({ content: 'Das Schichtsystem ist nur für Teammitglieder.', ephemeral: true }); return true; }
    if (i.customId === 'shift:in') {
      const result = await clockIn(i.user.id, i.guildId, ctx);
      await i.reply({ content: result.message, ephemeral: true });
      if (result.ok) await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Schicht begonnen', `${i.user} hat sich eingestempelt.`);
    } else {
      const result = await clockOut(i.user.id, ctx);
      await i.reply({ content: result.message, ephemeral: true });
      if (result.ok) await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Schicht beendet', `${i.user} war ${elapsed(result.duration)} im Dienst.`);
    }
    return true;
  },
  async execute(i, ctx) {
    if (!isTeam(i.member)) { await i.reply({ content: 'Das Schichtsystem ist nur für Teammitglieder.', ephemeral: true }); return; }
    const name = i.commandName;
    if (name === 'schichtliste') {
      if (!await requireStaff(i)) return;
      const userIds = new Set([...ctx.db.all('shiftTotals').map(([id]) => id), ...ctx.db.all('activeShifts').map(([id]) => id)]);
      const rows = [];
      for (const userId of userIds) {
        const totals = ctx.db.get('shiftTotals', userId, { totalMs: 0, shifts: 0 });
        const active = ctx.db.get('activeShifts', userId);
        rows.push({ userId, duration: totals.totalMs + (active ? Date.now() - active.startedAt : 0), shifts: totals.shifts, active });
      }
      rows.sort((a, b) => b.duration - a.duration);
      const fields = rows.slice(0, 25).map((row) => ({ name: `<@${row.userId}>`, value: `${elapsed(row.duration)} · ${row.shifts} beendete Schichten${row.active ? ' · aktuell im Dienst' : ''}`, inline: false }));
      await i.reply({ embeds: [brandedEmbed('Schichtsystem • Teamübersicht', fields.length ? 'Gespeicherte Schichtzeiten (nach Gesamtzeit sortiert).' : 'Noch keine Schichten gespeichert.', { fields })], ephemeral: true });
      return;
    }
    const userId = name === 'schichtzeit' ? (i.options.getUser('mitglied')?.id ?? i.user.id) : i.user.id;
    if (name === 'einstempeln') {
      const result = await clockIn(i.user.id, i.guildId, ctx);
      await i.reply({ content: result.message, ephemeral: true });
      if (result.ok) await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Schicht begonnen', `${i.user} hat sich eingestempelt.`);
    } else if (name === 'ausstempeln') {
      const result = await clockOut(i.user.id, ctx);
      await i.reply({ content: result.message, ephemeral: true });
      if (result.ok) await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Schicht beendet', `${i.user} war ${elapsed(result.duration)} im Dienst.`);
    } else if (name === 'schichtstatus') {
      const shift = ctx.db.get('activeShifts', i.user.id);
      await i.reply({ content: shift ? `Du bist seit <t:${Math.floor(shift.startedAt / 1000)}:R> eingestempelt.` : 'Du bist aktuell nicht eingestempelt.', ephemeral: true });
    } else {
      if (userId !== i.user.id && !await requireStaff(i)) return;
      const totals = ctx.db.get('shiftTotals', userId, { totalMs: 0, shifts: 0 });
      const active = ctx.db.get('activeShifts', userId);
      const activeTime = active ? Date.now() - active.startedAt : 0;
      await i.reply({ embeds: [brandedEmbed('Schichtübersicht', `<@${userId}>\nAbgeschlossene Schichten: **${totals.shifts}**\nGesamtzeit: **${elapsed(totals.totalMs + activeTime)}**\nAktuell: ${active ? `seit <t:${Math.floor(active.startedAt / 1000)}:R> eingestempelt` : 'nicht eingestempelt'}`)], ephemeral: true });
    }
  },
};
