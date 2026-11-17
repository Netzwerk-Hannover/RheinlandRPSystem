import { SlashCommandBuilder } from 'discord.js';
import { env } from '../core/config.js';
import { brandedEmbed, sendPanel } from '../core/brand.js';

const description = () => [
  env('SERVER_INFO_TEXT', 'Willkommen bei Rheinland Netzwerk.'),
  env('SERVER_CODE') ? `**Server-Code:** \`${env('SERVER_CODE')}\`` : '**Server-Code:** Noch nicht hinterlegt.',
  env('SERVER_JOIN_LINK') ? `**Beitreten:** ${env('SERVER_JOIN_LINK')}` : '',
  `\n**Voraussetzungen**\n${env('TEAM_REQUIREMENTS', 'Mindestens 14 Jahre; PC ab HighTeam; gutes und funktionierendes Mikrofon.')}`,
  `\n**Teambesprechung**\n${env('TEAM_MEETING_TEXT', 'Jeden Freitag um 18:00 Uhr.')}`,
].filter(Boolean).join('\n');

export default {
  name: 'servercode-emed',
  commands: [new SlashCommandBuilder().setName('servercode').setDescription('Zeigt Server-Code und wichtige Rheinland-Netzwerk-Informationen').toJSON()],
  async setup(ctx) {
    await sendPanel(ctx, 'server-info', 'SERVER_INFO_CHANNEL_ID', { embeds: [brandedEmbed('Rheinland Netzwerk • Server-Informationen', description())] });
  },
  async execute(i) { await i.reply({ embeds: [brandedEmbed('Rheinland Netzwerk • Server-Informationen', description())], ephemeral: true }); },
};
