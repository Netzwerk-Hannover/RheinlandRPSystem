import { ChannelType, SlashCommandBuilder } from 'discord.js';
import { env } from '../core/config.js';
import { brandedEmbed } from '../core/brand.js';

const questions = [
  ['Wie joine ich dem Server?', 'Öffne den veröffentlichten Server-Link bzw. den Server-Eintrag und folge den Einreise-Anweisungen. Bei Problemen hilft dir das Support-Team.'],
  ['Wie schließe ich die Verifizierung ab?', 'Gehe in den Verify-Kanal und klicke auf "Jetzt verifizieren". Lies vorher die Regeln.'],
  ['Wo finde ich die Regelwerke?', 'Discord-, Ingame-, Team- und Content-Creator-Regelwerk findest du über den Regelwerk-Bereich.'],
  ['Wie erhalte ich Support?', 'Eröffne ein Ticket über das Ticket-Panel und beschreibe dein Anliegen möglichst genau.'],
  ['Wie bewerbe ich mich für eine Fraktion?', 'Nutze den Befehl /fraktion-beantragen oder das Bewerbungs-Panel. Die Rückmeldung erfolgt per Direktnachricht.'],
  ['Wie melde ich einen Bug?', 'Nutze das Bug-Panel. Dein Fehlerbericht wird automatisch als Thread angelegt und an das Team gemeldet.'],
];

export default {
  name: 'faq',
  commands: [new SlashCommandBuilder().setName('faq').setDescription('Zeigt häufige Fragen zu Rheinland Netzwerk').toJSON()],
  async setup(ctx) {
    const channel = await ctx.client.channels.fetch(env('FAQ_FORUM_CHANNEL_ID')).catch(() => null);
    if (!channel || channel.type !== ChannelType.GuildForum) return;
    for (const [index, [title, answer]] of questions.entries()) {
      const key = `faq-${index}`;
      if (ctx.db.get('faqThreads', key)) continue;
      try {
        const thread = await channel.threads.create({ name: title, message: { embeds: [brandedEmbed(title, answer)] }, autoArchiveDuration: 10080 });
        await ctx.db.set('faqThreads', key, thread.id);
      } catch (error) { ctx.logger.warn(`[FAQ] ${error.message}`); }
    }
  },
  async execute(interaction) {
    await interaction.reply({ embeds: [brandedEmbed('FAQ • Rheinland Netzwerk', env('FAQ_CONTENT', questions.map(([q, a]) => `**${q}**\n${a}`).join('\n\n')), { fields: questions.map(([q, a]) => ({ name: q, value: a.slice(0, 1024) })) })], ephemeral: true });
  },
};
