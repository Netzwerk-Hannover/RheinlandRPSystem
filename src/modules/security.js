import { AuditLogEvent } from 'discord.js';
import { bool, int, list, csvWords, env } from '../core/config.js';
import { sendLog } from '../core/brand.js';
import { isStaff } from '../core/permissions.js';

const joinWindows = new Map();
const messageWindows = new Map();
const honeypotProcessing = new Set();
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
    await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Anti-Nuke: ' + (type === 'channel' ? 'Kanal' : 'Rolle') + ' gelöscht', 'Ausführender: ' + executor.tag + ' (' + executor.id + ')\nZiel: ' + (entry.target?.name ?? entry.targetId ?? 'Unbekannt') + '\nAktion: ' + env('ANTI_NUKE_ACTION', 'log'));
    if (env('ANTI_NUKE_ACTION', 'log').toLowerCase() === 'ban') {
      if (!list('BOT_OWNER_IDS').includes(executor.id)) {
        await guild.members.ban(executor.id, { reason: 'Rheinland Anti-Nuke: auffällige ' + type + '-Löschaktion' }).catch((error) => ctx.logger.warn('[ANTI-NUKE] Ban nicht möglich: ' + error.message));
      }
    }
  } catch (error) {
    ctx.logger.warn('[ANTI-NUKE] Audit-Log konnte nicht geprüft werden: ' + error.message);
  }
}

async function purgeLast24Hours(guild, userId, triggerMessage, ctx) {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  let deleted = 0;
  let failed = 0;
  let inaccessible = 0;
  const triggerDeleted = await triggerMessage.delete().then(() => true).catch(() => false);
  if (triggerDeleted) deleted += 1;

  const channels = await guild.channels.fetch();
  const targets = new Map(channels.filter((channel) => channel?.isTextBased?.() && channel.messages?.fetch).map((channel) => [channel.id, channel]));
  const activeThreads = await guild.channels.fetchActiveThreads().catch((error) => {
    ctx.logger.warn('[HONEYPOT] Aktive Threads konnten nicht vollständig geladen werden: ' + error.message);
    return null;
  });
  for (const thread of activeThreads?.threads?.values?.() ?? []) targets.set(thread.id, thread);
  for (const parent of channels.values()) {
    if (!parent?.threads?.fetchArchived) continue;
    const archived = await parent.threads.fetchArchived({ type: 'public', limit: 100 }).catch(() => null);
    for (const thread of archived?.threads?.values?.() ?? []) targets.set(thread.id, thread);
  }

  for (const channel of targets.values()) {
    let before;
    let keepPaging = true;
    while (keepPaging) {
      let batch;
      try {
        batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
      } catch {
        inaccessible += 1;
        break;
      }
      if (!batch.size) break;
      const items = [...batch.values()];
      const oldest = items.reduce((a, b) => a.createdTimestamp <= b.createdTimestamp ? a : b);
      const matches = items.filter((item) => item.author?.id === userId && item.createdTimestamp >= cutoff && item.id !== triggerMessage.id);
      for (let offset = 0; offset < matches.length; offset += 10) {
        const group = matches.slice(offset, offset + 10);
        const results = await Promise.allSettled(group.map((item) => item.delete()));
        for (const result of results) {
          if (result.status === 'fulfilled') deleted += 1;
          else failed += 1;
        }
      }
      if (oldest.createdTimestamp < cutoff || batch.size < 100) keepPaging = false;
      else before = oldest.id;
    }
  }
  return { deleted, failed, inaccessible, scannedChannels: targets.size };
}

async function triggerHoneypot(message, ctx) {
  const key = message.guild.id + ':' + message.author.id;
  if (honeypotProcessing.has(key)) {
    await message.delete().catch(() => null);
    return;
  }
  honeypotProcessing.add(key);
  const reason = 'Rheinland Honeypot: Nachricht im gesperrten Honeypot-Kanal #' + message.channelId;
  let purge = { deleted: 0, failed: 0, inaccessible: 0, scannedChannels: 0 };
  let banned = false;
  try {
    try {
      purge = await purgeLast24Hours(message.guild, message.author.id, message, ctx);
    } catch (error) {
      purge.inaccessible += 1;
      ctx.logger.error('[HONEYPOT] Nachrichtenbereinigung fehlgeschlagen: ' + error.message);
    }
    try {
      await message.guild.members.ban(message.author.id, { reason });
      banned = true;
    } catch (error) {
      ctx.logger.error('[HONEYPOT] Permanenter Ban fehlgeschlagen für ' + message.author.id + ': ' + error.message);
    }
    const dmText = banned
      ? 'Du wurdest dauerhaft vom Discord-Server Rheinland Netzwerk ausgeschlossen. Grund: Du hast im Honeypot-Schutzkanal geschrieben. Nachrichten der letzten 24 Stunden wurden soweit für den Bot zugänglich entfernt.'
      : 'Der Honeypot-Schutz von Rheinland Netzwerk wurde ausgelöst. Deine Nachrichten der letzten 24 Stunden wurden soweit möglich entfernt. Der automatische permanente Bann konnte wegen fehlender Bot-Rechte nicht gesetzt werden.';
    await message.author.send({ content: dmText }).catch((error) => ctx.logger.warn('[HONEYPOT] DM an ' + message.author.id + ' fehlgeschlagen: ' + error.message));
    await sendLog(
      ctx,
      'SERVER_LOG_CHANNEL_ID',
      banned ? 'Honeypot ausgelöst • permanenter Bann' : 'Honeypot ausgelöst • Bann fehlgeschlagen',
      'Mitglied: ' + message.author.tag + ' (' + message.author.id + ')\nKanal: <#' + message.channelId + '>\nPermanenter Bann: ' + (banned ? 'erfolgreich' : 'fehlgeschlagen') + '\nGelöschte Nachrichten (letzte 24 h): ' + purge.deleted + '\nLöschfehler: ' + purge.failed + '\nNicht lesbare Kanäle/Threads: ' + purge.inaccessible + '\nGeprüfte Kanäle/aktive Threads: ' + purge.scannedChannels,
    );
  } finally {
    // Der User ist nach erfolgreichem Bann ohnehin gesperrt. Der Schlüssel verhindert parallele Doppelaktionen.
  }
}

