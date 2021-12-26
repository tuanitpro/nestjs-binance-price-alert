import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const TelegramBot = require('node-telegram-bot-api');
const Binance = require('node-binance-api');

@Injectable()
export class BotService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BotService.name);

  constructor(private readonly configService: ConfigService) {}

  onApplicationBootstrap() {
    this.logger.debug('OnApplicationBootstrap - BotService');
    const binance = new Binance().options({
      APIKEY: this.configService.get<string>('binance.apiKey'),
      APISECRET: this.configService.get<string>('binance.apiSecret'),
    });
    const token = this.configService.get<string>('telegram.token');
    const bot = new TelegramBot(token, { polling: true });
    bot.onText(/\/start/, (msg, match) => {
      const chatId = msg.chat.id;

      bot.sendMessage(chatId, 'Hello Tuan');
    });

    bot.onText(/\/price (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const resp = match[1];
      const symbol = resp.toUpperCase();
      let ticker = await binance.prices();

      let response = '';
      switch (symbol) {
        case 'BTC':
          response = `Price of ${symbol}: ${ticker.BTCUSDT}`;
          bot.sendMessage(chatId, response);
          break;
        case 'BNB':
          response = `Price of ${symbol}: ${ticker.BNBUSDT}`;
          bot.sendMessage(chatId, response);
          break;
        case 'OMG':
          response = `Price of ${symbol}: ${ticker.OMGUSDT}`;
          bot.sendMessage(chatId, response);
          break;
        case '24H':
          await binance.prevDay('BNBBTC', (error, prevDay, symbol) => {
            console.info(symbol + ' previous day:', prevDay);
            response =
              'BNB change since yesterday: ' + prevDay.priceChangePercent + '%';
            bot.sendMessage(chatId, response);
          });
          break;
      }
    });
  }
}
