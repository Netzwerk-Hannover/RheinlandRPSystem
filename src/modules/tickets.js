import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { env, list, bool } from '../core/config.js';
import { attachAsset, brandedEmbed, sendLog, sendPanel } from '../core/brand.js';
import { isStaff } from '../core/permissions.js';

const types = {
  support: { label: 'Support', category: 'TICKET_CATEGORY_SUPPORT_ID', staff: 'TICKET_SUPPORT_ROLE_IDS' },
  highteam: { label: 'HighTeam', category: 'TICKET_CATEGORY_HIGHTEAM_ID', staff: 'TICKET_HIGHTEAM_ROLE_IDS' },
  fraction: { label: 'Fraktion', category: 'TICKET_CATEGORY_FRACTION_ID', staff: 'TICKET_FRACTION_ROLE_IDS' },
  unban: { label: 'Entbannung', category: 'TICKET_CATEGORY_UNBAN_ID', staff: 'TICKET_UNBAN_ROLE_IDS' },
  leadership: { label: 'Leitung', category: 'TICKET_CATEGORY_LEADERSHIP_ID', staff: 'TICKET_LEADERSHIP_ROLE_IDS' },
};

const panelRow = () => new ActionRowBuilder().addComponents(
  new StringSelectMenuBuilder()
    .setCustomId('ticket:type')
    .setPlaceholder('Ticketart auswählen')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      { label: 'Support', value: 'support', description: 'Allgemeine Fragen und Hilfe' },
      { label: 'HighTeam', value: 'highteam', description: 'Anliegen an das HighTeam' },
      { label: 'Fraktion', value: 'fraction', description: 'Fraktionsfragen und Probleme' },
      { label: 'Entbannung', value: 'unban', description: 'Einspruch gegen eine Sperre' },
      { label: 'Leitung', value: 'leadership', description: 'Anliegen an Owner und Co-Owner' },
    ),
);
const ticketButtons = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('ticket:claim').setLabel('Ticket übernehmen').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId('ticket:close').setLabel('Ticket schließen').setStyle(ButtonStyle.Danger),
);

const makeField = (id, label, style = TextInputStyle.Short, required = true, max = 500, value = null) => {
  const field = new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(required).setMaxLength(max);
  if (value) field.setValue(value.slice(0, max));
  return new ActionRowBuilder().addComponents(field);
};

function createTicketModal(type, user) {
  const modal = new ModalBuilder().setCustomId(`ticket:create:${type}`).setTitle(`${types[type].label} Ticket eröffnen`);
  if (type === 'unban') {
    modal.addComponents(
      makeField('roblox_name', 'Roblox-Name', TextInputStyle.Short, true, 100),
      makeField('discord_name', 'Discord-Name', TextInputStyle.Short, true, 100, user.tag),
      makeField('roblox_id', 'Roblox-ID (nur Zahlen)', TextInputStyle.Short, true, 30),
      makeField('ban_reason', 'Warum wurdest du gebannt?', TextInputStyle.Paragraph, true, 900),
      makeField('appeal', 'Warum sollst du entbannt werden?', TextInputStyle.Paragraph, true, 900),
    );
  } else {
    modal.addComponents(
      makeField('roblox_name', 'Roblox-Name', TextInputStyle.Short, true, 100),
      makeField('discord_name', 'Discord-Name', TextInputStyle.Short, true, 100, user.tag),
      makeField('subject', 'Betreff', TextInputStyle.Short, true, 100),
      makeField('details', 'Ticket-Anliegen / Beschreibung', TextInputStyle.Paragraph, true, 1600),
    );
  }
  return modal;
}

function staffRoles(type) {
  return [...new Set([...list('TICKET_STAFF_ROLE_IDS'), ...list(types[type].staff)])];
}

function isTicketStaff(member, type) {
  return isStaff(member) || staffRoles(type).some((id) => member?.roles?.cache?.has(id));
}

function ticketPermissionOverwrites(guild, userId, botId, roles) {
  return [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
    { id: botId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
    ...roles.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] })),
  ];
}

async function ensureLeadershipCategory(guild, ctx) {
  const savedId = ctx.db.get('ticketCategories', 'leadership');
  const saved = savedId ? await guild.channels.fetch(savedId).catch(() => null) : null;
  if (saved?.type === ChannelType.GuildCategory) return saved.id;

  const roles = staffRoles('leadership');
  const category = await guild.channels.create({
    name: env('TICKET_CATEGORY_LEADERSHIP_NAME', 'Leitungs Ticket (Owner Co Owner)'),
    type: ChannelType.GuildCategory,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: ctx.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ...roles.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel] })),
    ],
    reason: 'Rheinland Netzwerk: Leitungsticket-Kategorie automatisch erstellen',
  });
  await ctx.db.set('ticketCategories', 'leadership', category.id);
  await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Ticket-Kategorie erstellt', `Die Kategorie ${category.name} wurde automatisch angelegt. ID: ${category.id}`);
  return category.id;
}

