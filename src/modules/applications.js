import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { env, int, list } from '../core/config.js';
import { attachAsset, brandedEmbed, sendLog, sendPanel } from '../core/brand.js';
import { hasAnyRole, isStaff } from '../core/permissions.js';

const teamRow = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('application:team').setLabel('Team-Bewerbung starten').setStyle(ButtonStyle.Primary),
);
const decisionRow = (key) => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(`application:decision:${key}:approve`).setLabel('Annehmen').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId(`application:decision:${key}:reject`).setLabel('Ablehnen').setStyle(ButtonStyle.Danger),
);

async function openApplicationModal(interaction) {
  const modal = new ModalBuilder().setCustomId('application:team:modal').setTitle('Team-Bewerbung');
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('age').setLabel('Wie alt bist du?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('name').setLabel('Discord-/Ingame-Name').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('experience').setLabel('Welche Erfahrung hast du?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(800)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivation').setLabel('Warum möchtest du mitmachen?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(800)),
  );
  await interaction.showModal(modal);
}

async function publishApplication(ctx, key, data) {
  const channelKey = data.type === 'fraction' && env('FRACTION_APPLICATION_LOG_CHANNEL_ID')
    ? 'FRACTION_APPLICATION_LOG_CHANNEL_ID'
    : 'APPLICATION_LOG_CHANNEL_ID';
  const channelId = env(channelKey);
  const channel = channelId ? await ctx.client.channels.fetch(channelId).catch(() => null) : null;
  if (!channel?.isTextBased()) return;
  const description = `Bewerbung von <@${data.userId}>\nTyp: ${data.type === 'team' ? 'Team' : 'Fraktion'}\nAlter: ${data.age}\nName/Fraktion: ${data.name}\nErfahrung: ${data.experience}\nMotivation: ${data.motivation}`;
  const embed = brandedEmbed(`Neue ${data.type === 'team' ? 'Team-' : 'Fraktions-'}Bewerbung`, description);
  const payload = await attachAsset({ embeds: [embed], components: [decisionRow(key)], allowedMentions: { parse: [] } }, embed.data.title);
  const message = await channel.send(payload);
  data.logChannelId = channel.id;
  data.logMessageId = message.id;
  await ctx.db.set('applications', key, data);
}

