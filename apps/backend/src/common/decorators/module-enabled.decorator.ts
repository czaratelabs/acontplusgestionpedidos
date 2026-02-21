import { applyDecorators, SetMetadata } from '@nestjs/common';
import { MODULE_ENABLED_KEY, MODULE_ENABLED_MSG_KEY } from '../guards/module-enabled.guard';

export const ModuleEnabled = (moduleKey: string, message?: string) =>
  applyDecorators(
    SetMetadata(MODULE_ENABLED_KEY, moduleKey),
    ...(message ? [SetMetadata(MODULE_ENABLED_MSG_KEY, message)] : []),
  );
