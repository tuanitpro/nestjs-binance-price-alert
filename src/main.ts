import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppService } from './app.service';
 
async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const appService = appContext.get(AppService);
  console.log(appService.getHello());
}
bootstrap();
