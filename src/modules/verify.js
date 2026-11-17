import { randomInt } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import {
  ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} from 'discord.js';
import { env } from '../core/config.js';
import { brandedEmbed, sendLog, sendPanel } from '../core/brand.js';

const challenges = new Map();
const cooldowns = new Map();
const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const font = {
  '2': ['11111','00001','00001','11111','10000','10000','11111'],
  '3': ['11111','00001','00001','01111','00001','00001','11111'],
  '4': ['10001','10001','10001','11111','00001','00001','00001'],
  '5': ['11111','10000','10000','11111','00001','00001','11111'],
  '6': ['11111','10000','10000','11111','10001','10001','11111'],
  '7': ['11111','00001','00010','00100','01000','01000','01000'],
  '8': ['11111','10001','10001','11111','10001','10001','11111'],
  '9': ['11111','10001','10001','11111','00001','00001','11111'],
  A: ['01110','10001','10001','11111','10001','10001','10001'],
  B: ['11110','10001','10001','11110','10001','10001','11110'],
  C: ['01111','10000','10000','10000','10000','10000','01111'],
  D: ['11110','10001','10001','10001','10001','10001','11110'],
  E: ['11111','10000','10000','11110','10000','10000','11111'],
  F: ['11111','10000','10000','11110','10000','10000','10000'],
  G: ['01111','10000','10000','10111','10001','10001','01111'],
  H: ['10001','10001','10001','11111','10001','10001','10001'],
  J: ['00111','00010','00010','00010','10010','10010','01100'],
  K: ['10001','10010','10100','11000','10100','10010','10001'],
  L: ['10000','10000','10000','10000','10000','10000','11111'],
  M: ['10001','11011','10101','10101','10001','10001','10001'],
  N: ['10001','11001','10101','10011','10001','10001','10001'],
  P: ['11110','10001','10001','11110','10000','10000','10000'],
  Q: ['01110','10001','10001','10001','10101','10010','01101'],
  R: ['11110','10001','10001','11110','10100','10010','10001'],
  S: ['01111','10000','10000','01110','00001','00001','11110'],
  T: ['11111','00100','00100','00100','00100','00100','00100'],
  U: ['10001','10001','10001','10001','10001','10001','01110'],
  V: ['10001','10001','10001','10001','10001','01010','00100'],
  W: ['10001','10001','10001','10101','10101','10101','01010'],
  X: ['10001','10001','01010','00100','01010','10001','10001'],
  Y: ['10001','10001','01010','00100','00100','00100','00100'],
  Z: ['11111','00001','00010','00100','01000','10000','11111'],
};

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  crcTable[n] = c >>> 0;
}
function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const name = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}
function captchaPng(code) {
  const width = 300;
  const height = 92;
  const pixels = Buffer.alloc(width * height * 4);
  const setPixel = (x, y, color) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const offset = (y * width + x) * 4;
    pixels[offset] = color[0];
    pixels[offset + 1] = color[1];
    pixels[offset + 2] = color[2];
    pixels[offset + 3] = 255;
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      setPixel(x, y, [11 + Math.floor(y / 12), 24 + Math.floor(x / 35), 42 + Math.floor(y / 8)]);
    }
  }
  const line = (x0, y0, x1, y1, color) => {
    const dx = Math.abs(x1 - x0); const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0); const sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    while (true) {
      setPixel(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const twice = 2 * error;
      if (twice >= dy) { error += dy; x0 += sx; }
      if (twice <= dx) { error += dx; y0 += sy; }
    }
  };
  for (let i = 0; i < 16; i += 1) {
    line(randomInt(width), randomInt(height), randomInt(width), randomInt(height), [45, 82, 111]);
  }
  for (let i = 0; i < 150; i += 1) {
    setPixel(randomInt(width), randomInt(height), [65, 105, 135]);
  }
  const scale = 6;
  const startX = 29;
  for (let index = 0; index < code.length; index += 1) {
    const glyph = font[code[index]];
    const xOffset = startX + index * 43;
    const yOffset = 24 + randomInt(-4, 5);
    for (let row = 0; row < glyph.length; row += 1) {
      for (let column = 0; column < glyph[row].length; column += 1) {
        if (glyph[row][column] !== '1') continue;
        for (let dy = 0; dy < scale; dy += 1) {
          for (let dx = 0; dx < scale; dx += 1) {
            setPixel(xOffset + column * scale + dx, yOffset + row * scale + dy, [244, 249, 255]);
          }
        }
      }
    }
  }
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0;
    pixels.copy(raw, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}
