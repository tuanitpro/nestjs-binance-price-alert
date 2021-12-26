import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { AppService } from './app.service';
import { PriceBotJobService } from './price-bot.service';
import { NotificationProcessor } from './notification.processor';
import configuration from './configuration';
import { BotService } from './bot.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      load: [configuration],
    }),
    // AuthModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        options: {
          redis: {
            host: configService.get<string>('redis.host'),
            port: configService.get<number>('redis.port'),
            password: configService.get<string>('redis.password'),
          },
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'price-alert-job',
    }),
  ],
  controllers: [],
  providers: [
    ConfigService,
    AppService,
    PriceBotJobService,
    NotificationProcessor,
    BotService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {}
}
