import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';

@Processor('price-alert-job')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);
  constructor() {}

  @Process('send')
  async handleTranscode(job: Job)  {
    this.logger.debug("Start job...");
    this.logger.log(job.data);
    this.logger.debug('Completed');
  }
}
