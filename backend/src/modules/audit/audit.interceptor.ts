import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

const ACTION_MAP: Record<string, string> = {
  POST: 'Criou',
  PATCH: 'Atualizou',
  PUT: 'Atualizou',
  DELETE: 'Excluiu',
};

// Módulos que não devem gerar log (ruído / recursão)
const SKIP_MODULES = ['auth', 'audit-logs', 'audit'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;

    // Só audita ações de escrita
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const url: string = req.originalUrl || req.url || '';
    const path = url.split('?')[0];
    // /api/tutors/123 -> segmentos: ['', 'api', 'tutors', '123'] -> 2º segmento útil
    const segments = path.split('/').filter(Boolean); // ['api', 'tutors', '123']
    const module = segments[1] || segments[0] || 'root';

    // Pula módulos ruidosos / recursivos
    if (SKIP_MODULES.includes(module)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const user = req.user;
        const res = context.switchToHttp().getResponse();

        // Fire-and-forget: nunca bloqueia nem derruba a resposta
        this.prisma.auditLog
          .create({
            data: {
              userId: user?.id || null,
              userName: user?.name || user?.email || null,
              method,
              module,
              action: ACTION_MAP[method] || method,
              path,
              entityId: req.params?.id ?? null,
              statusCode: res?.statusCode ?? null,
            },
          })
          .catch(() => {});
      }),
    );
  }
}
