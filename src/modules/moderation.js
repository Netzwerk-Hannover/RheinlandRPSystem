import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { sendLog } from '../core/brand.js';
import { requireStaff } from '../core/permissions.js';

export default {
  name: 'moderation',
  commands: [
    new SlashCommandBuilder().setName('warn').setDescription('Verwarnt ein Mitglied').addUserOption((o) => o.setName('mitglied').setDescription('Mitglied').setRequired(true)).addStringOption((o) => o.setName('grund').setDescription('Grund').setRequired(true).setMaxLength(700)).toJSON(),
    new SlashCommandBuilder().setName('timeout').setDescription('Gibt einem Mitglied eine Auszeit').addUserOption((o) => o.setName('mitglied').setDescription('Mitglied').setRequired(true)).addIntegerOption((o) => o.setName('minuten').setDescription('Dauer in Minuten').setRequired(true).setMinValue(1).setMaxValue(40320)).addStringOption((o) => o.setName('grund').setDescription('Grund').setRequired(false).setMaxLength(500)).toJSON(),
    new SlashCommandBuilder().setName('untimeout').setDescription('Entfernt eine Auszeit').addUserOption((o) => o.setName('mitglied').setDescription('Mitglied').setRequired(true)).toJSON(),
    new SlashCommandBuilder().setName('kick').setDescription('Entfernt ein Mitglied vom Server').addUserOption((o) => o.setName('mitglied').setDescription('Mitglied').setRequired(true)).addStringOption((o) => o.setName('grund').setDescription('Grund').setRequired(true).setMaxLength(500)).toJSON(),
    new SlashCommandBuilder().setName('ban').setDescription('Bannt ein Mitglied').addUserOption((o) => o.setName('mitglied').setDescription('Mitglied').setRequired(true)).addStringOption((o) => o.setName('grund').setDescription('Grund').setRequired(true).setMaxLength(500)).toJSON(),
    new SlashCommandBuilder().setName('purge').setDescription('Löscht mehrere Nachrichten').addIntegerOption((o) => o.setName('anzahl').setDescription('1 bis 100').setRequired(true).setMinValue(1).setMaxValue(100)).toJSON(),
    new SlashCommandBuilder().setName('slowmode').setDescription('Setzt den Slowmode im aktuellen Kanal').addIntegerOption((o) => o.setName('sekunden').setDescription('0 bis 21600').setRequired(true).setMinValue(0).setMaxValue(21600)).toJSON(),
  ],
  async execute(i, ctx) {
    if (!await requireStaff(i)) return;
    const command = i.commandName;
    if (command === 'purge') {
      const amount = i.options.getInteger('anzahl');
      if (!i.channel?.bulkDelete) { await i.reply({ content: 'In diesem Kanal ist das nicht möglich.', ephemeral: true }); return; }
      const deleted = await i.channel.bulkDelete(amount, true);
      await i.reply({ content: `${deleted.size} Nachrichten gelöscht.`, ephemeral: true });
      await sendLog(ctx, 'MOD_LOG_CHANNEL_ID', 'Nachrichten gelöscht', `${i.user} hat ${deleted.size} Nachrichten in <#${i.channelId}> gelöscht.`); return;
    }
    if (command === 'slowmode') {
      const seconds = i.options.getInteger('sekunden');
      await i.channel.setRateLimitPerUser(seconds, `Slowmode von ${i.user.tag} geändert`);
      await i.reply({ content: `Slowmode auf ${seconds} Sekunden gesetzt.`, ephemeral: true });
      await sendLog(ctx, 'MOD_LOG_CHANNEL_ID', 'Slowmode geändert', `${i.user} setzte den Slowmode in <#${i.channelId}> auf ${seconds}s.`); return;
    }
    const user = i.options.getUser('mitglied');
    const member = await i.guild.members.fetch(user.id).catch(() => null);
    const reason = i.options.getString('grund') || `Moderationsmaßnahme durch ${i.user.tag}`;
    if (command === 'warn') {
      const warnings = ctx.db.get('userWarnings', user.id, []); warnings.push({ reason, moderatorId: i.user.id, at: Date.now() }); await ctx.db.set('userWarnings', user.id, warnings);
      await user.send(`Du hast eine Verwarnung auf Rheinland Netzwerk erhalten. Grund: ${reason}`).catch(() => null);
      await i.reply({ content: `${user.tag} wurde verwarnt. Verwarnungen: ${warnings.length}`, ephemeral: true });
    } else if (command === 'timeout') {
      if (!member) { await i.reply({ content: 'Mitglied ist nicht mehr auf dem Server.', ephemeral: true }); return; }
      await member.timeout(i.options.getInteger('minuten') * 60000, reason);
      await i.reply({ content: `${user.tag} wurde für ${i.options.getInteger('minuten')} Minuten timeoutet.`, ephemeral: true });
    } else if (command === 'untimeout') {
      if (!member) { await i.reply({ content: 'Mitglied ist nicht mehr auf dem Server.', ephemeral: true }); return; }
      await member.timeout(null, `Timeout aufgehoben durch ${i.user.tag}`);
      await i.reply({ content: `Timeout für ${user.tag} aufgehoben.`, ephemeral: true });
    } else if (command === 'kick') {
      if (!member) { await i.reply({ content: 'Mitglied ist nicht mehr auf dem Server.', ephemeral: true }); return; }
      await member.kick(reason); await i.reply({ content: `${user.tag} wurde gekickt.`, ephemeral: true });
    } else if (command === 'ban') {
      await i.guild.members.ban(user.id, { reason }); await i.reply({ content: `${user.tag} wurde gebannt.`, ephemeral: true });
    }
    await sendLog(ctx, 'MOD_LOG_CHANNEL_ID', `Moderation: ${command}`, `Mitglied: ${user.tag} (${user.id})\nGrund: ${reason}\nDurchgeführt von: ${i.user.tag}`);
  },
};