export default {
  name: 'raid-nuke-spam-honeypot-schutz',
  async onMemberAdd(member, ctx) {
    if (!bool('ANTI_RAID_ENABLED', true)) return;
    const now = Date.now();
    const windowMs = int('ANTI_RAID_WINDOW_SECONDS', 10, 2, 60) * 1000;
    const recent = (joinWindows.get(member.guild.id) ?? []).filter((time) => now - time <= windowMs);
    recent.push(now);
    joinWindows.set(member.guild.id, recent);
    if (recent.length >= int('ANTI_RAID_MAX_JOINS', 8, 3, 100)) {
      const quarantine = env('RAID_QUARANTINE_ROLE_ID');
      if (quarantine) await member.roles.add(quarantine, 'Rheinland Anti-Raid Schutz').catch(() => null);
      await member.timeout(int('ANTI_RAID_TIMEOUT_MINUTES', 10, 1, 1440) * 60000, 'Rheinland Anti-Raid Schutz').catch(() => null);
      await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Anti-Raid ausgelöst', recent.length + ' Beitritte innerhalb von ' + int('ANTI_RAID_WINDOW_SECONDS', 10) + ' Sekunden. Neues Mitglied: <@' + member.id + '>.');
    }
  },
  async onMessage(message, ctx) {
    if (!message.guild || message.author.bot) return;
    const honeypots = list('HONEYPOT_CHANNEL_IDS');
    if (honeypots.includes(message.channelId)) {
      await triggerHoneypot(message, ctx);
      return;
    }
    if (!message.member || isStaff(message.member)) return;
    const blockedWords = csvWords('BAD_WORDS');
    const content = normalized(message.content);
    if (blockedWords.some((word) => word && content.includes(word))) {
      await message.delete().catch(() => null);
      await sendLog(ctx, 'MOD_LOG_CHANNEL_ID', 'Wortfilter ausgelöst', 'Mitglied: ' + message.author + '\nKanal: <#' + message.channelId + '>\nNachricht wurde wegen des konfigurierten Wortfilters entfernt.');
      return;
    }
    if (!bool('ANTI_SPAM_ENABLED', true)) return;
    const key = message.guild.id + ':' + message.author.id;
    const now = Date.now();
    const windowMs = int('ANTI_SPAM_WINDOW_SECONDS', 8, 2, 60) * 1000;
    const state = messageWindows.get(key) ?? [];
    const recent = state.filter((item) => now - item.at <= windowMs);
    recent.push({ at: now, content });
    messageWindows.set(key, recent);
    const duplicates = recent.filter((item) => item.content === content).length;
    if (recent.length > int('ANTI_SPAM_MAX_MESSAGES', 6, 3, 30) || duplicates >= int('ANTI_SPAM_DUPLICATE_LIMIT', 3, 2, 10)) {
      await message.delete().catch(() => null);
      await message.member.timeout(int('ANTI_SPAM_TIMEOUT_MINUTES', 5, 1, 1440) * 60000, 'Rheinland Anti-Spam Schutz').catch(() => null);
      messageWindows.delete(key);
      await sendLog(ctx, 'MOD_LOG_CHANNEL_ID', 'Anti-Spam ausgelöst', message.author.tag + ' wurde in <#' + message.channelId + '> wegen Spam automatisch timeoutet.');
    }
  },
  async onChannelDelete(channel, ctx) {
    if (channel.guild) await checkNuke(channel.guild, 'channel', ctx);
  },
  async onRoleDelete(role, ctx) {
    await checkNuke(role.guild, 'role', ctx);
  },
};
