import { AuditLogEvent } from 'discord.js';
import { sendLog } from '../core/brand.js';
import { list } from '../core/config.js';

const safeContent = (message) => (message?.content ?? '[kein Textinhalt]').slice(0, 1200);

export default {
  name: 'server-logs',
  async onMessageDelete(message, ctx) {
    if (!message.guild || message.author?.bot) return;
    await sendLog(ctx, 'DISCORD_LOG_CHANNEL_ID', 'Nachricht gelöscht', `Autor: ${message.author?.tag ?? 'Unbekannt'} (${message.author?.id ?? 'n/a'})\nKanal: <#${message.channelId}>\nInhalt: ${safeContent(message)}`);
  },
  async onMessageUpdate(oldMessage, newMessage, ctx) {
    if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
    await sendLog(ctx, 'DISCORD_LOG_CHANNEL_ID', 'Nachricht bearbeitet', `Autor: ${newMessage.author?.tag ?? 'Unbekannt'}\nKanal: <#${newMessage.channelId}>\nVorher: ${safeContent(oldMessage)}\nNachher: ${safeContent(newMessage)}`);
  },
  async onMemberUpdate(oldMember, newMember, ctx) {
    const added = newMember.roles.cache.filter((role) => !oldMember.roles.cache.has(role.id)).map((role) => role.name);
    const removed = oldMember.roles.cache.filter((role) => !newMember.roles.cache.has(role.id)).map((role) => role.name);
    if (added.length || removed.length || oldMember.nickname !== newMember.nickname) {
      const teamRoleIds = list('TEAM_ROLE_IDS');
      const teamRoleChanged = [...newMember.roles.cache.keys()].some((id) => teamRoleIds.includes(id) && !oldMember.roles.cache.has(id))
        || [...oldMember.roles.cache.keys()].some((id) => teamRoleIds.includes(id) && !newMember.roles.cache.has(id));
      const target = teamRoleChanged ? 'TEAM_LOG_CHANNEL_ID' : 'DISCORD_LOG_CHANNEL_ID';
      await sendLog(ctx, target, teamRoleChanged ? 'Team-Rollenänderung' : 'Mitglieds-/Rollenänderung', `Mitglied: ${newMember}\nHinzugefügt: ${added.join(', ') || 'Keine'}\nEntfernt: ${removed.join(', ') || 'Keine'}\nNickname: ${oldMember.nickname ?? '—'} → ${newMember.nickname ?? '—'}`);
    }
  },
  async onChannelCreate(channel, ctx) {
    if (channel.guild) await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Kanal erstellt', `Name: ${channel.name}\nID: ${channel.id}\nTyp: ${channel.type}`);
  },
  async onChannelDelete(channel, ctx) {
    if (channel.guild) await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Kanal gelöscht', `Name: ${channel.name}\nID: ${channel.id}`);
  },
  async onRoleCreate(role, ctx) { await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Rolle erstellt', `${role.name} (${role.id})`); },
  async onRoleDelete(role, ctx) { await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Rolle gelöscht', `${role.name} (${role.id})`); },
  async onGuildBanAdd(ban, ctx) { await sendLog(ctx, 'MOD_LOG_CHANNEL_ID', 'Mitglied gebannt', `${ban.user.tag} (${ban.user.id})`); },
  async onGuildBanRemove(ban, ctx) { await sendLog(ctx, 'MOD_LOG_CHANNEL_ID', 'Ban aufgehoben', `${ban.user.tag} (${ban.user.id})`); },
  async onVoiceStateUpdate(oldState, newState, ctx) {
    if (oldState.channelId === newState.channelId) return;
    const member = newState.member ?? oldState.member;
    await sendLog(ctx, 'DISCORD_LOG_CHANNEL_ID', 'Voice-Status geändert', `Mitglied: ${member}\nVorher: ${oldState.channel?.name ?? 'Nicht verbunden'}\nNachher: ${newState.channel?.name ?? 'Nicht verbunden'}`);
  },
  async onInviteCreate(invite, ctx) { await sendLog(ctx, 'DISCORD_LOG_CHANNEL_ID', 'Einladungslink erstellt', `Code: ${invite.code}\nErsteller: ${invite.inviter ?? 'Unbekannt'}\nKanal: ${invite.channel ?? 'Unbekannt'}`); },
  async onInviteDelete(invite, ctx) { await sendLog(ctx, 'DISCORD_LOG_CHANNEL_ID', 'Einladungslink gelöscht', `Code: ${invite.code}`); },
};
