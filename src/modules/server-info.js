import { SlashCommandBuilder } from 'discord.js';
import { env } from '../core/config.js';
import { brandedEmbed, sendPanel } from '../core/brand.js';

const description = () => {
  const code = env('SERVER_CODE') ? '`' + env('SERVER_CODE') + '`' : 'Der Server-Code ist aktuell noch nicht hinterlegt.';
  const instructions = env(
    'SERVER_CODE_INSTRUCTIONS',
    'Öffne Roblox, starte das passende Spiel und gehe zu „Private Server“ beziehungsweise „Join by Code“. Gib dort den unten stehenden Code ein und bestätige den Beitritt.',
  );
  const directLink = env('SERVER_JOIN_LINK');
  return instructions + '\n\n**Server-Code**\n' + code + (directLink ? '\n\n**Direkt öffnen:** ' + directLink : '');
};

export default {
  name: 'servercode-emed',
  commands: [new SlashCommandBuilder().setName('servercode').setDescription('Zeigt den Rheinland-Netzwerk-Servercode und den Beitrittsweg').toJSON()],
  async setup(ctx) {
    await sendPanel(ctx, 'server-info', 'SERVER_INFO_CHANNEL_ID', {
      embeds: [brandedEmbed('Rheinland Netzwerk • Server-Code', description())],
    });
  },
  async execute(interaction) {
    await interaction.reply({ embeds: [brandedEmbed('Rheinland Netzwerk • Server-Code', description())], ephemeral: true });
  },
};
