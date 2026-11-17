import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { env, bool } from '../core/config.js';
import { brandedEmbed, sendLog, sendPanel } from '../core/brand.js';
import { isStaff } from '../core/permissions.js';

const panelRow = () => new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket:open').setLabel('Ticket erstellen').setStyle(ButtonStyle.Primary).setEmoji('🎫'));
const closeRow = () => new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket:close').setLabel('Ticket schließen').setStyle(ButtonStyle.Danger).setEmoji('🔒'));

export default {
  name: 'tickets',
  commands: [new SlashCommandBuilder().setName('ticketinfo').setDescription('Zeigt Informationen zu deinem offenen Ticket').toJSON()],
  async setup(ctx) {
    await sendPanel(ctx, 'tickets', 'TICKET_PANEL_CHANNEL_ID', { embeds: [brandedEmbed('Rheinland Netzwerk • Support', 'Du benötigst Hilfe? Erstelle ein Ticket. Beschreibe dein Anliegen und hänge bei Bedarf Screenshots an.')], components: [panelRow()] });
  },
  async execute(interaction, ctx) {
    const ticket = ctx.db.get('tickets', interaction.user.id);
    await interaction.reply({ content: ticket?.status === 'open' ? `Dein Ticket ist hier: <#${ticket.channelId}>` : 'Du kannst über das Ticket-Panel ein neues Ticket eröffnen.', ephemeral: true });
  },
  async onInteraction(i, ctx) {
    if (i.customId === 'ticket:open' && i.isButton()) {
      const existing = ctx.db.get('tickets', i.user.id);
      if (existing?.status === 'open') { await i.reply({ content: `Du hast bereits ein offenes Ticket: <#${existing.channelId}>`, ephemeral: true }); return true; }
      const modal = new ModalBuilder().setCustomId('ticket:create').setTitle('Support-Ticket erstellen');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('subject').setLabel('Betreff').setStyle(TextInputStyle.Short).setMaxLength(100).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('details').setLabel('Beschreibe dein Anliegen').setStyle(TextInputStyle.Paragraph).setMaxLength(1800).setRequired(true)),
      );
      await i.showModal(modal); return true;
    }
    if (i.customId === 'ticket:create' && i.isModalSubmit()) {
      const subject = i.fields.getTextInputValue('subject');
      const details = i.fields.getTextInputValue('details');
      const guild = i.guild;
      const supportRoles = env('TICKET_STAFF_ROLE_IDS').split(',').map((id) => id.trim()).filter(Boolean);
      const overwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: i.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
        { id: ctx.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ReadMessageHistory] },
        ...supportRoles.map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
      ];
      try {
        const channel = await guild.channels.create({ name: `ticket-${i.user.username}`.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 90), type: ChannelType.GuildText, parent: env('TICKET_CATEGORY_ID') || undefined, permissionOverwrites: overwrites, reason: `Support-Ticket von ${i.user.tag}` });
        await ctx.db.set('tickets', i.user.id, { channelId: channel.id, status: 'open', subject, openedAt: Date.now(), ownerId: i.user.id, handlerId: null });
        const mentions = supportRoles.map((id) => `<@&${id}>`).join(' ');
        await channel.send({ content: `<@${i.user.id}> ${mentions}`, embeds: [brandedEmbed(`Ticket: ${subject}`, details)], components: [closeRow()], allowedMentions: { users: [i.user.id], roles: supportRoles } });
        await i.reply({ content: `Dein Ticket wurde erstellt: ${channel}`, ephemeral: true });
        await sendLog(ctx, 'TICKET_LOG_CHANNEL_ID', 'Ticket eröffnet', `Ersteller: <@${i.user.id}>\nKanal: ${channel}\nBetreff: ${subject}`);
      } catch (error) { ctx.logger.error(`[TICKETS] ${error.message}`); await i.reply({ content: 'Das Ticket konnte nicht erstellt werden. Bitte kontaktiere den Support.', ephemeral: true }); }
      return true;
    }
    if (i.customId === 'ticket:close' && i.isButton()) {
      const entry = ctx.db.all('tickets').find(([, value]) => value.channelId === i.channelId)?.[1];
      if (!entry || entry.status !== 'open') { await i.reply({ content: 'Dieses Ticket ist bereits geschlossen oder nicht registriert.', ephemeral: true }); return true; }
      if (i.user.id !== entry.ownerId && !isStaff(i.member)) { await i.reply({ content: 'Nur der Ticket-Ersteller oder das Team darf schließen.', ephemeral: true }); return true; }
      entry.status = 'closed'; entry.closedAt = Date.now(); entry.handlerId = i.user.id === entry.ownerId ? null : i.user.id;
      await ctx.db.set('tickets', entry.ownerId, entry);
      await i.channel.send({ embeds: [brandedEmbed('Ticket geschlossen', `Geschlossen von <@${i.user.id}>. Die Bewertung wird per Direktnachricht angefragt.`)] });
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
              content: `Ticket-Transcript • Ersteller: <@${entry.ownerId}> • Geschlossen von: <@${i.user.id}>`,
              files: [{ attachment: Buffer.from(lines, 'utf8'), name: `ticket-${entry.ownerId}-${Date.now()}.txt` }],
              allowedMentions: { parse: [] },
            }).catch((error) => ctx.logger.warn(`[TICKETS] Transcript konnte nicht gesendet werden: ${error.message}`));
          }
        }
      }
      const ratingButtons = new ActionRowBuilder().addComponents([1, 2, 3, 4, 5].map((stars) => new ButtonBuilder().setCustomId(`ticket:rate:${entry.ownerId}:${stars}`).setLabel('★'.repeat(stars)).setStyle(stars < 3 ? ButtonStyle.Secondary : ButtonStyle.Primary)));
      const owner = await ctx.client.users.fetch(entry.ownerId).catch(() => null);
      await owner?.send({ content: `Wie bewertest du deinen Support bei Rheinland Netzwerk?`, components: [ratingButtons] }).catch(() => null);
      await sendLog(ctx, 'TICKET_LOG_CHANNEL_ID', 'Ticket geschlossen', `Ticket von <@${entry.ownerId}>\nBearbeitet/geschlossen von <@${i.user.id}>\nKanal-ID: ${i.channelId}`);
      return true;
    }
    if (i.customId.startsWith('ticket:rate:') && i.isButton()) {
      const [, , ownerId, starsRaw] = i.customId.split(':');
      const stars = Number(starsRaw);
      const entry = ctx.db.get('tickets', ownerId);
      if (!entry || !Number.isInteger(stars) || stars < 1 || stars > 5) { await i.reply({ content: 'Diese Bewertung kann nicht zugeordnet werden.', ephemeral: true }); return true; }
      const modal = new ModalBuilder().setCustomId(`ticket:feedback:${ownerId}:${stars}`).setTitle('Support bewerten');
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('comment').setLabel('Kommentar (optional)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(700)));
      await i.showModal(modal); return true;
    }
    if (i.customId.startsWith('ticket:feedback:') && i.isModalSubmit()) {
      const [, , ownerId, starsRaw] = i.customId.split(':');
      const comment = i.fields.getTextInputValue('comment') || '';
      const blocked = env('BAD_WORDS').split(',').map((word) => word.trim().toLowerCase()).filter(Boolean);
      if (blocked.some((word) => comment.toLowerCase().includes(word))) { await i.reply({ content: 'Bitte formuliere deine Bewertung sachlich und ohne Beleidigungen.', ephemeral: true }); return true; }
      const entry = ctx.db.get('tickets', ownerId);
      const rating = { stars: Number(starsRaw), comment, userId: ownerId, handlerId: entry?.handlerId ?? null, createdAt: Date.now() };
      await ctx.db.set('ticketFeedback', `${ownerId}-${Date.now()}`, rating);
      await sendLog(ctx, 'FEEDBACK_LOG_CHANNEL_ID', 'Ticket-Bewertung eingegangen', `Bewertung: ${'⭐'.repeat(rating.stars)} (${rating.stars}/5)\nMitglied: <@${ownerId}>\nBearbeiter: ${rating.handlerId ? `<@${rating.handlerId}>` : 'Nicht zugeordnet'}\nKommentar: ${comment || 'Kein Kommentar'}`);
      await i.reply({ content: 'Danke für dein Feedback!', ephemeral: true }); return true;
    }
    return false;
  },
};
