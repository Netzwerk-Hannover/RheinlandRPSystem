import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { parseSelfRoles } from '../core/config.js';
import { brandedEmbed, sendPanel, sendLog } from '../core/brand.js';

export default {
  name: 'selfroles',
  async setup(ctx) {
    const roles = parseSelfRoles();
    if (!roles.length) return;
    const rows = [];
    for (let i = 0; i < roles.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(roles.slice(i, i + 5).map((role) => new ButtonBuilder().setCustomId(`selfrole:${role.roleId}`).setLabel(role.label.slice(0, 80)).setStyle(ButtonStyle.Secondary))));
    }
    await sendPanel(ctx, 'selfroles', 'SELFROLE_CHANNEL_ID', { embeds: [brandedEmbed('Rheinland Netzwerk • Selfroles', 'Wähle die Rollen aus, die du erhalten möchtest. Ein erneuter Klick entfernt die jeweilige Rolle.')], components: rows });
  },
  async onInteraction(i, ctx) {
    if (!i.isButton() || !i.customId.startsWith('selfrole:')) return false;
    const roleId = i.customId.split(':')[1];
    if (!parseSelfRoles().some((role) => role.roleId === roleId)) { await i.reply({ content: 'Diese Rolle ist nicht freigegeben.', ephemeral: true }); return true; }
    const role = i.guild.roles.cache.get(roleId);
    if (!role || role.managed || role.position >= i.guild.members.me.roles.highest.position) { await i.reply({ content: 'Diese Rolle kann vom Bot nicht verwaltet werden. Bitte melde dies dem Team.', ephemeral: true }); return true; }
    try {
      const hasRole = i.member.roles.cache.has(roleId);
      if (hasRole) await i.member.roles.remove(roleId); else await i.member.roles.add(roleId);
      await i.reply({ content: hasRole ? `Rolle **${role.name}** entfernt.` : `Rolle **${role.name}** hinzugefügt.`, ephemeral: true });
      await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Selfrole geändert', `${i.user} ${hasRole ? 'hat entfernt' : 'hat erhalten'}: ${role.name}`);
    } catch (error) { ctx.logger.error(`[SELFROLES] ${error.message}`); await i.reply({ content: 'Die Rolle konnte nicht geändert werden. Bitte informiere das Team.', ephemeral: true }); }
    return true;
  },
};
