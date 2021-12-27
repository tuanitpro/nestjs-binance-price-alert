import {
  ExecutionContext,
  Injectable,
  NestInterceptor,
  CallHandler,
  Logger,
  RequestTimeoutException,
} from "@nestjs/common";
import { Observable, throwError, TimeoutError } from "rxjs";
import { catchError } from "rxjs/operators";
import * as Sentry from "@sentry/minimal";

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SentryInterceptor.name);
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    this.logger.log("SentryInterceptor...");
    return next.handle().pipe(
      catchError((err) => {
        Sentry.captureException(err);
        if (err instanceof TimeoutError) {
          return throwError(() => new RequestTimeoutException());
        }
        return throwError(() => err);
      })
    );
  }
}
