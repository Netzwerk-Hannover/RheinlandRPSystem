import { SlashCommandBuilder } from 'discord.js';
import { env } from '../core/config.js';
import { attachAsset, brandedEmbed, sendLog } from '../core/brand.js';
import { requireStaff } from '../core/permissions.js';

const deptChoices = [
  { name: 'Polizei', value: 'police' }, { name: 'Feuerwehr', value: 'fire' }, { name: 'HARS', value: 'hars' },
  { name: 'Tuningwerkstatt', value: 'tuning' }, { name: 'Autohaus', value: 'autohaus' }, { name: 'Krankenhaus', value: 'hospital' },
];
const roleFor = (type) => ({ police: 'POLICE_ROLE_ID', fire: 'FIRE_ROLE_ID', hars: 'HARS_ROLE_ID', tuning: 'TUNING_ROLE_ID', autohaus: 'AUTOHAUS_ROLE_ID', hospital: 'HOSPITAL_ROLE_ID' })[type];

export default {
  name: 'leitstelle-einsatzsystem',
  commands: [new SlashCommandBuilder().setName('einsatz').setDescription('Leitstellen- und Einsatzverwaltung')
    .addSubcommand((s) => s.setName('erstellen').setDescription('Neuen Einsatz eröffnen').addStringOption((o) => o.setName('titel').setDescription('Einsatzart').setRequired(true).setMaxLength(100)).addStringOption((o) => o.setName('ort').setDescription('Einsatzort').setRequired(true).setMaxLength(120)).addStringOption((o) => o.setName('abteilung').setDescription('Zuständige Fraktion').setRequired(true).addChoices(...deptChoices)).addStringOption((o) => o.setName('details').setDescription('Lagebeschreibung').setRequired(false).setMaxLength(1200)))
    .addSubcommand((s) => s.setName('status').setDescription('Einsatzstatus ändern').addStringOption((o) => o.setName('id').setDescription('Einsatz-ID').setRequired(true)).addStringOption((o) => o.setName('status').setDescription('Neuer Status').setRequired(true).addChoices({ name: 'Aktiv', value: 'aktiv' }, { name: 'Rückfahrt', value: 'rueckfahrt' }, { name: 'Abgeschlossen', value: 'abgeschlossen' })))
    .addSubcommand((s) => s.setName('liste').setDescription('Aktive Einsätze anzeigen')).toJSON()],
  async execute(i, ctx) {
    const sub = i.options.getSubcommand();
    if (sub === 'liste') {
      const active = ctx.db.all('incidents').filter(([, v]) => v.status !== 'abgeschlossen');
      await i.reply({ embeds: [brandedEmbed('Leitstelle • Aktive Einsätze', active.map(([id, v]) => `**${id}** · ${v.title}\nOrt: ${v.location}\nAbteilung: ${v.department}\nStatus: ${v.status}`).join('\n\n') || 'Keine aktiven Einsätze.')], ephemeral: true }); return;
    }
    if (!await requireStaff(i)) return;
    if (sub === 'erstellen') {
      const title = i.options.getString('titel'); const location = i.options.getString('ort'); const department = i.options.getString('abteilung');
      const id = `RN-${Date.now().toString(36).toUpperCase()}`;
      const entry = { id, title, location, department, details: i.options.getString('details') || '', status: 'aktiv', createdBy: i.user.id, createdAt: Date.now() };
      await ctx.db.set('incidents', id, entry);
      const channelId = env('EINSATZ_CHANNEL_ID'); const channel = channelId ? await ctx.client.channels.fetch(channelId).catch(() => null) : null;
      const roleId = env(roleFor(department));
      if (channel?.isTextBased()) {
        const embed = brandedEmbed(`Leitstelle • ${title}`, `**Einsatz-ID:** ${id}\n**Ort:** ${location}\n**Abteilung:** ${department.toUpperCase()}\n**Lage:** ${entry.details || 'Keine weiteren Angaben'}\n**Status:** Aktiv`);
        const payload = await attachAsset({ content: roleId ? `<@&${roleId}>` : undefined, embeds: [embed], allowedMentions: { roles: roleId ? [roleId] : [] } }, 'Leitstelle');
        await channel.send(payload);
      }
      await i.reply({ content: `Einsatz **${id}** wurde eröffnet.`, ephemeral: true });
      await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Neuer Einsatz', `${id}: ${title}\nOrt: ${location}\nAbteilung: ${department}\nErstellt von: ${i.user}`);
    } else {
      const id = i.options.getString('id'); const entry = ctx.db.get('incidents', id);
      if (!entry) { await i.reply({ content: 'Einsatz nicht gefunden.', ephemeral: true }); return; }
      entry.status = i.options.getString('status'); entry.updatedAt = Date.now(); await ctx.db.set('incidents', id, entry);
      await i.reply({ content: `Einsatz **${id}** steht jetzt auf **${entry.status}**.`, ephemeral: true });
      await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Einsatzstatus geändert', `${id}: ${entry.status}\nVon: ${i.user}`);
    }
  },
};
