import { env } from '../core/config.js';
import { attachAsset, brandedEmbed } from '../core/brand.js';

export default {
  name: 'team-meetings',
  async setup(ctx) {
    if (ctx.meetingTimer) clearInterval(ctx.meetingTimer);
    ctx.meetingTimer = setInterval(async () => {
      const channelId = env('TEAM_MEETING_CHANNEL_ID');
      if (!channelId) return;
      const now = new Date();
      const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
      const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      if (values.weekday !== 'Fri' || values.hour !== '18' || values.minute !== '00') return;
      const dateKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
      if (ctx.db.get('teamMeetings', dateKey)) return;
      const channel = await ctx.client.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased()) return;
      const roleId = env('TEAM_PING_ROLE_ID');
      const embed = brandedEmbed('Teambesprechung • Rheinland Netzwerk', 'Die wöchentliche Teambesprechung beginnt jetzt.\n\n**Termin:** Freitag, 18:00 Uhr\nBitte pünktlich erscheinen.');
      await channel.send(await attachAsset({ content: roleId ? `<@&${roleId}>` : undefined, embeds: [embed], allowedMentions: { roles: roleId ? [roleId] : [] } }, 'Teambesprechung'));
      await ctx.db.set('teamMeetings', dateKey, { sentAt: Date.now() });
    }, 30000);
  },
};
