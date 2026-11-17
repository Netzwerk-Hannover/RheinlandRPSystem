const stamp = () => new Date().toISOString();
const write = (level, message) => console[level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log'](`[${stamp()}] [${level}] ${message}`);

export const logger = {
  info: (message) => write('INFO', message),
  warn: (message) => write('WARN', message),
  error: (message) => write('ERROR', message),
};
