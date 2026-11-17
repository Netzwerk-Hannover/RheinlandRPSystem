import { SlashCommandBuilder } from 'discord.js';
import { list } from '../core/config.js';
import { sendLog } from '../core/brand.js';
import { requireStaff } from '../core/permissions.js';

const userOption = (builder) => builder.addUserOption((o) => o.setName('mitglied').setDescription('Betroffenes Teammitglied').setRequired(true));

export default {
  name: 'teamverwaltung',
  commands: [
    userOption(new SlashCommandBuilder().setName('uprank').setDescription('Befördert ein Teammitglied')).toJSON(),
    userOption(new SlashCommandBuilder().setName('downrank').setDescription('Stuft ein Teammitglied herunter')).toJSON(),
    new SlashCommandBuilder().setName('teamupdate').setDescription('Dokumentiert eine Teammaßnahme')
      .addUserOption((o) => o.setName('mitglied').setDescription('Teammitglied').setRequired(true))
      .addStringOption((o) => o.setName('aktion').setDescription('Maßnahme').setRequired(true).addChoices({ name: 'Verwarnung', value: 'warn' }, { name: 'Kick', value: 'kick' }, { name: 'Rolle vergeben', value: 'role-add' }, { name: 'Rolle entfernen', value: 'role-remove' }))
      .addStringOption((o) => o.setName('grund').setDescription('Begründung').setRequired(true).setMaxLength(800))
      .addRoleOption((o) => o.setName('rolle').setDescription('Bei Rollenaktion erforderliche Rolle').setRequired(false)).toJSON(),
  ],
  async execute(i, ctx) {
    if (!await requireStaff(i)) return;
    const target = i.options.getMember('mitglied');
    if (!target) { await i.reply({ content: 'Mitglied wurde nicht gefunden.', ephemeral: true }); return; }
    if (i.commandName === 'uprank' || i.commandName === 'downrank') {
      const hierarchy = list('TEAM_HIERARCHY_ROLE_IDS');
      if (hierarchy.length < 2) { await i.reply({ content: 'TEAM_HIERARCHY_ROLE_IDS muss mindestens zwei Rollen enthalten (höchste zuerst).', ephemeral: true }); return; }
      const currentIndex = hierarchy.findIndex((id) => target.roles.cache.has(id));
      const nextIndex = i.commandName === 'uprank' ? currentIndex - 1 : currentIndex + 1;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= hierarchy.length) { await i.reply({ content: 'Für dieses Mitglied ist keine weitere Beförderung/Herabstufung möglich.', ephemeral: true }); return; }
      await target.roles.remove(hierarchy.filter((id) => target.roles.cache.has(id)));
      await target.roles.add(hierarchy[nextIndex]);
      const role = i.guild.roles.cache.get(hierarchy[nextIndex]);
      await i.reply({ content: `${target} wurde auf **${role?.name ?? 'neue Position'}** ${i.commandName === 'uprank' ? 'befördert' : 'herabgestuft'}.`, ephemeral: true });
      await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Team-Rang geändert', `Mitglied: ${target}\nNeuer Rang: ${role?.name ?? hierarchy[nextIndex]}\nDurchgeführt von: ${i.user}`);
      return;
    }
    const action = i.options.getString('aktion');
    const reason = i.options.getString('grund');
    const role = i.options.getRole('rolle');
    let result = 'Maßnahme dokumentiert.';
    if (action === 'warn') {
      const warnings = ctx.db.get('teamWarnings', target.id, []);
      warnings.push({ reason, by: i.user.id, at: Date.now() });
      await ctx.db.set('teamWarnings', target.id, warnings);
      result = `Verwarnung gespeichert. Gesamt: ${warnings.length}`;
    } else if (action === 'kick') {
      await target.kick(`Teammaßnahme durch ${i.user.tag}: ${reason}`);
      result = 'Teammitglied wurde vom Server entfernt.';
    } else if (action === 'role-add' || action === 'role-remove') {
      if (!role) { await i.reply({ content: 'Für diese Aktion musst du eine Rolle auswählen.', ephemeral: true }); return; }
      if (action === 'role-add') await target.roles.add(role); else await target.roles.remove(role);
      result = `${action === 'role-add' ? 'Rolle vergeben' : 'Rolle entfernt'}: ${role.name}`;
    }
    await i.reply({ content: result, ephemeral: true });
    await sendLog(ctx, 'TEAM_LOG_CHANNEL_ID', 'Team-Update', `Mitglied: ${target}\nAktion: ${action}\nGrund: ${reason}\nDurchgeführt von: ${i.user}`);
  },
};
