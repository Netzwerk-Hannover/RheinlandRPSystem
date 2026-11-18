import { list } from '../core/config.js';

export default {
  name: 'autorole',

  async onMemberAdd(member, ctx) {
    const roleIds = [...new Set(list('AUTOROLE_IDS'))];
    if (roleIds.length === 0) return;

    for (const roleId of roleIds) {
      if (!/^\d{15,22}$/.test(roleId)) {
        ctx.logger.warn(`[AUTOROLE] Ungültige Rollen-ID in AUTOROLE_IDS: ${roleId}`);
        continue;
      }

      const role = await member.guild.roles.fetch(roleId).catch(() => null);
      if (!role) {
        ctx.logger.warn(`[AUTOROLE] Rolle ${roleId} wurde auf dem Server nicht gefunden.`);
        continue;
      }

      if (member.roles.cache.has(roleId)) continue;

      try {
        await member.roles.add(role, 'Automatische Rollenvergabe beim Serverbeitritt');
        ctx.logger.info(`[AUTOROLE] Rolle "${role.name}" an ${member.user.tag} vergeben.`);
      } catch (error) {
        ctx.logger.warn(`[AUTOROLE] Rolle "${role.name}" konnte ${member.user.tag} nicht zugewiesen werden: ${error.message}`);
      }
    }
  },
};