function newCode() {
  return Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
}
function challengeKey(guildId, userId) {
  return guildId + ':' + userId;
}
function captchaPayload(challenge) {
  const file = new AttachmentBuilder(captchaPng(challenge.code), { name: 'rheinland-captcha.png' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('verify:enter').setLabel('Code eingeben').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('verify:restart').setLabel('Neuen Code laden').setStyle(ButtonStyle.Secondary),
  );
  return {
    embeds: [brandedEmbed('Sicherheitsprüfung', 'Trage den sechsstelligen Code aus dem Bild ein. Der Code ist fünf Minuten gültig.') .setImage('attachment://rheinland-captcha.png')],
    files: [file],
    components: [row],
    ephemeral: true,
  };
}

function createCaptchaModal() {
  const input = new TextInputBuilder()
    .setCustomId('captcha_code')
    .setLabel('Sechsstelligen Code aus dem Bild eingeben')
    .setStyle(TextInputStyle.Short)
    .setMinLength(6)
    .setMaxLength(6)
    .setRequired(true);
  return new ModalBuilder()
    .setCustomId('verify:captcha')
    .setTitle('Rheinland Netzwerk Verifizierung')
    .addComponents(new ActionRowBuilder().addComponents(input));
}

export default {
  name: 'verify',
  async setup(ctx) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('verify:start').setLabel('Captcha starten').setStyle(ButtonStyle.Primary),
    );
    await sendPanel(ctx, 'verify', 'VERIFY_CHANNEL_ID', {
      embeds: [brandedEmbed(
        env('VERIFY_PANEL_TITLE', 'Willkommen bei Rheinland Netzwerk'),
        env('VERIFY_PANEL_TEXT', 'Starte die Sicherheitsprüfung, gib den Code aus dem Bild ein und erhalte danach Zugriff auf den Server. Bitte lies vorher die Regelwerke.'),
      )],
      components: [row],
    });
  },
  async onInteraction(interaction, ctx) {
    if (!interaction.isButton() && !interaction.isModalSubmit()) return false;

    if (interaction.isButton() && ['verify:start', 'verify:restart'].includes(interaction.customId)) {
      const verifiedRole = env('VERIFIED_ROLE_ID');
      if (!verifiedRole) {
        await interaction.reply({ content: 'Die Verifizierung ist noch nicht vollständig konfiguriert. Bitte informiere das Team.', ephemeral: true });
        return true;
      }
      const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
      if (member?.roles.cache.has(verifiedRole)) {
        await interaction.reply({ content: 'Du bist bereits verifiziert.', ephemeral: true });
        return true;
      }
      const key = challengeKey(interaction.guildId, interaction.user.id);
      const cooldownUntil = cooldowns.get(key) ?? 0;
      if (cooldownUntil > Date.now()) {
        const minutes = Math.ceil((cooldownUntil - Date.now()) / 60000);
        await interaction.reply({ content: 'Zu viele falsche Eingaben. Bitte warte noch ' + minutes + ' Minute(n).', ephemeral: true });
        return true;
      }
      const challenge = { code: newCode(), expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 };
      challenges.set(key, challenge);
      await interaction.reply(captchaPayload(challenge));
      return true;
    }

    if (interaction.isButton() && interaction.customId === 'verify:enter') {
      const key = challengeKey(interaction.guildId, interaction.user.id);
      const challenge = challenges.get(key);
      if (!challenge || challenge.expiresAt < Date.now()) {
        challenges.delete(key);
        await interaction.reply({ content: 'Dein Captcha ist abgelaufen. Starte bitte eine neue Sicherheitsprüfung.', ephemeral: true });
        return true;
      }
      await interaction.showModal(createCaptchaModal());
      return true;
    }

    if (interaction.isModalSubmit() && interaction.customId === 'verify:captcha') {
      const key = challengeKey(interaction.guildId, interaction.user.id);
      const challenge = challenges.get(key);
      if (!challenge || challenge.expiresAt < Date.now()) {
        challenges.delete(key);
        await interaction.reply({ content: 'Dein Captcha ist abgelaufen. Starte bitte eine neue Sicherheitsprüfung.', ephemeral: true });
        return true;
      }
      const answer = interaction.fields.getTextInputValue('captcha_code').trim().toUpperCase();
      if (answer !== challenge.code) {
        challenge.attempts += 1;
        if (challenge.attempts >= 3) {
          challenges.delete(key);
          cooldowns.set(key, Date.now() + 5 * 60 * 1000);
          await interaction.reply({ content: 'Drei falsche Eingaben. Die Verifizierung ist für fünf Minuten gesperrt.', ephemeral: true });
          return true;
        }
        challenge.code = newCode();
        challenge.expiresAt = Date.now() + 5 * 60 * 1000;
        challenges.set(key, challenge);
        await interaction.reply({
          ...captchaPayload(challenge),
          embeds: [brandedEmbed('Code nicht korrekt', 'Der Code war falsch. Versuche es mit dem neuen Bild erneut. Drei Fehlversuche führen zu einer kurzen Sperre.').setImage('attachment://rheinland-captcha.png')],
        });
        return true;
      }

      const verifiedRole = env('VERIFIED_ROLE_ID');
      const unverifiedRole = env('UNVERIFIED_ROLE_ID');
      if (!verifiedRole) {
        await interaction.reply({ content: 'Die Verifizierungsrolle ist nicht konfiguriert. Bitte informiere das Team.', ephemeral: true });
        return true;
      }
      try {
        const member = await interaction.guild.members.fetch(interaction.user.id);
        await member.roles.add(verifiedRole, 'Rheinland Netzwerk Captcha erfolgreich bestanden');
        if (unverifiedRole) await member.roles.remove(unverifiedRole).catch(() => null);
        challenges.delete(key);
        cooldowns.delete(key);
        await interaction.reply({ content: 'Captcha erfolgreich. Du bist jetzt verifiziert. Willkommen bei Rheinland Netzwerk!', ephemeral: true });
        await sendLog(ctx, 'SERVER_LOG_CHANNEL_ID', 'Mitglied verifiziert', interaction.user.tag + ' (' + interaction.user.id + ') hat das Captcha bestanden.');
      } catch (error) {
        await interaction.reply({ content: 'Die Verifizierungsrolle konnte nicht vergeben werden. Bitte informiere das Team.', ephemeral: true });
        ctx.logger.error('[VERIFY] ' + error.message);
      }
      return true;
    }
    return false;
  },
};
