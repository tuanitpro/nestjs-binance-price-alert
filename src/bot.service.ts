import {
  CACHE_MANAGER,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  UseInterceptors,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { SentryInterceptor } from "./interceptors/sentry.interceptor";
import { Cache } from "cache-manager";
import { RSI, MACD, SMA, MovingAverage } from "trading-signals";
import { pricePairs } from "./pricePairs";
const TelegramBot = require("node-telegram-bot-api");
const Binance = require("node-binance-api");

@UseInterceptors(SentryInterceptor)
@Injectable()
export class BotService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BotService.name);

  private token: string = "";
  private bot;
  constructor(
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    this.token = this.configService.get<string>("telegram.token");
    this.bot = new TelegramBot(this.token, { polling: true });
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleCron() {
    const command: string =
      (await this.cacheManager.get("JOB_COMMAND")) || "START";
    if (command === "START") {
      const chatId = this.configService.get<string>("telegram.chatId");
      const binance = new Binance().options({
        APIKEY: this.configService.get<string>("binance.apiKey"),
        APISECRET: this.configService.get<string>("binance.apiSecret"),
      });
      const minPrice: number =
        (await this.cacheManager.get("MIN_PRICE")) || -4.9999;
      const maxPrice: number = (await this.cacheManager.get("MAX_PRICE")) || 10;
      const prevDays = await binance.prevDay(false);
      await binance.balance((error, balances) => {
        if (error) return this.logger.error(error);
        let response: string = "";
        pricePairs.forEach((item) => {
          if (balances[item].available > 0.0) {
            const findPrevDay = prevDays.find(
              (x) => x.symbol === item + "USDT"
            );
            if (findPrevDay) {
              if (
                findPrevDay.priceChangePercent <=
                  Number.parseFloat(minPrice.toString()) ||
                findPrevDay.priceChangePercent >=
                  Number.parseFloat(maxPrice.toString())
              ) {
                response += `${item} has change to ${findPrevDay.lastPrice} ${findPrevDay.priceChangePercent} %\n`;
              }
            }
          }
        });
        if (response) {
          this.bot.sendMessage(chatId, response);
        }
      });
    }
  }

  onApplicationBootstrap() {
    this.logger.debug("OnApplicationBootstrap - BotService");
    const binance = new Binance().options({
      APIKEY: this.configService.get<string>("binance.apiKey"),
      APISECRET: this.configService.get<string>("binance.apiSecret"),
    });

    this.bot.onText(/\/start/, async (msg, match) => {
      const chatId = msg.chat.id;
      await this.cacheManager.set("JOB_COMMAND", "START");
      this.bot.sendMessage(chatId, "Start watching...");
    });
    this.bot.onText(/\/stop/, async (msg, match) => {
      const chatId = msg.chat.id;
      await this.cacheManager.set("JOB_COMMAND", "STOP");
      this.bot.sendMessage(chatId, "Stop watching...");
    });
    this.bot.onText(/\/watch (.+) (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      await this.cacheManager.set("MIN_PRICE", Number.parseFloat(match[1]));
      await this.cacheManager.set("MAX_PRICE", Number.parseFloat(match[2]));
      this.bot.sendMessage(
        chatId,
        `Watching... MIN_PRICE: ${match[1]} MAX_PRICE: ${match[2]}`
      );
    });
    this.bot.onText(/\/rsi (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const timing: string = match[1];
      binance.candlesticks(
        "LTCUSDT",
        timing,
        (error, ticks, symbol) => {
          if (error) return this.logger.error(error);
          const rsi = new RSI(6);
          ticks.forEach((element) => {
            let [
              time,
              open,
              high,
              low,
              close,
              volume,
              closeTime,
              assetVolume,
              trades,
              buyBaseVolume,
              buyAssetVolume,
              ignored,
            ] = element;
            rsi.update(open);
            rsi.update(close);
          });

          this.bot.sendMessage(
            chatId,
            `RSI ${timing.toUpperCase()} ${rsi.getResult().valueOf().toString()}`
          );
        },
        { limit: 500, endTime: new Date().getTime() }
      );
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
