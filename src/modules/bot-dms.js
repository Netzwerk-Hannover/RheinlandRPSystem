import { SlashCommandBuilder } from 'discord.js';
import { env } from '../core/config.js';
import { attachAsset, brandedEmbed, sendLog } from '../core/brand.js';
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
      const user = i.options.getUser('mitglied'); const message = i.options.getString('nachricht');
      try {
        await user.send(await attachAsset({ embeds: [brandedEmbed('Nachricht von Rheinland Netzwerk', message)] }, 'Bot-Nachricht'));
        await i.reply({ content: `DM an ${user.tag} wurde versendet.`, ephemeral: true });
        await sendLog(ctx, 'DISCORD_LOG_CHANNEL_ID', 'Bot-DM versendet', `Empfänger: ${user.tag} (${user.id})\nVon: ${i.user.tag}`);
      } catch { await i.reply({ content: 'Die DM konnte nicht zugestellt werden (möglicherweise private Nachrichten deaktiviert).', ephemeral: true }); }
      return;
    }
    const ownerId = env('IC_RIGHTS_OWNER_ID');
    if (!ownerId) {
      await i.reply({ content: 'Die IC-Rechte-Anfrage ist noch nicht konfiguriert. Die Projektleitung muss IC_RIGHTS_OWNER_ID in der .env eintragen.', ephemeral: true });
      return;
    }
    const owner = await ctx.client.users.fetch(ownerId).catch(() => null);
    if (!owner) { await i.reply({ content: 'Die zuständige Projektleitung ist derzeit nicht erreichbar.', ephemeral: true }); return; }
    const message = i.options.getString('anliegen');
    try {
      await owner.send(await attachAsset({ embeds: [brandedEmbed('Anfrage auf IC-Rechte', `Angefragt von: ${i.user.tag} (${i.user.id})\nServer: ${i.guild.name}\n\n**Anliegen**\n${message}`)] }, 'IC-Rechte'));
      if (env('IC_RIGHTS_LOG_CHANNEL_ID')) await sendLog(ctx, 'IC_RIGHTS_LOG_CHANNEL_ID', 'IC-Rechte angefragt', `Von: ${i.user}\nAnliegen: ${message}`);
      await i.reply({ content: 'Deine Anfrage wurde direkt an die zuständige Projektleitung gesendet.', ephemeral: true });
    } catch { await i.reply({ content: 'Die Anfrage konnte nicht per DM zugestellt werden. Bitte eröffne ein Ticket.', ephemeral: true }); }
  },
};
