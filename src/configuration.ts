export default () => ({
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT),
    password: process.env.REDIS_PASSWORD,
    prefixKey: process.env.REDIS_PREFIX || 'BOT_APP',
  },
  telegram: {
    token: process.env.TELEGRAM_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
  binance: {
    apiKey: process.env.BINANCE_APIKEY,
    apiSecret: process.env.BINANCE_APISECRET,
  },
});