export default {
  name: 'bewerbungen',
  commands: [new SlashCommandBuilder().setName('bewerbung').setDescription('Öffnet das Bewerbungsformular').toJSON()],
  async setup(ctx) {
    await sendPanel(ctx, 'applications-team', 'APPLICATION_PANEL_CHANNEL_ID', {
      embeds: [brandedEmbed('Rheinland Netzwerk • Team-Bewerbung starten', 'Hier kannst du deine Bewerbung für das Team beginnen. Die Voraussetzungen findest du im separaten Voraussetzungen-Kanal. Nach dem Absenden erhältst du eine Bestätigung per DM.')],
      components: [teamRow()],
    });
    await sendPanel(ctx, 'team-requirements', 'TEAM_REQUIREMENTS_CHANNEL_ID', {
      embeds: [brandedEmbed('Rheinland Netzwerk • Voraussetzungen', env('TEAM_REQUIREMENTS', 'Mindestens 14 Jahre, PC ab HighTeam, gutes und funktionierendes Mikrofon, Zuverlässigkeit und Teamfähigkeit.'))],
    });
  },
  async execute(i) { await openApplicationModal(i); },
  async onInteraction(i, ctx) {
    if (!i.isButton?.() && !i.isModalSubmit?.()) return false;

    if (i.isButton() && i.customId === 'application:team') {
      await openApplicationModal(i);
      return true;
    }
    if (i.isButton() && i.customId === 'application:fraction') {
      if (ctx.db.get('fractionFlows', i.user.id)) {
        await i.reply({ content: 'Du hast bereits eine laufende Fraktionsbeantragung per DM.', ephemeral: true });
        return true;
      }
      try {
        await i.user.send('**Rheinland Netzwerk • Fraktion beantragen**\nIch stelle dir nacheinander fünf Fragen. Antworte bitte jeweils direkt auf diese DM.\n\n**1/5:** Wie soll deine Fraktion heißen?');
        await ctx.db.set('fractionFlows', i.user.id, { step: 0, answers: [], startedAt: Date.now() });
        await i.reply({ content: 'Ich habe dir den Fraktions-Fragebogen per DM geschickt. Beantworte dort die Fragen nacheinander.', ephemeral: true });
      } catch {
        await i.reply({ content: 'Ich konnte dir keine DM senden. Aktiviere Direktnachrichten vom Server und starte erneut.', ephemeral: true });
      }
      return true;
    }

    if (i.isModalSubmit() && i.customId === 'application:team:modal') {
      const ageText = i.fields.getTextInputValue('age').trim();
      const age = Number.parseInt(ageText, 10);
      if (!Number.isInteger(age) || age < 1 || age > 99) {
        await i.reply({ content: 'Bitte gib ein gültiges Alter an.', ephemeral: true });
        return true;
      }
      const minimumAge = int('TEAM_MIN_AGE', 14, 12, 99);
      if (age < minimumAge) {
        await i.reply({ content: `Für eine Team-Bewerbung musst du mindestens ${minimumAge} Jahre alt sein.`, ephemeral: true });
        return true;
      }
      const data = { type: 'team', userId: i.user.id, age: String(age), name: i.fields.getTextInputValue('name'), experience: i.fields.getTextInputValue('experience'), motivation: i.fields.getTextInputValue('motivation'), createdAt: Date.now(), status: 'open' };
      const key = `${i.user.id}-${Date.now()}`;
      await ctx.db.set('applications', key, data);
      await publishApplication(ctx, key, data);
      await i.user.send(await attachAsset({ embeds: [brandedEmbed('Bewerbung eingegangen', 'Deine Bewerbung ist bei Rheinland Netzwerk eingegangen. Das Team prüft sie und meldet sich per Direktnachricht bei dir.')] }, 'Bewerbung')).catch(() => null);
      await i.reply({ content: 'Deine Bewerbung wurde übermittelt. Du erhältst eine Rückmeldung per DM.', ephemeral: true });
      return true;
    }

    if (i.isButton() && i.customId.startsWith('application:decision:')) {
      const [, , key, decision] = i.customId.split(':');
      const allowedRoles = list('APPLICATION_STAFF_ROLE_IDS');
      if (!isStaff(i.member) && !hasAnyRole(i.member, allowedRoles)) {
        await i.reply({ content: 'Du darfst Bewerbungen nicht bearbeiten.', ephemeral: true });
        return true;
      }
      const data = ctx.db.get('applications', key);
      if (!data || data.status !== 'open' || !['approve', 'reject'].includes(decision)) {
        await i.reply({ content: 'Diese Bewerbung wurde bereits bearbeitet oder existiert nicht.', ephemeral: true });
        return true;
      }
      data.status = decision === 'approve' ? 'accepted' : 'rejected';
      data.decidedAt = Date.now();
      data.decidedBy = i.user.id;
      await ctx.db.set('applications', key, data);
      await i.message.edit(await attachAsset({ embeds: [brandedEmbed(`Bewerbung ${data.status === 'accepted' ? 'angenommen' : 'abgelehnt'}`, `Bewerbung von <@${data.userId}>\nBearbeitet von: <@${i.user.id}>\nStatus: **${data.status === 'accepted' ? 'Angenommen' : 'Abgelehnt'}**`)], components: [] }, 'Bewerbung'));
      const applicant = await ctx.client.users.fetch(data.userId).catch(() => null);
      await applicant?.send({ embeds: [brandedEmbed(data.status === 'accepted' ? 'Deine Bewerbung wurde angenommen' : 'Rückmeldung zu deiner Bewerbung', data.status === 'accepted' ? 'Deine Bewerbung bei Rheinland Netzwerk wurde angenommen. Das Team informiert dich über die nächsten Schritte.' : 'Deine Bewerbung wurde diesmal leider nicht angenommen. Vielen Dank für dein Interesse an Rheinland Netzwerk.')] }).catch(() => null);
      await i.reply({ content: `Bewerbung wurde ${data.status === 'accepted' ? 'angenommen' : 'abgelehnt'}. Die Person wurde per DM benachrichtigt.`, ephemeral: true });
      await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Bewerbungsentscheidung', `Bewerbung von <@${data.userId}> wurde ${data.status === 'accepted' ? 'angenommen' : 'abgelehnt'}\nBearbeitet von: ${i.user}`);
      return true;
    }
    return false;
  },
};
