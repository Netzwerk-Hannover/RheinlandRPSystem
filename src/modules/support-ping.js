import { SlashCommandBuilder } from 'discord.js';
import { env, int } from '../core/config.js';
import { sendLog } from '../core/brand.js';

export default {
  name: 'support-ping',
  commands: [new SlashCommandBuilder().setName('support').setDescription('Fordert das Support-Team an').addStringOption((o) => o.setName('anliegen').setDescription('Kurze Beschreibung').setRequired(true).setMaxLength(500)).toJSON()],
  async execute(i, ctx) {
    const roleId = env('SUPPORT_ROLE_ID'); const channelId = env('SUPPORT_PING_CHANNEL_ID');
    if (!roleId || !channelId) { await i.reply({ content: 'Support-Ping ist noch nicht konfiguriert.', ephemeral: true }); return; }
    const last = ctx.db.get('supportCooldown', i.user.id, 0);
    if (Date.now() - last < int('SUPPORT_COOLDOWN_SECONDS', 300, 30, 3600) * 1000) { await i.reply({ content: 'Bitte warte noch, bevor du erneut den Support pingst.', ephemeral: true }); return; }
    const channel = await ctx.client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) { await i.reply({ content: 'Der Support-Kanal ist nicht erreichbar.', ephemeral: true }); return; }
    const issue = i.options.getString('anliegen');
    await channel.send({ content: `<@&${roleId}> Support-Anfrage von <@${i.user.id}>\n**Anliegen:** ${issue}`, allowedMentions: { roles: [roleId], users: [i.user.id] } });
    await ctx.db.set('supportCooldown', i.user.id, Date.now());
    await i.reply({ content: 'Das Support-Team wurde benachrichtigt.', ephemeral: true });
    await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Support-Ping', `${i.user} hat Support angefordert. Anliegen: ${issue}`);
  },
};
