import { SlashCommandBuilder } from 'discord.js';
import { env } from '../core/config.js';
import { brandedEmbed, sendPanel } from '../core/brand.js';

const choices = [
  { name: 'Discord-Regelwerk', value: 'discord' },
  { name: 'Ingame-Regelwerk', value: 'ingame' },
  { name: 'Team-Regelwerk', value: 'team' },
  { name: 'Content-Creator-Regelwerk', value: 'creator' },
];

const rules = {
  discord: { channel: 'RULES_DISCORD_CHANNEL_ID', title: 'Discord-Regelwerk', content: () => [
    `**Discord Terms of Service:** ${env('DISCORD_TOS_URL', 'https://discord.com/terms')}`,
    `**Datenschutzrichtlinie:** ${env('DISCORD_PRIVACY_URL', 'https://discord.com/privacy')}`,
    `**Community Guidelines:** ${env('DISCORD_GUIDELINES_URL', 'https://discord.com/guidelines')}`,
    `**Developer Terms of Service:** ${env('DISCORD_DEVELOPER_TOS_URL', 'https://discord.com/developers/docs/policies-and-agreements/developer-terms-of-service')}`,
    `**Developer Policy:** ${env('DISCORD_DEVELOPER_POLICY_URL', 'https://discord.com/developers/docs/policies-and-agreements/developer-policy')}`,
    '\nAlle Mitglieder müssen die jeweils aktuellen Discord-Richtlinien einhalten.',
  ].join('\n') },
  ingame: { channel: 'RULES_INGAME_CHANNEL_ID', title: 'Ingame-Regelwerk', content: () => env('RULES_INGAME', 'Das Ingame-Regelwerk wird derzeit vorbereitet. Bitte beachte die Anweisungen des Teams.') },
  team: { channel: 'RULES_TEAM_CHANNEL_ID', title: 'Team-Regelwerk', content: () => env('RULES_TEAM', 'Das Team-Regelwerk wird derzeit vorbereitet. Bitte beachte die Anweisungen der Projektleitung.') },
  creator: { channel: 'RULES_CREATOR_CHANNEL_ID', title: 'Content-Creator-Regelwerk', content: () => env('RULES_CREATOR', 'Das Content-Creator-Regelwerk wird derzeit vorbereitet. Bitte beachte die Anweisungen des Teams.') },
};

export default {
  name: 'regelwerke',
  commands: [new SlashCommandBuilder().setName('regelwerk').setDescription('Zeigt ein Regelwerk von Rheinland Netzwerk').addStringOption((o) => o.setName('bereich').setDescription('Gewünschtes Regelwerk').setRequired(true).addChoices(...choices)).toJSON()],
  async setup(ctx) {
    for (const [key, rule] of Object.entries(rules)) {
      await sendPanel(ctx, `rules-${key}`, rule.channel, { embeds: [brandedEmbed(`Rheinland Netzwerk • ${rule.title}`, rule.content())] });
    }
  },
  async execute(i) {
    const area = i.options.getString('bereich');
    const rule = rules[area];
    if (!rule) { await i.reply({ content: 'Dieses Regelwerk wurde nicht gefunden.', ephemeral: true }); return; }
    await i.reply({ embeds: [brandedEmbed(`Rheinland Netzwerk • ${rule.title}`, rule.content())], ephemeral: true });
  },
};
