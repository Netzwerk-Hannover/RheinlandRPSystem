import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { randomUUID } from 'node:crypto';
import { isOwner, requireStaff } from '../core/permissions.js';
import { sendLog } from '../core/brand.js';

const pendingActions = new Map();
const CONFIRM_TIMEOUT_MS = 2 * 60 * 1000;
const CONCURRENCY = 3;
const PROGRESS_EVERY = 25;

function buildConfirmation(action, role, memberCount, includeBots) {
  const verb = action === 'add' ? 'hinzufügen' : 'entfernen';
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('massrole:confirm')
      .setLabel('Jetzt ausführen')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('massrole:cancel')
      .setLabel('Abbrechen')
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    content: `**Massen-Rollenvergabe bestätigen**\nSoll die Rolle <@&${role.id}> bei bis zu **${memberCount} Mitgliedern** ${verb} werden?\n\nBots: ${includeBots ? 'werden eingeschlossen' : 'werden übersprungen'}\nDiese Aktion kann viele Mitglieder betreffen.`,
    components: [row],
    allowedMentions: { roles: [] },
  };
}

async function processMembers(interaction, ctx, action, role, members, includeBots) {
  const candidates = [...members.values()].filter((member) => {
    if (!includeBots && member.user.bot) return false;
    const hasRole = member.roles.cache.has(role.id);
    return action === 'add' ? !hasRole : hasRole;
  });

  let succeeded = 0;
  let failed = 0;
  let skipped = members.size - candidates.length;
  let processed = 0;
  let lastProgress = 0;
  const reason = `Massrole ${action} durch ${interaction.user.tag} (${interaction.user.id})`;

  await interaction.editReply({
    content: `Starte: Rolle <@&${role.id}> wird ${action === 'add' ? 'vergeben' : 'entfernt'} …\n0 / ${candidates.length} bearbeitet.`,
    components: [],
    allowedMentions: { roles: [] },
  });

  for (let start = 0; start < candidates.length; start += CONCURRENCY) {
    const batch = candidates.slice(start, start + CONCURRENCY);
    const results = await Promise.all(batch.map(async (member) => {
      try {
        if (action === 'add') await member.roles.add(role, reason);
        else await member.roles.remove(role, reason);
        return true;
      } catch (error) {
        ctx.logger.warn(`[MASSROLE] ${action} fehlgeschlagen für ${member.user.tag} (${member.id}): ${error.message}`);
        return false;
      }
    }));

    for (const ok of results) {
      if (ok) succeeded += 1;
      else failed += 1;
    }
    processed += batch.length;

    if (processed - lastProgress >= PROGRESS_EVERY || processed === candidates.length) {
      lastProgress = processed;
      await interaction.editReply({
        content: `Massrole läuft für <@&${role.id}> …\nFortschritt: **${processed} / ${candidates.length}**\nErfolgreich: ${succeeded} · Fehlgeschlagen: ${failed} · Übersprungen: ${skipped}`,
        allowedMentions: { roles: [] },
      }).catch(() => null);
    }
  }

  const summary = [
    `Aktion: ${action === 'add' ? 'Rolle hinzugefügt' : 'Rolle entfernt'}`,
    `Rolle: ${role.name} (${role.id})`,
    `Ausgeführt von: ${interaction.user.tag} (${interaction.user.id})`,
    `Erfolgreich: ${succeeded}`,
    `Fehlgeschlagen: ${failed}`,
    `Übersprungen: ${skipped}`,
  ].join('\n');

  await interaction.editReply({
    content: `**Massrole abgeschlossen**\nRolle: <@&${role.id}>\nErfolgreich: **${succeeded}**\nFehlgeschlagen: **${failed}**\nÜbersprungen: **${skipped}**`,
    allowedMentions: { roles: [] },
  }).catch(() => null);

  await sendLog(ctx, 'MOD_LOG_CHANNEL_ID', 'Massrole ausgeführt', summary).catch((error) => {
    ctx.logger.warn(`[MASSROLE] Abschluss konnte nicht in den Mod-Logs protokolliert werden: ${error.message}`);
  });
  ctx.logger.info(`[MASSROLE] ${summary.replaceAll('\n', ' | ')}`);
}

