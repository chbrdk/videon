/**
 * Route-Hilfsfunktionen für Auth und Layout
 * Zentrale Definition öffentlicher Routen (base-aware)
 */

const PUBLIC_ROUTES = ['/login', '/register'] as const;

/**
 * Prüft ob ein Pfad eine öffentliche Route ist (ohne Auth).
 * Base-aware: /videon/login und /login werden beide erkannt.
 */
export function isPathPublic(path: string): boolean {
  if (!path || typeof path !== 'string') return false;
  return PUBLIC_ROUTES.some(
    (r) =>
      path === r ||
      path === `${r}/` ||
      path.endsWith(r) ||
      path.endsWith(`${r}/`)
  );
}
