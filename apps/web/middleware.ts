import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n";

export default createMiddleware(routing, {
  // Deshabilitar detección automática del idioma del navegador
  // Esto previene que el idioma cambie basado en el header Accept-Language
  localeDetection: false,
});

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
