import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';

@Injectable()
export class PriceBotJobService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PriceBotJobService.name);

  constructor(
    @InjectQueue('price-alert-job') private readonly notificationQueue: Queue
  ) {}

  onApplicationBootstrap() {
    this.logger.debug('OnApplicationBootstrap - PriceBotJobService');
    this.notificationQueue.add('send', 'Send new price of BTC', {
      removeOnComplete: false,
      delay: 1000,
      repeat: {
        cron: CronExpression.EVERY_MINUTE,
      },
    });
  }
}
