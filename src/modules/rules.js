import { SlashCommandBuilder } from 'discord.js';
import { env } from '../core/config.js';
import { brandedEmbed } from '../core/brand.js';

const choices = [
  { name: 'Discord-Regelwerk', value: 'discord' },
  { name: 'Ingame-Regelwerk', value: 'ingame' },
  { name: 'Team-Regelwerk', value: 'team' },
  { name: 'Content-Creator-Regelwerk', value: 'creator' },
];

export default {
  name: 'regelwerke',
  commands: [new SlashCommandBuilder().setName('regelwerk').setDescription('Zeigt ein Regelwerk von Rheinland Netzwerk').addStringOption((o) => o.setName('bereich').setDescription('Gewünschtes Regelwerk').setRequired(true).addChoices(...choices)).toJSON()],
  async execute(i) {
    const area = i.options.getString('bereich');
    let description = ''; let title = '';
    if (area === 'discord') {
      title = 'Discord-Regelwerk & offizielle Richtlinien';
      description = [
        `**Discord Terms of Service:** ${env('DISCORD_TOS_URL', 'https://discord.com/terms')}`,
        `**Datenschutzrichtlinie:** ${env('DISCORD_PRIVACY_URL', 'https://discord.com/privacy')}`,
        `**Community Guidelines:** ${env('DISCORD_GUIDELINES_URL', 'https://discord.com/guidelines')}`,
        `**Developer Terms of Service:** ${env('DISCORD_DEVELOPER_TOS_URL', 'https://discord.com/developers/docs/policies-and-agreements/developer-terms-of-service')}`,
        `**Developer Policy:** ${env('DISCORD_DEVELOPER_POLICY_URL', 'https://discord.com/developers/docs/policies-and-agreements/developer-policy')}`,
        '\nAlle Mitglieder müssen die jeweils aktuellen Discord-Richtlinien einhalten.',
      ].join('\n');
    } else {
      title = area === 'ingame' ? 'Ingame-Regelwerk' : area === 'team' ? 'Team-Regelwerk' : 'Content-Creator-Regelwerk';
      const key = area === 'ingame' ? 'RULES_INGAME' : area === 'team' ? 'RULES_TEAM' : 'RULES_CREATOR';
      description = env(key, 'Dieses Regelwerk wird derzeit vorbereitet. Bitte frage das Team.');
    }
    await i.reply({ embeds: [brandedEmbed(`Rheinland Netzwerk • ${title}`, description)], ephemeral: true });
  },
};
