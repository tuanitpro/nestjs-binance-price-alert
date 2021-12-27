import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  UseInterceptors,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SentryInterceptor } from "./interceptors/sentry.interceptor";

import { pricePairs } from "./pricePairs";
const TelegramBot = require("node-telegram-bot-api");
const Binance = require("node-binance-api");

@UseInterceptors(SentryInterceptor)
@Injectable()
export class BotService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BotService.name);

  private token: string = "";
  private bot;
  constructor(private readonly configService: ConfigService) {
    this.token = this.configService.get<string>("telegram.token");
    this.bot = new TelegramBot(this.token, { polling: true });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron() {
    const chatId = this.configService.get<string>("telegram.chatId");
    const binance = new Binance().options({
      APIKEY: this.configService.get<string>("binance.apiKey"),
      APISECRET: this.configService.get<string>("binance.apiSecret"),
    });
    const prevDays = await binance.prevDay(false);
    await binance.balance((error, balances) => {
      if (error) return this.logger.error(error);
      let response: string = "";
      pricePairs.forEach((item) => {
        if (balances[item].available > 0.0) {
          const findPrevDay = prevDays.find((x) => x.symbol === item + "USDT");
          if (findPrevDay) {
            if (
              findPrevDay.priceChangePercent >= 10.0 ||
              findPrevDay.priceChangePercent <= -4.999
            ) {
              response += `${item} has change to ${findPrevDay.lastPrice} ${findPrevDay.priceChangePercent} %`;
            }
          }
        }
      });
      if (response) {
        this.bot.sendMessage(chatId, response);
      }
    });
  }

  onApplicationBootstrap() {
    this.logger.debug("OnApplicationBootstrap - BotService");
    const binance = new Binance().options({
      APIKEY: this.configService.get<string>("binance.apiKey"),
      APISECRET: this.configService.get<string>("binance.apiSecret"),
    });

    this.bot.onText(/\/start/, (msg, match) => {
      const chatId = msg.chat.id;

      this.bot.sendMessage(chatId, "Hello Tuan");
    });
    this.bot.onText(/\/balance/, async (msg, match) => {
      await binance.balance((error, balances) => {
        if (error) return this.logger.error(error);
        let response: string = "Balance:";
        pricePairs.forEach((item) => {
          if (balances[item].available > 0.0) {
            response += `\n${item}: ${balances[item].available}`;
          }
        });
        const chatId = msg.chat.id;
        this.bot.sendMessage(chatId, response);
      });
    });
    this.bot.onText(/\/price (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const resp = match[1];
      const symbol = resp.toUpperCase();
      const ticker = await binance.prices();
      const prevDays = await binance.prevDay(false);
      let response = "";
      switch (symbol) {
        case "BTC":
        case "USDT":
          const findPrevDay = prevDays.find((x) => x.symbol === "BTCUSDT");

          response = `${symbol}_USDT: ${ticker.BTCUSDT}`;
          response += "\n" + this.getResponsePrevDay("", findPrevDay);
          this.bot.sendMessage(chatId, response);
          break;
        case "BNB":
          response = `${symbol}_USDT: ${ticker.BNBUSDT}`;
          response += `\n${symbol}_BTC: ${ticker.BNBBTC}`;
          this.bot.sendMessage(chatId, response);
          break;
        case "24H":
          await binance.prevDay("BTCUSDT", (error, prevDay, symbol) => {
            if (error) return this.logger.error(error);
            response = this.getResponsePrevDay("BTCUSDT", prevDay);
            this.bot.sendMessage(chatId, response);
          });
          break;
        default:
          const getSymbol = pricePairs.find((item) => item === symbol);
          if (getSymbol) {
            const getTickerUSDT = symbol + "USDT";
            const getTickerBTC = symbol + "BTC";
            const getTickerBNB = symbol + "BNB";
            if (ticker[getTickerUSDT]) {
              response = ` ${symbol}_USDT: ${ticker[getTickerUSDT]}`;
              const findPrevDay = prevDays.find(
                (x) => x.symbol === getTickerUSDT
              );
              response += "\n" + this.getResponsePrevDay("", findPrevDay);
            }
            if (ticker[getTickerBTC]) {
              response += `\n${symbol}_BTC: ${ticker[getTickerBTC]}`;
              const findPrevDay = prevDays.find(
                (x) => x.symbol === getTickerBTC
              );
              response += "\n" + this.getResponsePrevDay("", findPrevDay);
            }
            if (ticker[getTickerBNB]) {
              response += `\n${symbol}_BNB: ${ticker[getTickerBNB]}`;
              const findPrevDay = prevDays.find(
                (x) => x.symbol === getTickerBNB
              );
              if (findPrevDay.lastPrice > 0.0) {
                response += "\n" + this.getResponsePrevDay("", findPrevDay);
              }
            }
            this.bot.sendMessage(chatId, response);
          } else {
            this.bot.sendMessage(chatId, symbol + " not found");
          }

          break;
      }
    });
  }

  private getResponsePrevDay(symbol: string, prevDay: any): string {
    return `Last: ${prevDay.lastPrice} \nHigh: ${prevDay.highPrice}\nLow: ${prevDay.lowPrice}\nChange: ${prevDay.priceChange}\nPercent: ${prevDay.priceChangePercent} %\n`;
  }
}
