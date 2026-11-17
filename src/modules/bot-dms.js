import { SlashCommandBuilder } from 'discord.js';
import { env } from '../core/config.js';
import { brandedEmbed, sendLog } from '../core/brand.js';
import { requireStaff } from '../core/permissions.js';

export default {
  name: 'bot-dms-ic-rechte',
  commands: [
    new SlashCommandBuilder().setName('botdm').setDescription('Sendet eine DM über den Bot').addUserOption((o) => o.setName('mitglied').setDescription('Empfänger').setRequired(true)).addStringOption((o) => o.setName('nachricht').setDescription('Nachricht').setRequired(true).setMaxLength(1800)).toJSON(),
    new SlashCommandBuilder().setName('icrechte').setDescription('Fragt IC-Rechte direkt bei der Projektleitung an').addStringOption((o) => o.setName('anliegen').setDescription('Welche Rechte benötigst du?').setRequired(true).setMaxLength(1500)).toJSON(),
  ],
  async execute(i, ctx) {
    if (i.commandName === 'botdm') {
      if (!await requireStaff(i)) return;
      const user = i.options.getUser('mitglied'); const text = i.options.getString('nachricht');
      try {
        await user.send({ embeds: [brandedEmbed('Nachricht von Rheinland Netzwerk', text)] });
        await i.reply({ content: `DM an ${user.tag} wurde versendet.`, ephemeral: true });
        await sendLog(ctx, 'DISCORD_LOG_CHANNEL_ID', 'Bot-DM versendet', `Empfänger: ${user.tag} (${user.id})\nVon: ${i.user.tag}`);
      } catch { await i.reply({ content: 'Die DM konnte nicht zugestellt werden (möglicherweise private Nachrichten deaktiviert).', ephemeral: true }); }
      return;
    }
    const ownerId = env('IC_RIGHTS_OWNER_ID', '1416500277007225026');
    const owner = await ctx.client.users.fetch(ownerId).catch(() => null);
    if (!owner) { await i.reply({ content: 'Die zuständige Projektleitung ist derzeit nicht erreichbar.', ephemeral: true }); return; }
    const text = i.options.getString('anliegen');
    try {
      await owner.send({ embeds: [brandedEmbed('Anfrage auf IC-Rechte', `Angefragt von: ${i.user.tag} (${i.user.id})\nServer: ${i.guild.name}\n\n**Anliegen**\n${text}`)] });
      const logChannel = env('IC_RIGHTS_LOG_CHANNEL_ID');
      if (logChannel) await sendLog(ctx, 'IC_RIGHTS_LOG_CHANNEL_ID', 'IC-Rechte angefragt', `Von: ${i.user}\nAnliegen: ${text}`);
      await i.reply({ content: 'Deine Anfrage wurde direkt an die zuständige Projektleitung gesendet.', ephemeral: true });
    } catch { await i.reply({ content: 'Die Anfrage konnte nicht per DM zugestellt werden. Bitte eröffne ein Ticket.', ephemeral: true }); }
  },
};
