import { Readable } from 'node:stream';
import { createAudioPlayer, createAudioResource, entersState, joinVoiceChannel, NoSubscriberBehavior, StreamType, VoiceConnectionStatus } from '@discordjs/voice';
import { env, bool } from '../core/config.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default {
  name: '24-7-voice',
  async setup(ctx) {
    const channelId = env('VOICE_247_CHANNEL_ID');
    if (!channelId) return;
    const channel = await ctx.client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isVoiceBased() || !channel.guild) {
      ctx.logger.warn('[VOICE] VOICE_247_CHANNEL_ID ist kein erreichbarer Voice-Kanal.');
      return;
    }

    const player = createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Play } });
    const silence = Readable.from((async function* () {
      while (!ctx.shuttingDown) {
        yield Buffer.from([0xf8, 0xff, 0xfe]);
        await delay(20);
      }
    })());
    player.play(createAudioResource(silence, { inputType: StreamType.Opus }));
    player.on('error', (error) => ctx.logger.warn(`[VOICE] Player: ${error.message}`));

    let reconnecting = false;
    const connect = async () => {
      if (ctx.shuttingDown || !ctx.client.isReady()) return;
      const connection = joinVoiceChannel({
        channelId,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: bool('VOICE_247_SELF_DEAF', true),
        selfMute: false,
      });
      connection.on('error', (error) => ctx.logger.warn(`[VOICE] Verbindung: ${error.message}`));
      connection.on(VoiceConnectionStatus.Disconnected, async () => {
        try {
          await Promise.race([
            entersState(connection, VoiceConnectionStatus.Signalling, 5000),
            entersState(connection, VoiceConnectionStatus.Connecting, 5000),
          ]);
        } catch {
          connection.destroy();
          if (reconnecting || ctx.shuttingDown) return;
          reconnecting = true;
          for (let attempt = 1; !ctx.shuttingDown && ctx.client.isReady(); attempt += 1) {
            await delay(Math.min(attempt * 5000, 30000));
            try {
              await connect();
              ctx.logger.info('[VOICE] 24/7-Verbindung wurde wiederhergestellt.');
              break;
            } catch (error) {
              ctx.logger.warn(`[VOICE] Wiederverbindung ${attempt} fehlgeschlagen: ${error.message}`);
            }
          }
          reconnecting = false;
        }
      });
      await entersState(connection, VoiceConnectionStatus.Ready, 20000);
      connection.subscribe(player);
      return connection;
    };

    try {
      await connect();
      ctx.logger.info(`[VOICE] 24/7-Raum verbunden: ${channel.name}`);
    } catch (error) {
      ctx.logger.error(`[VOICE] Verbindung fehlgeschlagen: ${error.message}`);
    }
  },
};