export default {
  name: 'massrole',
  commands: [
    new SlashCommandBuilder()
      .setName('massrole')
      .setDescription('Fügt allen Mitgliedern eine Rolle hinzu oder entfernt sie')
      .addSubcommand((sub) => sub
        .setName('add')
        .setDescription('Fügt eine Rolle allen Mitgliedern hinzu')
        .addRoleOption((option) => option.setName('rolle').setDescription('Rolle für alle Mitglieder').setRequired(true))
        .addBooleanOption((option) => option.setName('bots').setDescription('Bot-Konten ebenfalls einschließen').setRequired(false)))
      .addSubcommand((sub) => sub
        .setName('remove')
        .setDescription('Entfernt eine Rolle bei allen Mitgliedern')
        .addRoleOption((option) => option.setName('rolle').setDescription('Rolle bei allen Mitgliedern entfernen').setRequired(true))
        .addBooleanOption((option) => option.setName('bots').setDescription('Bot-Konten ebenfalls einschließen').setRequired(false)))
      .toJSON(),
  ],

  async execute(interaction, ctx) {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({ content: 'Dieser Befehl funktioniert nur auf einem Server.', ephemeral: true });
      return;
    }
    if (!await requireStaff(interaction)) return;

    const botMember = interaction.guild.members.me
      ?? await interaction.guild.members.fetch(ctx.client.user.id).catch(() => null);
    if (!botMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
      await interaction.reply({ content: 'Mir fehlt die Berechtigung **Rollen verwalten**.', ephemeral: true });
      return;
    }

    const action = interaction.options.getSubcommand();
    const role = interaction.options.getRole('rolle', true);
    const includeBots = interaction.options.getBoolean('bots') ?? false;

    if (action === 'add' && role.permissions.has(PermissionFlagsBits.Administrator) && !isOwner(interaction.user.id)) {
      await interaction.reply({ content: 'Eine Administrator-Rolle darf nur der eingetragene Bot-Owner per Massrole vergeben.', ephemeral: true });
      return;
    }

    if (role.id === interaction.guild.id || role.managed || !role.editable) {
      await interaction.reply({ content: 'Diese Rolle kann ich nicht verwalten. Prüfe, ob sie eine Integrationsrolle oder höher als meine Bot-Rolle ist.', ephemeral: true });
      return;
    }

    const token = randomUUID();
    pendingActions.set(token, {
      action,
      roleId: role.id,
      guildId: interaction.guild.id,
      userId: interaction.user.id,
      includeBots,
      createdAt: Date.now(),
    });

    const timeout = setTimeout(() => pendingActions.delete(token), CONFIRM_TIMEOUT_MS);
    timeout.unref?.();

    await interaction.reply({
      ...buildConfirmation(action, role, interaction.guild.memberCount, includeBots),
      ephemeral: true,
    });

    const confirmation = await interaction.fetchReply();
    const collector = confirmation.createMessageComponentCollector({
      time: CONFIRM_TIMEOUT_MS,
      filter: (component) => component.user.id === interaction.user.id,
    });

    collector.on('collect', async (component) => {
      if (component.customId === 'massrole:cancel') {
        pendingActions.delete(token);
        clearTimeout(timeout);
        collector.stop('cancelled');
        await component.update({ content: 'Massrole wurde abgebrochen.', components: [] });
        return;
      }
      if (component.customId !== 'massrole:confirm') return;

      const pending = pendingActions.get(token);
      if (!pending || pending.userId !== component.user.id || pending.guildId !== component.guildId) {
        await component.reply({ content: 'Diese Bestätigung ist abgelaufen oder ungültig.', ephemeral: true });
        return;
      }

      pendingActions.delete(token);
      clearTimeout(timeout);
      collector.stop('confirmed');
      await component.deferUpdate();
      await component.editReply({ content: 'Mitglieder werden geladen …', components: [] });

      const currentRole = await component.guild.roles.fetch(pending.roleId).catch(() => null);
      const currentBotMember = component.guild.members.me
        ?? await component.guild.members.fetch(ctx.client.user.id).catch(() => null);
      if (!currentRole || currentRole.managed || !currentRole.editable ||
          !currentBotMember?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await component.editReply({ content: 'Abgebrochen: Rolle oder Bot-Berechtigungen haben sich seit der Bestätigung geändert.', components: [] });
        return;
      }

      try {
        const members = await component.guild.members.fetch();
        const refreshedBotMember = component.guild.members.me;
        if (!refreshedBotMember?.permissions.has(PermissionFlagsBits.ManageRoles) || !currentRole.editable) {
          await component.editReply({ content: 'Abgebrochen: Ich kann diese Rolle aktuell nicht verwalten.', components: [] });
          return;
        }
        await processMembers(component, ctx, pending.action, currentRole, members, pending.includeBots);
      } catch (error) {
        ctx.logger.error(`[MASSROLE] Mitglieder konnten nicht geladen werden: ${error.stack ?? error.message}`);
        await component.editReply({ content: 'Die Mitglieder konnten nicht vollständig geladen werden. Prüfe meine Serverberechtigungen und versuche es erneut.', components: [] }).catch(() => null);
      }
    });

    collector.on('end', async (_collected, reason) => {
      pendingActions.delete(token);
      clearTimeout(timeout);
      if (reason === 'time') {
        await interaction.editReply({ content: 'Massrole-Bestätigung abgelaufen. Es wurde nichts geändert.', components: [] }).catch(() => null);
      }
    });
  },
};
