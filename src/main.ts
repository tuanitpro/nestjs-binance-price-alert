import { NestFactory } from "@nestjs/core";
import * as Sentry from '@sentry/node'
import { AppModule } from "./app.module";
import { AppService } from "./app.service";

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger:
      process.env.ENV === "production"
        ? ["warn", "error"]
        : ["debug", "log", "verbose"],
  });
  Sentry.init({
    dsn: process.env.SENTRY_DNS,
})
  const appService = appContext.get(AppService);
  console.log(appService.getHello());
}
bootstrap();
