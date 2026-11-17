import { SlashCommandBuilder } from 'discord.js';
import { env } from '../core/config.js';
import { brandedEmbed, sendLog, sendPanel } from '../core/brand.js';
import { requireStaff } from '../core/permissions.js';

export default {
  name: 'safezones',
  commands: [new SlashCommandBuilder().setName('safezone').setDescription('Verwaltet Safezones')
    .addSubcommand((s) => s.setName('hinzufuegen').setDescription('Safezone eintragen').addStringOption((o) => o.setName('name').setDescription('Name/Ort').setRequired(true)).addStringOption((o) => o.setName('beschreibung').setDescription('Hinweis').setRequired(false)))
    .addSubcommand((s) => s.setName('entfernen').setDescription('Safezone entfernen').addStringOption((o) => o.setName('name').setDescription('Name/Ort').setRequired(true)))
    .addSubcommand((s) => s.setName('liste').setDescription('Safezones anzeigen')).toJSON()],
  async setup(ctx) {
    await sendPanel(ctx, 'safezones', 'SAFEZONE_CHANNEL_ID', { embeds: [brandedEmbed('Rheinland Netzwerk • Safezones', env('SAFEZONE_MESSAGE', 'In Safezones sind Überfälle, Gewalt und absichtliche Störungen untersagt.'))] });
  },
  async execute(i, ctx) {
    const sub = i.options.getSubcommand();
    if (sub === 'liste') {
      const entries = ctx.db.all('safezones');
      await i.reply({ embeds: [brandedEmbed('Safezone-Übersicht', entries.map(([name, value]) => `**${name}**\n${value.description || 'Keine weitere Beschreibung'}`).join('\n\n') || 'Noch keine Safezones eingetragen.')], ephemeral: true }); return;
    }
    if (!await requireStaff(i)) return;
    const name = i.options.getString('name');
    if (sub === 'hinzufuegen') await ctx.db.set('safezones', name, { description: i.options.getString('beschreibung') || '', by: i.user.id, createdAt: Date.now() });
    else await ctx.db.delete('safezones', name);
    await i.reply({ content: `Safezone **${name}** wurde ${sub === 'hinzufuegen' ? 'eingetragen' : 'entfernt'}.`, ephemeral: true });
    await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Safezone geändert', `${sub}: ${name}\nVon: ${i.user}`);
  },
};
