import 'dotenv/config';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  ActivityType, Client, Events, GatewayIntentBits, Partials, Routes,
} from 'discord.js';
import { env, bool } from './src/core/config.js';
import { JsonStore } from './src/core/store.js';
import { logger } from './src/core/logger.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const MODULE_DIR = path.join(ROOT, 'src', 'modules');
const token = env('DISCORD_TOKEN');

if (!token) {
  logger.error('DISCORD_TOKEN fehlt. Trage den Bot-Token in die .env ein.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember, Partials.Reaction],
});

const db = await new JsonStore().init();
const ctx = { client, db, logger };
const modules = [];

for (const file of (await readdir(MODULE_DIR)).filter((name) => name.endsWith('.js')).sort()) {
  try {
    const imported = await import(pathToFileURL(path.join(MODULE_DIR, file)).href);
    const module = imported.default;
    if (!module?.name) throw new Error('Modul besitzt keinen Namen.');
    modules.push(module);
    logger.info(`[MODULE] ${module.name} geladen`);
  } catch (error) {
    logger.error(`[MODULE] ${file} konnte nicht geladen werden: ${error.stack ?? error.message}`);
  }
}

const commandMap = new Map();
const commandJson = [];
for (const module of modules) {
  for (const command of module.commands ?? []) {
    const data = typeof command.toJSON === 'function' ? command.toJSON() : command;
    if (commandMap.has(data.name)) {
      logger.warn(`[COMMAND] Doppelter Slash-Command ignoriert: /${data.name}`);
      continue;
    }
    commandMap.set(data.name, module);
    commandJson.push(data);
  }
}

async function runModules(method, ...args) {
  for (const module of modules) {
    if (typeof module[method] !== 'function') continue;
    try { await module[method](...args, ctx); }
    catch (error) { logger.error(`[${module.name}:${method}] ${error.stack ?? error.message}`); }
  }
}

async function registerCommands() {
  if (!client.application?.id) throw new Error('Discord Application ID ist nach dem Ready-Event nicht verfügbar.');
  const configuredClientId = env('CLIENT_ID');
  if (configuredClientId && configuredClientId !== client.application.id) {
    throw new Error('CLIENT_ID passt nicht zum Bot-Token. Bitte Anwendung und Token in der .env prüfen.');
  }
  const guildId = env('GUILD_ID');
  const route = guildId
    ? Routes.applicationGuildCommands(client.application.id, guildId)
    : Routes.applicationCommands(client.application.id);
  await client.rest.put(route, { body: commandJson });
  logger.info(`[COMMANDS] ${commandJson.length} Slash-Commands ${guildId ? `für Guild ${guildId}` : 'global'} registriert`);
}

async function applyAnimatedAvatar() {
  if (!bool('BOT_AVATAR_ON_START', false)) return;
  const configuredPath = env('BOT_AVATAR_PATH', 'assets/logo.gif');
  const avatarPath = path.resolve(ROOT, configuredPath);
  try {
    const { readFile } = await import('node:fs/promises');
    const bytes = await readFile(avatarPath);
    const signature = bytes.subarray(0, 6).toString('ascii');
    if (!['GIF87a', 'GIF89a'].includes(signature)) throw new Error('Die Avatar-Datei ist keine gültige GIF-Datei.');
    if (bytes.length > 10 * 1024 * 1024) throw new Error('Die GIF-Datei ist größer als 10 MB.');
    await client.rest.patch(Routes.user(), { body: { avatar: `data:image/gif;base64,${bytes.toString('base64')}` } });
    logger.info('[AVATAR] Animiertes Bot-Logo wurde aktualisiert.');
  } catch (error) {
    logger.warn(`[AVATAR] Bot-Avatar konnte nicht aktualisiert werden: ${error.message}`);
  }
}

client.once(Events.ClientReady, async (readyClient) => {
  logger.info(`[START] ${readyClient.user.tag} online | Node ${process.version}`);
  const statusTypes = { PLAYING: ActivityType.Playing, STREAMING: ActivityType.Streaming, LISTENING: ActivityType.Listening, WATCHING: ActivityType.Watching, COMPETING: ActivityType.Competing };
  readyClient.user.setPresence({ activities: [{ name: env('BOT_STATUS', 'Rheinland Netzwerk | /help'), type: statusTypes[env('BOT_ACTIVITY_TYPE', 'WATCHING').toUpperCase()] ?? ActivityType.Watching }], status: 'online' });
  await applyAnimatedAvatar();
  try { await registerCommands(); }
  catch (error) { logger.error(`[COMMANDS] Registrierung fehlgeschlagen: ${error.stack ?? error.message}`); }
  await runModules('setup');
  logger.info('[START] Alle Module wurden initialisiert.');
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const module = commandMap.get(interaction.commandName);
      if (!module?.execute) { await interaction.reply({ content: 'Dieser Befehl ist derzeit nicht verfügbar.', ephemeral: true }); return; }
      await module.execute(interaction, ctx);
      return;
    }
    for (const module of modules) {
      if (typeof module.onInteraction !== 'function') continue;
      const handled = await module.onInteraction(interaction, ctx);
      if (handled) return;
    }
  } catch (error) {
    logger.error(`[INTERACTION] ${error.stack ?? error.message}`);
    const payload = { content: 'Bei der Verarbeitung ist ein Fehler aufgetreten. Das Team wurde über den Fehler informiert.', ephemeral: true };
    if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => null);
    else await interaction.reply(payload).catch(() => null);
  }
});

const eventBindings = [
  [Events.GuildMemberAdd, 'onMemberAdd'],
  [Events.GuildMemberRemove, 'onMemberRemove'],
  [Events.GuildMemberUpdate, 'onMemberUpdate'],
  [Events.MessageCreate, 'onMessage'],
  [Events.MessageDelete, 'onMessageDelete'],
  [Events.MessageUpdate, 'onMessageUpdate'],
  [Events.ChannelCreate, 'onChannelCreate'],
  [Events.ChannelDelete, 'onChannelDelete'],
  [Events.RoleCreate, 'onRoleCreate'],
  [Events.RoleDelete, 'onRoleDelete'],
  [Events.GuildBanAdd, 'onGuildBanAdd'],
  [Events.GuildBanRemove, 'onGuildBanRemove'],
  [Events.VoiceStateUpdate, 'onVoiceStateUpdate'],
  [Events.InviteCreate, 'onInviteCreate'],
  [Events.InviteDelete, 'onInviteDelete'],
];
for (const [event, method] of eventBindings) client.on(event, (...args) => runModules(method, ...args));

client.on(Events.Warn, (warning) => logger.warn(warning));
client.on(Events.Error, (error) => logger.error(`Discord-Client: ${error.stack ?? error.message}`));
client.on(Events.ShardError, (error, shardId) => logger.error(`Shard ${shardId}: ${error.message}`));
process.on('unhandledRejection', (reason) => logger.error(`Unhandled rejection: ${reason?.stack ?? reason}`));
process.on('uncaughtException', (error) => logger.error(`Uncaught exception: ${error.stack ?? error.message}`));

async function shutdown(signal) {
  ctx.shuttingDown = true;
  logger.warn(`[SHUTDOWN] ${signal} empfangen.`);
  for (const timer of [ctx.shiftTimer, ctx.meetingTimer]) if (timer) clearInterval(timer);
  client.destroy();
  process.exit(0);
}
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

try {
  await client.login(token);
} catch (error) {
  logger.error(`Login fehlgeschlagen: ${error.stack ?? error.message}`);
  process.exit(1);
}