export default {
  name: 'tickets',
  commands: [new SlashCommandBuilder().setName('ticketinfo').setDescription('Zeigt Informationen zu deinem offenen Ticket').toJSON()],
  async setup(ctx) {
    await sendPanel(ctx, 'tickets', 'TICKET_PANEL_CHANNEL_ID', {
      embeds: [brandedEmbed('Rheinland Netzwerk • Ticket-System', 'Wähle im Auswahlmenü genau eine Ticketart. Danach öffnet sich das passende Formular mit deinen Roblox- und Discord-Daten sowie deinem Anliegen.\n\n**Support** · Allgemeine Hilfe\n**HighTeam** · Anliegen an das HighTeam\n**Fraktion** · Fragen und Probleme zu Fraktionen\n**Entbannung** · Einspruch gegen einen Ban, inklusive Roblox-ID\n**Leitung** · Direkte Anliegen an Owner / Co-Owner')],
      components: [panelRow()],
    });
  },
  async execute(interaction, ctx) {
    const ticket = ctx.db.get('tickets', interaction.user.id);
    await interaction.reply({ content: ticket?.status === 'open' ? `Dein Ticket ist hier: <#${ticket.channelId}>` : 'Du kannst über das Ticket-Panel ein neues Ticket eröffnen.', ephemeral: true });
  },
  async onInteraction(i, ctx) {
    if (i.isStringSelectMenu() && i.customId === 'ticket:type') {
      const type = i.values[0];
      if (!types[type]) { await i.reply({ content: 'Unbekannte Ticketart.', ephemeral: true }); return true; }
      const existing = ctx.db.get('tickets', i.user.id);
      if (existing?.status === 'open') { await i.reply({ content: 'Du hast bereits ein offenes Ticket: <#' + existing.channelId + '>', ephemeral: true }); return true; }
      await i.showModal(createTicketModal(type, i.user));
      return true;
    }

    if (i.isModalSubmit() && i.customId.startsWith('ticket:create:')) {
      const type = i.customId.split(':')[2];
      if (!types[type]) { await i.reply({ content: 'Unbekannte Ticketart.', ephemeral: true }); return true; }
      const existing = ctx.db.get('tickets', i.user.id);
      if (existing?.status === 'open') { await i.reply({ content: `Du hast bereits ein offenes Ticket: <#${existing.channelId}>`, ephemeral: true }); return true; }

      const form = {
        type,
        robloxName: i.fields.getTextInputValue('roblox_name').trim(),
        discordName: i.fields.getTextInputValue('discord_name').trim(),
        subject: type === 'unban' ? 'Entbannungsantrag' : i.fields.getTextInputValue('subject').trim(),
        details: type === 'unban'
          ? `**Roblox-ID:** ${i.fields.getTextInputValue('roblox_id').trim()}\n**Ban-Grund:** ${i.fields.getTextInputValue('ban_reason').trim()}\n**Entbannungs-Begründung:** ${i.fields.getTextInputValue('appeal').trim()}`
          : i.fields.getTextInputValue('details').trim(),
      };
      if (type === 'unban' && !/^\d{5,20}$/.test(i.fields.getTextInputValue('roblox_id').trim())) {
        await i.reply({ content: 'Bitte gib eine gültige Roblox-ID (nur Zahlen, 5 bis 20 Stellen) an.', ephemeral: true });
        return true;
      }

      const guild = i.guild;
      const roles = staffRoles(type);
      let categoryId = env(types[type].category);
      if (type === 'leadership' && !categoryId) categoryId = await ensureLeadershipCategory(guild, ctx);
      const category = categoryId ? await guild.channels.fetch(categoryId).catch(() => null) : null;
      if (categoryId && (!category || category.type !== ChannelType.GuildCategory)) {
        await i.reply({ content: `Die Ticket-Kategorie für ${types[type].label} ist nicht erreichbar oder keine Discord-Kategorie.`, ephemeral: true });
        return true;
      }
      try {
        const baseName = `ticket-${type}-${i.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90);
        const channel = await guild.channels.create({
          name: baseName,
          type: ChannelType.GuildText,
          parent: categoryId || undefined,
          permissionOverwrites: ticketPermissionOverwrites(guild, i.user.id, ctx.client.user.id, roles),
          reason: `${types[type].label} Ticket von ${i.user.tag}`,
        });
        const record = { channelId: channel.id, status: 'open', type, subject: form.subject, form, openedAt: Date.now(), ownerId: i.user.id, handlerId: null };
        await ctx.db.set('tickets', i.user.id, record);
        const mentions = roles.map((id) => `<@&${id}>`).join(' ');
        const fields = [
          { name: 'Roblox-Name', value: form.robloxName.slice(0, 1024) || '—', inline: true },
          { name: 'Discord-Name', value: form.discordName.slice(0, 1024) || '—', inline: true },
          { name: 'Ticketart', value: types[type].label, inline: true },
          { name: 'Anliegen', value: form.details.slice(0, 1024) || '—' },
        ];
        const ticketEmbed = brandedEmbed(`Ticket: ${form.subject}`, 'Das Ticket wurde eröffnet. Ein Teammitglied kann es über „Ticket übernehmen“ annehmen.', { fields });
        await channel.send(await attachAsset({
          content: `<@${i.user.id}>${mentions ? ` ${mentions}` : ''}`,
          embeds: [ticketEmbed],
          components: [ticketButtons()],
          allowedMentions: { users: [i.user.id], roles },
        }, 'Ticket'));
        await i.reply({ content: `Dein ${types[type].label}-Ticket wurde erstellt: ${channel}`, ephemeral: true });
        await sendLog(ctx, 'TICKET_LOG_CHANNEL_ID', `${types[type].label}-Ticket eröffnet`, `Ersteller: <@${i.user.id}>\nKanal: ${channel}\nRoblox: ${form.robloxName}\nDiscord: ${form.discordName}\nBetreff: ${form.subject}\nAnliegen: ${form.details}`);
      } catch (error) {
        ctx.logger.error(`[TICKETS] ${error.stack ?? error.message}`);
        await i.reply({ content: 'Das Ticket konnte nicht erstellt werden. Bitte kontaktiere den Support.', ephemeral: true }).catch(() => null);
      }
      return true;
    }

    if (i.isButton() && i.customId === 'ticket:claim') {
      const found = ctx.db.all('tickets').find(([, value]) => value.channelId === i.channelId);
      const [ownerId, entry] = found ?? [];
      if (!entry || entry.status !== 'open') { await i.reply({ content: 'Dieses Ticket ist nicht mehr offen.', ephemeral: true }); return true; }
      if (!isTicketStaff(i.member, entry.type)) { await i.reply({ content: 'Nur das zuständige Team kann ein Ticket übernehmen.', ephemeral: true }); return true; }
      if (entry.handlerId && entry.handlerId !== i.user.id) { await i.reply({ content: `Dieses Ticket wird bereits von <@${entry.handlerId}> bearbeitet.`, ephemeral: true }); return true; }
      entry.handlerId = i.user.id;
      entry.claimedAt = Date.now();
      await ctx.db.set('tickets', ownerId, entry);
      await i.reply({ content: 'Du hast dieses Ticket übernommen.', ephemeral: true });
      await i.channel.send(await attachAsset({ embeds: [brandedEmbed('Ticket übernommen', `Zuständiges Teammitglied: <@${i.user.id}>`)] }, 'Ticket'));
      await sendLog(ctx, 'TICKET_LOG_CHANNEL_ID', 'Ticket übernommen', `Ticket: <#${i.channelId}>\nBearbeiter: <@${i.user.id}>`);
      return true;
    }

    if (i.isButton() && i.customId === 'ticket:close') {
      const found = ctx.db.all('tickets').find(([, value]) => value.channelId === i.channelId);
      const [ownerId, entry] = found ?? [];
      if (!entry || entry.status !== 'open') { await i.reply({ content: 'Dieses Ticket ist bereits geschlossen oder nicht registriert.', ephemeral: true }); return true; }
      if (i.user.id !== entry.ownerId && !isTicketStaff(i.member, entry.type)) {
        await i.reply({ content: 'Nur der Ticket-Ersteller oder das zuständige Team darf schließen.', ephemeral: true }); return true;
      }
      entry.status = 'closed'; entry.closedAt = Date.now();
      if (i.user.id !== entry.ownerId && !entry.handlerId) entry.handlerId = i.user.id;
      await ctx.db.set('tickets', ownerId, entry);
      await i.channel.send(await attachAsset({ embeds: [brandedEmbed('Ticket geschlossen', `Geschlossen von <@${i.user.id}>. Die Bewertung wird per Direktnachricht angefragt.`)] }, 'Ticket'));
      await i.channel.permissionOverwrites.edit(entry.ownerId, { SendMessages: false }).catch(() => null);
      await i.reply({ content: 'Ticket wurde geschlossen.', ephemeral: true });

      if (bool('TICKET_CLOSE_TRANSCRIPT', true)) {
        const logChannelId = env('TICKET_LOG_CHANNEL_ID');
        const logChannel = logChannelId ? await ctx.client.channels.fetch(logChannelId).catch(() => null) : null;
        if (logChannel?.isTextBased()) {
          const history = await i.channel.messages.fetch({ limit: 100 }).catch(() => null);
          if (history?.size) {
            const lines = [...history.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp).map((message) => {
              const attachments = [...message.attachments.values()].map((file) => file.url).join(' ');
              return `[${new Date(message.createdTimestamp).toISOString()}] ${message.author?.tag ?? 'Unbekannt'}: ${(message.content || '[kein Text]').slice(0, 3000)} ${attachments}`;
            }).join('\n').slice(-90000);
            await logChannel.send({
              content: `Ticket-Transcript • Ersteller: <@${entry.ownerId}> • Bearbeiter: ${entry.handlerId ? `<@${entry.handlerId}>` : 'Nicht zugeordnet'}`,
              files: [{ attachment: Buffer.from(lines, 'utf8'), name: `ticket-${entry.type}-${entry.ownerId}-${Date.now()}.txt` }],
              allowedMentions: { parse: [] },
            }).catch((error) => ctx.logger.warn(`[TICKETS] Transcript konnte nicht gesendet werden: ${error.message}`));
          }
        }
      }
      const ratingButtons = new ActionRowBuilder().addComponents([1, 2, 3, 4, 5].map((stars) => new ButtonBuilder().setCustomId(`ticket:rate:${entry.ownerId}:${stars}`).setLabel('★'.repeat(stars)).setStyle(stars < 3 ? ButtonStyle.Secondary : ButtonStyle.Primary)));
      const owner = await ctx.client.users.fetch(entry.ownerId).catch(() => null);
      await owner?.send({ content: 'Wie bewertest du deinen Support bei Rheinland Netzwerk?', components: [ratingButtons] }).catch(() => null);
      await sendLog(ctx, 'TICKET_LOG_CHANNEL_ID', 'Ticket geschlossen', `Ticket von <@${entry.ownerId}>\nTicketart: ${types[entry.type]?.label ?? entry.type}\nBearbeiter: ${entry.handlerId ? `<@${entry.handlerId}>` : 'Nicht zugeordnet'}\nGeschlossen von: <@${i.user.id}>\nKanal-ID: ${i.channelId}`);
      return true;
    }

    if (i.isButton() && i.customId.startsWith('ticket:rate:')) {
      const [, , ownerId, starsRaw] = i.customId.split(':');
      const stars = Number(starsRaw);
      const entry = ctx.db.get('tickets', ownerId);
      if (i.user.id !== ownerId || !entry || !Number.isInteger(stars) || stars < 1 || stars > 5) {
        await i.reply({ content: 'Diese Bewertung kann nicht zugeordnet werden.', ephemeral: true });
        return true;
      }
      const modal = new ModalBuilder().setCustomId(`ticket:feedback:${ownerId}:${stars}`).setTitle('Support bewerten');
      modal.addComponents(makeField('comment', 'Kommentar (optional)', TextInputStyle.Paragraph, false, 700));
      await i.showModal(modal);
      return true;
    }

    if (i.isModalSubmit() && i.customId.startsWith('ticket:feedback:')) {
      const [, , ownerId, starsRaw] = i.customId.split(':');
      if (i.user.id !== ownerId) { await i.reply({ content: 'Diese Bewertung gehört zu einem anderen Mitglied.', ephemeral: true }); return true; }
      const comment = i.fields.getTextInputValue('comment') || '';
      const blocked = env('BAD_WORDS').split(',').map((word) => word.trim().toLowerCase()).filter(Boolean);
      if (blocked.some((word) => comment.toLowerCase().includes(word))) { await i.reply({ content: 'Bitte formuliere deine Bewertung sachlich und ohne Beleidigungen.', ephemeral: true }); return true; }
      const entry = ctx.db.get('tickets', ownerId);
      const rating = { stars: Number(starsRaw), comment, userId: ownerId, handlerId: entry?.handlerId ?? null, createdAt: Date.now() };
      await ctx.db.set('ticketFeedback', `${ownerId}-${Date.now()}`, rating);
      await sendLog(ctx, 'FEEDBACK_LOG_CHANNEL_ID', 'Ticket-Bewertung eingegangen', `Bewertung: ${'⭐'.repeat(rating.stars)} (${rating.stars}/5)\nMitglied: <@${ownerId}>\nBearbeiter: ${rating.handlerId ? `<@${rating.handlerId}>` : 'Nicht zugeordnet'}\nKommentar: ${comment || 'Kein Kommentar'}`);
      await i.reply({ content: 'Danke für dein Feedback!', ephemeral: true });
      return true;
    }
    return false;
  },
};
