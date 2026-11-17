import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { env } from '../core/config.js';
import { attachAsset, brandedEmbed, sendLog, sendPanel } from '../core/brand.js';

export default {
  name: 'bugreports',
  commands: [new SlashCommandBuilder().setName('bug-panel').setDescription('Stellt das Bug-Report-Panel erneut bereit').toJSON()],
  async setup(ctx) {
    await sendPanel(ctx, 'bugs', 'BUG_CHANNEL_ID', { embeds: [brandedEmbed('Rheinland Netzwerk • Bug melden', 'Melde Fehler mit einer möglichst genauen Beschreibung. Jeder Bericht wird automatisch als Thread angelegt und an das Team weitergeleitet.')], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('bug:open').setLabel('Bug melden').setStyle(ButtonStyle.Primary).setEmoji('🐛'))] });
  },
  async execute(i) { await i.reply({ content: 'Das Bug-Panel wird automatisch im konfigurierten Kanal bereitgestellt.', ephemeral: true }); },
  async onInteraction(i, ctx) {
    if (i.isButton() && i.customId === 'bug:open') {
      const modal = new ModalBuilder().setCustomId('bug:submit').setTitle('Fehler melden');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('title').setLabel('Kurzer Titel').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('steps').setLabel('Wie lässt sich der Fehler reproduzieren?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1600)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('expected').setLabel('Was sollte passieren?').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(700)),
      );
      await i.showModal(modal); return true;
    }
    if (i.isModalSubmit() && i.customId === 'bug:submit') {
      const channelId = env('BUG_CHANNEL_ID'); const channel = channelId ? await ctx.client.channels.fetch(channelId).catch(() => null) : null;
      if (!channel?.isTextBased()) { await i.reply({ content: 'Der Bug-Kanal ist nicht erreichbar.', ephemeral: true }); return true; }
      const title = i.fields.getTextInputValue('title'); const steps = i.fields.getTextInputValue('steps'); const expected = i.fields.getTextInputValue('expected') || 'Nicht angegeben';
      const roleId = env('BUG_TEAM_ROLE_ID') || env('TEAM_PING_ROLE_ID');
      const embed = brandedEmbed(`Bug: ${title}`, `**Gemeldet von:** <@${i.user.id}>\n**Reproduktionsschritte:**\n${steps}\n\n**Erwartetes Verhalten:**\n${expected}`);
      const payload = await attachAsset({ content: roleId ? `<@&${roleId}>` : undefined, embeds: [embed], allowedMentions: { roles: roleId ? [roleId] : [] } }, 'Bug');
      let threadId;
      if (channel.type === ChannelType.GuildForum) { const thread = await channel.threads.create({ name: title.slice(0, 100), message: payload, autoArchiveDuration: 10080 }); threadId = thread.id; }
      else { const message = await channel.send(payload); const thread = await message.startThread({ name: title.slice(0, 100), autoArchiveDuration: 10080 }); threadId = thread.id; }
      await ctx.db.set('bugReports', `B-${Date.now().toString(36)}`, { userId: i.user.id, title, steps, expected, threadId, createdAt: Date.now(), status: 'open' });
      await i.reply({ content: `Fehlerbericht wurde erstellt: <#${threadId}>`, ephemeral: true });
      await sendLog(ctx, 'BUG_LOG_CHANNEL_ID', 'Neuer Bug gemeldet', `${title}\nVon: ${i.user}\nThread: <#${threadId}>`);
      return true;
    }
    return false;
  },
};
