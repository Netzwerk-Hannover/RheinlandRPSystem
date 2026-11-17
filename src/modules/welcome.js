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
    const description = "Hey {user}, danke, dass du zu uns gefunden hast. Wir sind Rheinland Netzwerk, ein deutscher Mid-Hardcore-Roleplay-Server auf Roblox (Notruf Hamburg).\n\n> **Schritt-für-Schritt-Anleitung, um dich einzufinden**\n>\n> Gehe zur Verifizierung und verifiziere dich:\n> <#1570163281786839071>\n>\n> Als Nächstes gehe zum Discord-Regelwerk und lies es aufmerksam:\n> <#1570164000426295436>\n>\n> Zuletzt kannst du dir den Discord in Ruhe anschauen und Hallo sagen:\n> <#1570167414107414528>\n\nViel Spaß und hoffentlich ein gutes Roleplay!\n\nDein *Rheinland Netzwerk Support-Team*"
      .replaceAll('{user}', `<@${member.id}>`)
      .replaceAll('{username}', member.user.username);

    const embed = brandedEmbed('Herzlich willkommen auf Rheinland Netzwerk', description, {
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
