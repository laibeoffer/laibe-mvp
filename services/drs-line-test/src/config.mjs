const REQUIRED_VARIABLES = [
  'LINE_CHANNEL_SECRET',
  'LINE_CHANNEL_ACCESS_TOKEN',
];

function parsePort(value) {
  if (value === undefined || value === '') return 8080;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('Invalid PORT');
  }
  return port;
}

export function parseConfig(env = process.env) {
  for (const name of REQUIRED_VARIABLES) {
    if (typeof env[name] !== 'string' || env[name].length === 0) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  }

  return Object.freeze({
    port: parsePort(env.PORT),
    lineChannelSecret: env.LINE_CHANNEL_SECRET,
    lineChannelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
    nodeEnv: env.NODE_ENV ?? 'development',
  });
}
