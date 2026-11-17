import { readFile } from 'node:fs/promises';
import { env } from '../core/config.js';
import { brandedEmbed } from '../core/brand.js';

export default {
  name: 'welcome-leave',
  async onMemberAdd(member, ctx) {
    const channelId = env('WELCOME_CHANNEL_ID');
    if (!channelId) return;
    const channel = await ctx.client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return;
    const description = env('WELCOME_MESSAGE', 'Willkommen bei Rheinland Netzwerk, {user}!')
      .replaceAll('{user}', `<@${member.id}>`).replaceAll('{username}', member.user.username);

    const embed = brandedEmbed('Willkommen bei Rheinland Netzwerk', description, {
      thumbnail: member.user.displayAvatarURL({ size: 256 }),
    });
    let files = [];
    try {
      const banner = await readFile(new URL('../../assets/Willkommen.png', import.meta.url));
      embed.setImage('attachment://Willkommen.png');
      files = [{ attachment: banner, name: 'Willkommen.png' }];
    } catch {
      ctx.logger.warn('[WELCOME] assets/Willkommen.png fehlt. Willkommensnachricht wird ohne Hauptbild gesendet.');
    }

    await channel.send({
      content: `<@${member.id}>`,
      embeds: [embed],
      files,
      allowedMentions: { users: [member.id] },
    });
  },
  async onMemberRemove(member, ctx) {
    const channelId = env('LEAVE_CHANNEL_ID');
    if (!channelId) return;
    const channel = await ctx.client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return;
    const description = env('LEAVE_MESSAGE', '{username} hat Rheinland Netzwerk verlassen.')
      .replaceAll('{username}', member.user?.username ?? member.displayName ?? 'Ein Mitglied');
    const embed = brandedEmbed('Mitglied ausgetreten', description, {
      thumbnail: member.user?.displayAvatarURL?.({ size: 256 }),
    });
    let files = [];
    try {
      const banner = await readFile(new URL('../../assets/Verlassen.png', import.meta.url));
      embed.setImage('attachment://Verlassen.png');
      files = [{ attachment: banner, name: 'Verlassen.png' }];
    } catch {
      ctx.logger.warn('[WELCOME] assets/Verlassen.png fehlt. Austrittsnachricht wird ohne Hauptbild gesendet.');
    }
    await channel.send({ embeds: [embed], files });
  },
};
