import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContext {
  userId: string;
  email?: string;
  requestId?: string;
  timestamp: Date;
  /** Almacén genérico para set/get compatible con código que usa nestjs-cls */
  data?: Record<string, unknown>;
}

@Injectable()
export class ClsService {
  private readonly als = new AsyncLocalStorage<RequestContext>();

  run<T>(context: RequestContext, callback: () => T): T {
    return this.als.run(context, callback);
  }

  getContext(): RequestContext | undefined {
    return this.als.getStore();
  }

  getUserId(): string | undefined {
    return this.getContext()?.userId;
  }

  getDebugInfo(): string {
    const context = this.getContext();
    return context ? `✅ User: ${context.userId}` : '❌ No hay contexto activo';
  }

  /** Compatible con uso tipo nestjs-cls (p. ej. JwtStrategy / AuthClsMiddleware). */
  set(key: string, value: unknown): void {
    const ctx = this.getContext();
    if (ctx) {
      if (!ctx.data) ctx.data = {};
      ctx.data[key] = value;
    }
  }

  /** Compatible con uso tipo nestjs-cls. */
  get<T = unknown>(key: string): T | undefined {
    return this.getContext()?.data?.[key] as T | undefined;
  }
}