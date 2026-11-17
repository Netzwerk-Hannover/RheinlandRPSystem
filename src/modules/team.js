import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { env, list } from '../core/config.js';
import { brandedEmbed, sendPanel } from '../core/brand.js';
import { isTeam } from '../core/permissions.js';

async function buildTeamEmbed(guild) {
  const hierarchy = list('TEAM_HIERARCHY_ROLE_IDS');
  const roleOrder = hierarchy.length ? hierarchy : list('TEAM_ROLE_IDS');
  if (!roleOrder.length) return brandedEmbed('Rheinland Netzwerk • Teamliste', 'TEAM_HIERARCHY_ROLE_IDS ist noch nicht konfiguriert.');
  const members = await guild.members.fetch();
  const buckets = new Map(roleOrder.map((id) => [id, []]));
  for (const member of members.values()) {
    const highest = roleOrder.find((roleId) => member.roles.cache.has(roleId));
    if (highest) buckets.get(highest).push(member);
  }
  const fields = roleOrder.map((roleId) => {
    const role = guild.roles.cache.get(roleId);
    const names = buckets.get(roleId).sort((a, b) => a.displayName.localeCompare(b.displayName, 'de')).map((member) => `• ${member}`).join('\n');
    return { name: role?.name ?? `Rolle ${roleId}`, value: names || 'Derzeit niemand eingetragen.', inline: false };
  });
  return brandedEmbed('Rheinland Netzwerk • Teamliste', `Aktuelle Teamübersicht\n${env('TEAM_MEETING_TEXT', 'Teambesprechung jeden Freitag um 18:00 Uhr.')}`, { fields });
}

async function refreshPanel(ctx) {
  const channelId = env('TEAMLIST_CHANNEL_ID');
  if (!channelId) return;
  const channel = await ctx.client.channels.fetch(channelId).catch(() => null);
  if (!channel?.guild || !channel.isTextBased()) return;
  const embed = await buildTeamEmbed(channel.guild);
  await sendPanel(ctx, 'teamlist', 'TEAMLIST_CHANNEL_ID', {
    embeds: [embed],
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('teamlist:refresh').setLabel('Teamliste aktualisieren').setStyle(ButtonStyle.Primary))],
  });
}

export default {
  name: 'teamliste',
  commands: [new SlashCommandBuilder().setName('teamliste').setDescription('Zeigt die aktuelle Rheinland-Netzwerk-Teamliste').toJSON()],
  async setup(ctx) { await refreshPanel(ctx); },
  async onInteraction(i, ctx) {
    if (!i.isButton() || i.customId !== 'teamlist:refresh') return false;
    await i.deferReply({ ephemeral: true });
    const embed = await buildTeamEmbed(i.guild);
    await i.editReply({ embeds: [embed] });
    await refreshPanel(ctx);
    return true;
  },
  async onMemberUpdate(oldMember, newMember, ctx) {
    const roleIds = list('TEAM_HIERARCHY_ROLE_IDS').length ? list('TEAM_HIERARCHY_ROLE_IDS') : list('TEAM_ROLE_IDS');
    const changed = roleIds.some((id) => oldMember.roles.cache.has(id) !== newMember.roles.cache.has(id));
    if (changed) await refreshPanel(ctx);
  },
  async execute(i) {
    await i.deferReply({ ephemeral: true });
    await i.editReply({ embeds: [await buildTeamEmbed(i.guild)] });
  },
};
