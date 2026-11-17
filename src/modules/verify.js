import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { env } from '../core/config.js';
import { brandedEmbed, sendLog, sendPanel } from '../core/brand.js';

export default {
  name: 'verify',
  async setup(ctx) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify:confirm').setLabel('Jetzt verifizieren').setStyle(ButtonStyle.Primary).setEmoji('✅'),
    );
    await sendPanel(ctx, 'verify', 'VERIFY_CHANNEL_ID', {
      embeds: [brandedEmbed(env('VERIFY_PANEL_TITLE', 'Willkommen bei Rheinland Netzwerk'), env('VERIFY_PANEL_TEXT', 'Bestätige die Regeln, um Zugriff auf den Server zu erhalten.'))],
      components: [row],
    });
  },
  async onInteraction(interaction, ctx) {
    if (interaction.customId !== 'verify:confirm' || !interaction.isButton()) return false;
    const verifiedRole = env('VERIFIED_ROLE_ID');
    const unverifiedRole = env('UNVERIFIED_ROLE_ID');
    if (!verifiedRole) {
      await interaction.reply({ content: 'Die Verifizierung ist noch nicht vollständig konfiguriert. Bitte melde dies dem Team.', ephemeral: true });
      return true;
    }
    try {
      await interaction.member.roles.add(verifiedRole, 'Rheinland Netzwerk Verifizierung');
      if (unverifiedRole) await interaction.member.roles.remove(unverifiedRole).catch(() => null);
      await interaction.reply({ content: 'Du bist jetzt verifiziert. Willkommen bei Rheinland Netzwerk!', ephemeral: true });
      await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Mitglied verifiziert', `${interaction.user.tag} (${interaction.user.id}) hat die Verifizierung abgeschlossen.`);
    } catch (error) {
      await interaction.reply({ content: 'Die Rolle konnte nicht vergeben werden. Bitte informiere das Team.', ephemeral: true });
      ctx.logger.error(`[VERIFY] ${error.message}`);
    }
    return true;
  },
};
