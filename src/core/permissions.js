import { PermissionFlagsBits } from 'discord.js';
import { list } from './config.js';

export function isOwner(userId) {
  return list('BOT_OWNER_IDS').includes(userId);
}

export function hasAnyRole(member, roleIds) {
  if (!member || !roleIds?.length) return false;
  return roleIds.some((id) => member.roles?.cache?.has(id));
}

export function isStaff(member) {
  return Boolean(
    member?.permissions?.has(PermissionFlagsBits.Administrator) ||
    isOwner(member?.id) ||
    hasAnyRole(member, [...list('ADMIN_ROLE_IDS'), ...list('MANAGEMENT_ROLE_IDS'), ...list('TEAM_ADMIN_ROLE_IDS')]),
  );
}

export function isTeam(member) {
  return isStaff(member) || hasAnyRole(member, list('TEAM_ROLE_IDS'));
}

export async function requireStaff(interaction) {
  if (isStaff(interaction.member)) return true;
  await interaction.reply({ content: 'Dafür fehlen dir die erforderlichen Teamrechte.', ephemeral: true });
  return false;
}
