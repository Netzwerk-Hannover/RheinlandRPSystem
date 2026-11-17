import { env } from '../core/config.js';
import { brandedEmbed, sendPanel } from '../core/brand.js';

export default {
  name: 'einfuehrung',
  async setup(ctx) {
    const description = [
      '**Willkommen bei Rheinland Netzwerk!**',
      '1. Lies das Discord- und Ingame-Regelwerk.',
      '2. Schließe die Verifizierung im Verify-Kanal ab.',
      '3. Schau in die FAQ und die Serverinformationen.',
      '4. Wähle passende Selfroles.',
      '5. Bei Fragen eröffnest du ein Support-Ticket.',
      '',
      env('SERVER_INFO_TEXT', 'Viel Spaß auf Rheinland Netzwerk!'),
    ].join('\n');
    await sendPanel(ctx, 'introduction', 'INTRO_CHANNEL_ID', { embeds: [brandedEmbed('Rheinland Netzwerk • Einführung', description)] });
  },
};
