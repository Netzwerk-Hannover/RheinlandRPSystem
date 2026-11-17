import { SlashCommandBuilder } from 'discord.js';
import { attachAsset, brandedEmbed } from '../core/brand.js';

export default {
  name: 'hilfe',
  commands: [new SlashCommandBuilder().setName('help').setDescription('Zeigt die verfügbaren Rheinland-Netzwerk-Befehle').toJSON()],
  async execute(i) {
    const fields = [
      { name: 'Allgemein', value: '`/faq` · `/regelwerk` · `/servercode` · `/help`' },
      { name: 'Support', value: '`/ticketinfo` · `/support` · `/bewerbung` · `/icrechte`' },
      { name: 'Team', value: '`/teamliste` · `/einstempeln` · `/ausstempeln` · `/schichtstatus` · `/schichtzeit` · `/schichtliste`' },
      { name: 'Fraktionen', value: '`/fraktion` · `/frakliste` · `/fraknews` · `/fraktion-beantragen`' },
      { name: 'Leitstelle', value: '`/einsatz`' },
      { name: 'Community', value: '`/zeitung` · `/vorschlag-panel` · `/bug-panel`' },
      { name: 'Moderation / Verwaltung', value: '`/warn` · `/timeout` · `/untimeout` · `/kick` · `/ban` · `/purge` · `/slowmode` · `/blacklist` · `/uprank` · `/downrank` · `/teamupdate` · `/botdm`' },
    ];
    await i.reply(await attachAsset({ embeds: [brandedEmbed('Rheinland Netzwerk • Befehle', 'Die verfügbaren Befehle hängen von deinen Rollen und den aktivierten Modulen ab.', { fields })], ephemeral: true }, 'Hilfe'));
  },
};
