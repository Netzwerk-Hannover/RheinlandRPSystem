import { SlashCommandBuilder } from 'discord.js';
import { sendLog } from '../core/brand.js';
import { bool } from '../core/config.js';
import { requireStaff } from '../core/permissions.js';

export default {
  name: 'blacklist',
  async onMemberAdd(member, ctx) {
    const entry = ctx.db.get('blacklist', member.id);
    if (!entry || !bool('BLACKLIST_AUTO_BAN', true)) return;
    await member.ban({ reason: `Rheinland Netzwerk Blacklist: ${entry.reason}` }).catch((error) => ctx.logger.warn(`[BLACKLIST] Auto-Ban für ${member.id} fehlgeschlagen: ${error.message}`));
    await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Blacklist-Mitglied erkannt', `${member.user.tag} (${member.id}) ist beigetreten und wurde anhand eines Blacklist-Eintrags gebannt. Grund: ${entry.reason}`);
  },
  commands: [new SlashCommandBuilder().setName('blacklist').setDescription('Verwaltet die Rheinland-Netzwerk-Blacklist')
    .addSubcommand((s) => s.setName('add').setDescription('Mitglied auf die Blacklist setzen').addStringOption((o) => o.setName('userid').setDescription('Discord-ID').setRequired(true)).addStringOption((o) => o.setName('grund').setDescription('Grund').setRequired(true)))
    .addSubcommand((s) => s.setName('remove').setDescription('Blacklist-Eintrag entfernen').addStringOption((o) => o.setName('userid').setDescription('Discord-ID').setRequired(true)))
    .addSubcommand((s) => s.setName('check').setDescription('Blacklist-Eintrag prüfen').addStringOption((o) => o.setName('userid').setDescription('Discord-ID').setRequired(true)))
    .addSubcommand((s) => s.setName('list').setDescription('Blacklist anzeigen')).toJSON()],
  async execute(i, ctx) {
    if (!await requireStaff(i)) return;
    const sub = i.options.getSubcommand();
    if (sub === 'add') {
      const id = i.options.getString('userid'); const reason = i.options.getString('grund');
      await ctx.db.set('blacklist', id, { reason, by: i.user.id, createdAt: Date.now() });
      await i.reply({ content: `\`${id}\` wurde zur Blacklist hinzugefügt.`, ephemeral: true });
      await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Blacklist: Eintrag hinzugefügt', `ID: ${id}\nGrund: ${reason}\nVon: ${i.user}`);
    } else if (sub === 'remove') {
      const id = i.options.getString('userid'); await ctx.db.delete('blacklist', id);
      await i.reply({ content: `Blacklist-Eintrag für \`${id}\` entfernt.`, ephemeral: true });
      await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Blacklist: Eintrag entfernt', `ID: ${id}\nVon: ${i.user}`);
    } else if (sub === 'check') {
      const id = i.options.getString('userid'); const entry = ctx.db.get('blacklist', id);
      await i.reply({ content: entry ? `**Gelistet**\nGrund: ${entry.reason}\nSeit: <t:${Math.floor(entry.createdAt / 1000)}:R>` : 'Kein Blacklist-Eintrag gefunden.', ephemeral: true });
    } else {
      const entries = ctx.db.all('blacklist').slice(0, 20);
      await i.reply({ content: entries.length ? entries.map(([id, v]) => `• \`${id}\` – ${v.reason}`).join('\n') : 'Die Blacklist ist leer.', ephemeral: true });
    }
  },
};
