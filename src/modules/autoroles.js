import { list } from '../core/config.js';
import { sendLog } from '../core/brand.js';

export default {
  name: 'autoroles',
  async onMemberAdd(member, ctx) {
    const roleIds = list('AUTOROLE_IDS');
    if (!roleIds.length) return;
    const results = await Promise.allSettled(roleIds.map((id) => member.roles.add(id, 'Rheinland Netzwerk Autorolle')));
    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length) {
      ctx.logger.warn(`[AUTOROLES] ${failed.length}/${roleIds.length} Rollen konnten für ${member.id} nicht vergeben werden. Rollen-Hierarchie/Berechtigungen prüfen.`);
      await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Autorollen nicht vollständig vergeben', `Mitglied: <@${member.id}>\nFehlgeschlagen: ${failed.length}/${roleIds.length}. Bitte Bot-Rollen-Hierarchie und "Rollen verwalten" prüfen.`);
    }
  },
};
