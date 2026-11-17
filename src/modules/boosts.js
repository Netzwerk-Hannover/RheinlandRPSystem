import { env } from '../core/config.js';
import { brandedEmbed } from '../core/brand.js';

export default {
  name: 'server-boost',
  async onMemberUpdate(oldMember, newMember) {
    if (oldMember.premiumSince || !newMember.premiumSince) return;
    const channelId = env('BOOST_CHANNEL_ID');
    const channel = channelId ? await newMember.client.channels.fetch(channelId).catch(() => null) : null;
    if (!channel?.isTextBased()) return;
    await channel.send({ content: `<@${newMember.id}>`, embeds: [brandedEmbed('Vielen Dank für deinen Server-Boost!', 'Deine Unterstützung hilft Rheinland Netzwerk. Wir bedanken uns herzlich!')], allowedMentions: { users: [newMember.id] } });
  },
};
