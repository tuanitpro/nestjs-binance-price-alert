import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { pricePairs } from './pricePairs';
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
    bot.onText(/\/balance/, async (msg, match) => {
      await binance.balance((error, balances) => {
        if (error) return console.error(error);
        let response: string = '';
        pricePairs.forEach((item) => {
          if (balances[item].available > 0.0) {
            response += '\n' + item + ' balance: ' + balances[item].available;
          }
        });
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, response);
      });
    });
    bot.onText(/\/price (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const resp = match[1];
      const symbol = resp.toUpperCase();
      let ticker = await binance.prices();
      let response = '';
      switch (symbol) {
        case 'BTC':
        case 'USDT':
          response = `${symbol}_USDT: ${ticker.BTCUSDT}`;
          bot.sendMessage(chatId, response);
          break;
        case 'BNB':
          response = `${symbol}_USDT: ${ticker.BNBUSDT}`;
          response += `\n${symbol}_BTC: ${ticker.BNBBTC}`;
          bot.sendMessage(chatId, response);
          break;
        case '24H':
          await binance.prevDay('BTCUSDT', (error, prevDay, symbol) => {
            console.info(symbol + ' previous day:', prevDay);
            response = `BTC change since yesterday: 
            Last: ${prevDay.lastPrice}  
            High: ${prevDay.highPrice}
            Low : ${prevDay.lowPrice}
            ${prevDay.priceChangePercent} %`;
            bot.sendMessage(chatId, response);
          });
          break;
        default:
          const getSymbol = pricePairs.find((item) => item === symbol);
          if (getSymbol) {
            const getTickerUSDT = symbol + 'USDT';
            const getTickerBTC = symbol + 'BTC';
            const getTickerBNB = symbol + 'BNB';
            if (ticker[getTickerUSDT]) {
              response = ` ${symbol}_USDT: ${ticker[getTickerUSDT]}`;
            }
            if (ticker[getTickerBTC]) {
              response += `\n${symbol}_BTC: ${ticker[getTickerBTC]}`;
            }
            if (ticker[getTickerBNB]) {
              response += `\n${symbol}_BNB: ${ticker[getTickerBNB]}`;
            }
            bot.sendMessage(chatId, response);
          } else {
            bot.sendMessage(chatId, symbol + ' not found');
          }

          break;
      }
    });
  }
}
