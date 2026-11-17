import { AuditLogEvent } from 'discord.js';
import { bool, int, list, csvWords, env } from '../core/config.js';
import { sendLog } from '../core/brand.js';
import { isStaff } from '../core/permissions.js';

const joinWindows = new Map();
const messageWindows = new Map();
const normalized = (text) => text.trim().toLowerCase().replace(/\s+/g, ' ');

async function checkNuke(guild, type, ctx) {
  if (!bool('ANTI_NUKE_ENABLED', true)) return;
  try {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const action = type === 'channel' ? AuditLogEvent.ChannelDelete : AuditLogEvent.RoleDelete;
    const logs = await guild.fetchAuditLogs({ type: action, limit: 3 });
    const entry = logs.entries.find((item) => Date.now() - item.createdTimestamp < 10000);
    const executor = entry?.executor;
    if (!executor || executor.id === ctx.client.user.id) return;
    await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', `Anti-Nuke: ${type === 'channel' ? 'Kanal' : 'Rolle'} gelöscht`, `Ausführender: ${executor.tag} (${executor.id})\nZiel: ${entry.target?.name ?? entry.targetId ?? 'Unbekannt'}\nAktion: ${env('ANTI_NUKE_ACTION', 'log')}`);
    if (env('ANTI_NUKE_ACTION', 'log').toLowerCase() === 'ban') {
      if (!list('BOT_OWNER_IDS').includes(executor.id)) await guild.members.ban(executor.id, { reason: `Rheinland Anti-Nuke: auffällige ${type}-Löschaktion` }).catch((error) => ctx.logger.warn(`[ANTI-NUKE] Ban nicht möglich: ${error.message}`));
    }
  } catch (error) { ctx.logger.warn(`[ANTI-NUKE] Audit-Log konnte nicht geprüft werden: ${error.message}`); }
}

export default {
  name: 'raid-nuke-spam-honeypot-schutz',
  async onMemberAdd(member, ctx) {
    if (!bool('ANTI_RAID_ENABLED', true)) return;
    const now = Date.now(); const windowMs = int('ANTI_RAID_WINDOW_SECONDS', 10, 2, 60) * 1000;
    const recent = (joinWindows.get(member.guild.id) ?? []).filter((time) => now - time <= windowMs);
    recent.push(now); joinWindows.set(member.guild.id, recent);
    if (recent.length >= int('ANTI_RAID_MAX_JOINS', 8, 3, 100)) {
      const quarantine = env('RAID_QUARANTINE_ROLE_ID');
      if (quarantine) await member.roles.add(quarantine, 'Rheinland Anti-Raid Schutz').catch(() => null);
      await member.timeout(int('ANTI_RAID_TIMEOUT_MINUTES', 10, 1, 1440) * 60000, 'Rheinland Anti-Raid Schutz').catch(() => null);
      await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Anti-Raid ausgelöst', `${recent.length} Beitritte innerhalb von ${int('ANTI_RAID_WINDOW_SECONDS', 10)} Sekunden. Neues Mitglied: <@${member.id}>.`);
    }
  },
  async onMessage(message, ctx) {
    if (!message.guild || message.author.bot || !message.member || isStaff(message.member)) return;
    const honeypots = list('HONEYPOT_CHANNEL_IDS');
    if (honeypots.includes(message.channelId)) {
      await message.delete().catch(() => null);
      await message.member.timeout(24 * 60 * 60 * 1000, 'Rheinland Honeypot-Schutz').catch(() => null);
      await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Honeypot ausgelöst', `${message.author.tag} hat in einem Honeypot-Kanal geschrieben: <#${message.channelId}>.`);
      return;
    }
    const blockedWords = csvWords('BAD_WORDS');
    const content = normalized(message.content);
    if (blockedWords.some((word) => word && content.includes(word))) {
      await message.delete().catch(() => null);
      await sendLog(ctx, 'MOD_LOG_CHANNEL_ID', 'Wortfilter ausgelöst', `Mitglied: ${message.author}\nKanal: <#${message.channelId}>\nNachricht wurde wegen des konfigurierten Wortfilters entfernt.`);
      return;
    }
    if (!bool('ANTI_SPAM_ENABLED', true)) return;
    const key = `${message.guild.id}:${message.author.id}`; const now = Date.now();
    const windowMs = int('ANTI_SPAM_WINDOW_SECONDS', 8, 2, 60) * 1000;
    const state = messageWindows.get(key) ?? [];
    const recent = state.filter((item) => now - item.at <= windowMs);
    recent.push({ at: now, content }); messageWindows.set(key, recent);
    const duplicates = recent.filter((item) => item.content === content).length;
    if (recent.length > int('ANTI_SPAM_MAX_MESSAGES', 6, 3, 30) || duplicates >= int('ANTI_SPAM_DUPLICATE_LIMIT', 3, 2, 10)) {
      await message.delete().catch(() => null);
      await message.member.timeout(int('ANTI_SPAM_TIMEOUT_MINUTES', 5, 1, 1440) * 60000, 'Rheinland Anti-Spam Schutz').catch(() => null);
      messageWindows.delete(key);
      await sendLog(ctx, 'MOD_LOG_CHANNEL_ID', 'Anti-Spam ausgelöst', `${message.author.tag} wurde in <#${message.channelId}> wegen Spam automatisch timeoutet.`);
    }
  },
  async onChannelDelete(channel, ctx) { if (channel.guild) await checkNuke(channel.guild, 'channel', ctx); },
  async onRoleDelete(role, ctx) { await checkNuke(role.guild, 'role', ctx); },
};
