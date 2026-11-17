import { SlashCommandBuilder } from 'discord.js';
import { bool, int } from '../core/config.js';
import { brandedEmbed, sendLog } from '../core/brand.js';
import { isTeam, requireStaff } from '../core/permissions.js';

const elapsed = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 3600)}h ${Math.floor((total % 3600) / 60)}m`;
};

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
    if (ctx.shiftTimer) clearInterval(ctx.shiftTimer);
    ctx.shiftTimer = setInterval(async () => {
      if (!bool('SHIFT_AUTO_CLOCKOUT', true)) return;
      const max = int('SHIFT_MAX_HOURS', 3, 1, 24) * 3600000;
      for (const [userId, shift] of ctx.db.all('activeShifts')) {
        if (Date.now() - shift.startedAt < max) continue;
        const duration = max;
        await ctx.db.delete('activeShifts', userId);
        const rows = ctx.db.get('shiftTotals', userId, { totalMs: 0, shifts: 0 });
        rows.totalMs += duration; rows.shifts += 1;
        await ctx.db.set('shiftTotals', userId, rows);
        await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Automatisch ausgestempelt', `<@${userId}> wurde nach ${int('SHIFT_MAX_HOURS', 3)} Stunden automatisch ausgestempelt. Dauer: ${elapsed(duration)}.`);
      }
    }, 60000);
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
        const duration = totals.totalMs + (active ? Date.now() - active.startedAt : 0);
        rows.push({ userId, duration, shifts: totals.shifts, active });
      }
      rows.sort((a, b) => b.duration - a.duration);
      const fields = rows.slice(0, 25).map((row) => ({ name: `<@${row.userId}>`, value: `${elapsed(row.duration)} · ${row.shifts} beendete Schichten${row.active ? ' · aktuell im Dienst' : ''}`, inline: false }));
      await i.reply({ embeds: [brandedEmbed('Schichtsystem • Teamübersicht', fields.length ? 'Gespeicherte Schichtzeiten (nach Gesamtzeit sortiert).' : 'Noch keine Schichten gespeichert.', { fields })], ephemeral: true });
      return;
    }
    const userId = name === 'schichtzeit' ? (i.options.getUser('mitglied')?.id ?? i.user.id) : i.user.id;
    if (name === 'einstempeln') {
      const existing = ctx.db.get('activeShifts', i.user.id);
      if (existing) { await i.reply({ content: `Du bist bereits seit <t:${Math.floor(existing.startedAt / 1000)}:R> eingestempelt.`, ephemeral: true }); return; }
      await ctx.db.set('activeShifts', i.user.id, { startedAt: Date.now(), guildId: i.guildId });
      await i.reply({ content: 'Du bist jetzt eingestempelt. Danke für deinen Dienst!', ephemeral: true });
      await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Schicht begonnen', `${i.user} hat sich eingestempelt.`);
    } else if (name === 'ausstempeln') {
      const shift = ctx.db.get('activeShifts', i.user.id);
      if (!shift) { await i.reply({ content: 'Du bist aktuell nicht eingestempelt.', ephemeral: true }); return; }
      const duration = Date.now() - shift.startedAt; await ctx.db.delete('activeShifts', i.user.id);
      const rows = ctx.db.get('shiftTotals', i.user.id, { totalMs: 0, shifts: 0 }); rows.totalMs += duration; rows.shifts += 1; await ctx.db.set('shiftTotals', i.user.id, rows);
      await i.reply({ embeds: [brandedEmbed('Schicht beendet', `Deine Schicht dauerte **${elapsed(duration)}**. Gesamtzeit: **${elapsed(rows.totalMs)}**.`)], ephemeral: true });
      await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Schicht beendet', `${i.user} war ${elapsed(duration)} im Dienst.`);
    } else if (name === 'schichtstatus') {
      const shift = ctx.db.get('activeShifts', i.user.id); await i.reply({ content: shift ? `Du bist seit <t:${Math.floor(shift.startedAt / 1000)}:R> eingestempelt.` : 'Du bist aktuell nicht eingestempelt.', ephemeral: true });
    } else {
      if (userId !== i.user.id && !await requireStaff(i)) return;
      const totals = ctx.db.get('shiftTotals', userId, { totalMs: 0, shifts: 0 }); const active = ctx.db.get('activeShifts', userId);
      const activeTime = active ? Date.now() - active.startedAt : 0;
      await i.reply({ embeds: [brandedEmbed('Schichtübersicht', `<@${userId}>\nAbgeschlossene Schichten: **${totals.shifts}**\nGesamtzeit: **${elapsed(totals.totalMs + activeTime)}**\nAktuell: ${active ? `seit <t:${Math.floor(active.startedAt / 1000)}:R> eingestempelt` : 'nicht eingestempelt'}`)], ephemeral: true });
    }
  },
};
