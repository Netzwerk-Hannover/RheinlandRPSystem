import { SlashCommandBuilder } from 'discord.js';
import { env } from '../core/config.js';
import { attachAsset, brandedEmbed, sendLog } from '../core/brand.js';
import { requireStaff } from '../core/permissions.js';

export default {
  name: 'zeitungssystem',
  commands: [new SlashCommandBuilder().setName('zeitung').setDescription('Veröffentlicht einen Zeitungsartikel mit optionalem Bild')
    .addStringOption((o) => o.setName('titel').setDescription('Überschrift').setRequired(true).setMaxLength(200))
    .addStringOption((o) => o.setName('text').setDescription('Artikeltext').setRequired(true).setMaxLength(3500))
    .addAttachmentOption((o) => o.setName('bild').setDescription('Bild für den Artikel').setRequired(false))
    .addBooleanOption((o) => o.setName('ping').setDescription('News-Rolle erwähnen').setRequired(false)).toJSON()],
  async execute(i, ctx) {
    if (!await requireStaff(i)) return;
    const channelId = env('NEWS_CHANNEL_ID'); const channel = channelId ? await ctx.client.channels.fetch(channelId).catch(() => null) : null;
    if (!channel?.isTextBased()) { await i.reply({ content: 'NEWS_CHANNEL_ID ist nicht eingerichtet.', ephemeral: true }); return; }
    const attachment = i.options.getAttachment('bild');
    if (attachment && !attachment.contentType?.startsWith('image/')) { await i.reply({ content: 'Der Anhang muss eine Bilddatei sein.', ephemeral: true }); return; }
    const roleId = i.options.getBoolean('ping') ? env('NEWSPAPER_DEFAULT_PING_ROLE_ID') : '';
    const embed = brandedEmbed(i.options.getString('titel'), i.options.getString('text'), { image: attachment?.url });
    await channel.send(await attachAsset({ content: roleId ? `<@&${roleId}>` : undefined, embeds: [embed], allowedMentions: { roles: roleId ? [roleId] : [] } }, 'News'));
    await i.reply({ content: 'Zeitungsartikel wurde veröffentlicht.', ephemeral: true });
    await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Zeitungsartikel veröffentlicht', `Titel: ${i.options.getString('titel')}\nVon: ${i.user}`);
  },
};
