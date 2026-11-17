import { readFile } from 'node:fs/promises';
import { env } from '../core/config.js';
import { brandedEmbed } from '../core/brand.js';

export default {
  name: 'server-boost',
  async onMemberUpdate(oldMember, newMember, ctx) {
    if (oldMember.premiumSince || !newMember.premiumSince) return;
    const channelId = env('BOOST_CHANNEL_ID');
    const channel = channelId ? await newMember.client.channels.fetch(channelId).catch(() => null) : null;
    if (!channel?.isTextBased()) return;
    const embed = brandedEmbed(
      'Vielen Dank für deinen Server-Boost!',
      'Deine Unterstützung hilft Rheinland Netzwerk. Wir bedanken uns herzlich!',
    );
    let files = [];
    try {
      // "Boot.png" is the requested filename. "Boost.png" is accepted as a typo-safe alternative.
      let banner;
      let filename = 'Boot.png';
      try {
        banner = await readFile(new URL('../../assets/Boot.png', import.meta.url));
      } catch {
        filename = 'Boost.png';
        banner = await readFile(new URL('../../assets/Boost.png', import.meta.url));
      }
      embed.setImage('attachment://' + filename);
      files = [{ attachment: banner, name: filename }];
    } catch {
      ctx.logger.warn('[BOOST] assets/Boot.png beziehungsweise assets/Boost.png fehlt. Boost-Nachricht wird ohne Hauptbild gesendet.');
    }

    await channel.send({
      content: `<@${newMember.id}>`,
      embeds: [embed],
      files,
      allowedMentions: { users: [newMember.id] },
    });
  },
};
