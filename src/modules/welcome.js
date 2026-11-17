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
    await channel.send({ content: `<@${member.id}>`, embeds: [brandedEmbed('Willkommen bei Rheinland Netzwerk', description)], allowedMentions: { users: [member.id] } });
  },
  async onMemberRemove(member, ctx) {
    const channelId = env('LEAVE_CHANNEL_ID');
    if (!channelId) return;
    const channel = await ctx.client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) return;
    const description = env('LEAVE_MESSAGE', '{username} hat Rheinland Netzwerk verlassen.')
      .replaceAll('{username}', member.user?.username ?? member.displayName ?? 'Ein Mitglied');
    await channel.send({ embeds: [brandedEmbed('Mitglied ausgetreten', description)] });
  },
};
