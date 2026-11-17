import { readFile } from 'node:fs/promises';
import { EmbedBuilder } from 'discord.js';
import { env } from './config.js';

const missingAssets = new Set();

const assetRules = [
  [/ticket-system|ticket:/i, 'Ticket.png'],
  [/verifizierung|sicherheitsprüfung/i, 'Verify.png'],
  [/team-bewerbung|bewerbung/i, 'Bewerbung.png'],
  [/voraussetzungen/i, 'Voraussetzungen.png'],
  [/fraktionsliste|fraktionen/i, 'Fraktionen.png'],
  [/fraktions-news/i, 'Fraktionsnews.png'],
  [/fraktion beantragen/i, 'Fraktionsbewerbung.png'],
  [/bug melden|bug:/i, 'Bug.png'],
  [/einführung/i, 'Einfuehrung.png'],
  [/selfroles/i, 'Selfroles.png'],
  [/schichtsystem/i, 'Schichtsystem.png'],
  [/schichtübersicht|teamübersicht/i, 'Schichtuebersicht.png'],
  [/vorschläge/i, 'Vorschlaege.png'],
  [/discord-regelwerk/i, 'Discord-Regelwerk.png'],
  [/ingame-regelwerk/i, 'Ingame-Regelwerk.png'],
  [/team-regelwerk/i, 'Team-Regelwerk.png'],
  [/content-creator-regelwerk/i, 'Content-Creator-Regelwerk.png'],
  [/server-code/i, 'Servercode.png'],
  [/safezones/i, 'Safezones.png'],
  [/faq/i, 'FAQ.png'],
  [/teamliste/i, 'Teamliste.png'],
  [/ankündigung|neuigkeiten|zeitung/i, 'News.png'],
  [/leitstelle|einsatz/i, 'Leitstelle.png'],
  [/support/i, 'Support.png'],
];

function assetFor(title, channelEnv = '') {
  if (channelEnv === 'VERIFY_CHANNEL_ID') return 'Verify.png';
  if (channelEnv === 'WELCOME_CHANNEL_ID') return 'Willkommen.png';
  if (channelEnv === 'BOOST_CHANNEL_ID') return 'Boot.png';
  const rule = assetRules.find(([pattern]) => pattern.test(String(title ?? '')));
  return rule?.[1] ?? null;
}

export async function attachAsset(payload, title, channelEnv = '') {
  const filename = assetFor(title, channelEnv);
  if (!filename) return payload;

  const embeds = [...(payload.embeds ?? [])];
  const first = embeds[0];
  if (!first) return payload;
  const data = first.toJSON?.() ?? first;
  if (data.image?.url) return payload;

  try {
    const attachment = await readFile(new URL('../../assets/' + filename, import.meta.url));
    if (typeof first.setImage === 'function') first.setImage('attachment://' + filename);
    else embeds[0] = { ...data, image: { url: 'attachment://' + filename } };
    return {
      ...payload,
      embeds,
      files: [...(payload.files ?? []), { attachment, name: filename }],
    };
  } catch (error) {
    if (!missingAssets.has(filename)) {
      missingAssets.add(filename);
      console.warn('[ASSETS] Datei assets/' + filename + ' fehlt. Das passende Embed wird ohne Bild gesendet.');
    }
    return payload;
  }
}

export function brandedEmbed(title, description = '', options = {}) {
  const embed = new EmbedBuilder()
    .setTitle(String(title).slice(0, 256))
    .setDescription(String(description).slice(0, 4096))
    .setColor(null)
    .setFooter({ text: env('BRAND_FOOTER', env('BRAND_NAME', 'Rheinland Netzwerk')) })
    .setTimestamp();
  if (options.fields?.length) embed.addFields(options.fields.slice(0, 25));
  if (options.image) embed.setImage(options.image);
  if (options.thumbnail) embed.setThumbnail(options.thumbnail);
  if (options.url) embed.setURL(options.url);
  return embed;
}

export async function sendLog(ctx, channelEnv, title, description, options = {}) {
  const channelId = env(channelEnv);
  if (!channelId) return null;
  try {
    const channel = await ctx.client.channels.fetch(channelId);
    if (!channel?.isTextBased()) return null;
    const payload = await attachAsset({
      embeds: [brandedEmbed(title, description, options)],
      allowedMentions: { parse: [], users: [], roles: [] },
    }, title, channelEnv);
    return await channel.send(payload);
  } catch (error) {
    ctx.logger.warn(`[LOG:${channelEnv}] ${error.message}`);
    return null;
  }
}

export async function sendPanel(ctx, key, channelEnv, payload) {
  const channelId = env(channelEnv);
  if (!channelId) return null;
  try {
    const channel = await ctx.client.channels.fetch(channelId);
    if (!channel?.isTextBased() || !channel.messages) return null;

    const messageId = ctx.db.get('panels', key);
    let panelMessage = messageId
      ? await channel.messages.fetch(messageId).catch(() => null)
      : null;

    const titleBeforeAsset = payload.embeds?.[0]?.toJSON?.()?.title ?? payload.embeds?.[0]?.title ?? null;
    payload = await attachAsset(payload, titleBeforeAsset, channelEnv);
    const embedData = payload.embeds?.[0]?.toJSON?.() ?? payload.embeds?.[0] ?? null;
    const panelTitle = embedData?.title ?? null;

    // Recover an existing panel if the JSON store was reset or its message ID was lost.
    // Panels are posted in dedicated channels and use a stable first-embed title.
    let duplicates = [];
    if (panelTitle) {
      const recent = await channel.messages.fetch({ limit: 100 }).catch(() => null);
      duplicates = recent
        ? [...recent.values()].filter((message) =>
          message.author?.id === ctx.client.user.id
          && message.embeds?.some((embed) => embed.title === panelTitle))
        : [];
      if (!panelMessage) {
        panelMessage = duplicates.sort((a, b) => a.createdTimestamp - b.createdTimestamp)[0] ?? null;
      }
    }

    if (panelMessage) {
      await panelMessage.edit(payload);
      await ctx.db.set('panels', key, panelMessage.id);

      // Remove only duplicate bot-authored copies of this exact panel in this channel.
      for (const duplicate of duplicates) {
        if (duplicate.id !== panelMessage.id) {
          await duplicate.delete().catch((error) =>
            ctx.logger.warn(`[PANEL:${key}] Doppelte Panel-Nachricht konnte nicht entfernt werden: ${error.message}`));
        }
      }
      return panelMessage;
    }

    const message = await channel.send(payload);
    await ctx.db.set('panels', key, message.id);
    return message;
  } catch (error) {
    ctx.logger.warn(`[PANEL:${key}] ${error.message}`);
    return null;
  }
}

export async function safeReply(interaction, payload) {
  try {
    if (interaction.deferred || interaction.replied) return await interaction.followUp(payload);
    return await interaction.reply(payload);
  } catch (error) {
    if (error.code !== 10062 && error.code !== 40060) throw error;
    return null;
  }
}
