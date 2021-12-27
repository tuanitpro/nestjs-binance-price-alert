import { Injectable, UseInterceptors } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SentryInterceptor } from './interceptors/sentry.interceptor';

@UseInterceptors(SentryInterceptor)
@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}
  onModuleInit() {
    console.log(`The module has been initialized.`);
  }

  getHello(): string {
    return 'Hello! Today: ' + new Date().toJSON();
  }
}
