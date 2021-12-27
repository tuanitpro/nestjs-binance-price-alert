import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { AppService } from "./app.service";

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger:
      process.env.ENV === "production"
        ? ["warn", "error"]
        : ["debug", "log", "verbose"],
  });
  const appService = appContext.get(AppService);
  console.log(appService.getHello());
}
bootstrap();
