import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { env } from '../core/config.js';
import { brandedEmbed, sendLog, sendPanel } from '../core/brand.js';

const makeModal = () => {
  const modal = new ModalBuilder().setCustomId('suggestion:submit').setTitle('Vorschlag einreichen');
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Titel des Vorschlags').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('details').setLabel('Beschreibe deinen Vorschlag').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1600)),
  ); return modal;
};
const voteRow = (id, votes = 0) => new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`suggestion:vote:${id}`).setLabel(`👍 Unterstützen (${votes})`).setStyle(ButtonStyle.Primary));

export default {
  name: 'vorschlaege',
  commands: [new SlashCommandBuilder().setName('vorschlag-panel').setDescription('Erstellt das Vorschlags-Panel erneut').toJSON()],
  async setup(ctx) {
    await sendPanel(ctx, 'suggestions', 'SUGGESTION_CHANNEL_ID', { embeds: [brandedEmbed('Rheinland Netzwerk • Vorschläge', 'Teile deine Ideen mit dem Team. Jeder Vorschlag wird automatisch in einem eigenen Thread gesammelt und kann unterstützt werden.')], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('suggestion:open').setLabel('Vorschlag einreichen').setStyle(ButtonStyle.Primary).setEmoji('💡'))] });
  },
  async execute(i) { await i.reply({ content: 'Das Vorschlags-Panel wird automatisch im konfigurierten Kanal bereitgestellt.', ephemeral: true }); },
  async onInteraction(i, ctx) {
    if (i.isButton() && i.customId === 'suggestion:open') { await i.showModal(makeModal()); return true; }
    if (i.isModalSubmit() && i.customId === 'suggestion:submit') {
      const channelId = env('SUGGESTION_CHANNEL_ID'); const channel = channelId ? await ctx.client.channels.fetch(channelId).catch(() => null) : null;
      if (!channel?.isTextBased()) { await i.reply({ content: 'Der Vorschlagskanal ist nicht erreichbar.', ephemeral: true }); return true; }
      const title = i.fields.getTextInputValue('title'); const details = i.fields.getTextInputValue('details'); const id = `V-${Date.now().toString(36)}`;
      const payload = { authorId: i.user.id, title, details, votes: [], createdAt: Date.now() };
      const messagePayload = { embeds: [brandedEmbed(title, `${details}\n\nEingereicht von: <@${i.user.id}>`, { fields: [{ name: 'Status', value: 'Neu' }, { name: 'Unterstützungen', value: '0' }] })], components: [voteRow(id)] };
      let threadId;
      if (channel.type === ChannelType.GuildForum) {
        const thread = await channel.threads.create({ name: title.slice(0, 100), message: messagePayload, autoArchiveDuration: 10080 }); threadId = thread.id;
      } else {
        const message = await channel.send(messagePayload); const thread = await message.startThread({ name: title.slice(0, 100), autoArchiveDuration: 10080 }); threadId = thread.id;
      }
      payload.threadId = threadId; await ctx.db.set('suggestions', id, payload);
      await i.reply({ content: `Dein Vorschlag wurde als Thread erstellt: <#${threadId}>`, ephemeral: true });
      await sendLog(ctx, 'SUGGESTION_LOG_CHANNEL_ID', 'Neuer Vorschlag', `${title}\nEingereicht von: ${i.user}\nThread: <#${threadId}>`);
      return true;
    }
    if (i.isButton() && i.customId.startsWith('suggestion:vote:')) {
      const id = i.customId.split(':')[2]; const entry = ctx.db.get('suggestions', id);
      if (!entry) { await i.reply({ content: 'Vorschlag nicht gefunden.', ephemeral: true }); return true; }
      entry.votes ??= [];
      if (entry.votes.includes(i.user.id)) entry.votes = entry.votes.filter((userId) => userId !== i.user.id); else entry.votes.push(i.user.id);
      await ctx.db.set('suggestions', id, entry);
      const embed = brandedEmbed(entry.title, `${entry.details}\n\nEingereicht von: <@${entry.authorId}>`, { fields: [{ name: 'Status', value: 'Neu' }, { name: 'Unterstützungen', value: String(entry.votes.length) }] });
      await i.message.edit({ embeds: [embed], components: [voteRow(id, entry.votes.length)] });
      await i.reply({ content: 'Deine Stimme wurde aktualisiert.', ephemeral: true }); return true;
    }
    return false;
  },
};
