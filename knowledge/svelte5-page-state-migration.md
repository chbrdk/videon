# Svelte 5 / SvelteKit: $app/state Migration

## Problem
Nach dem Upgrade auf Svelte 5 trat der Fehler auf:
```
TypeError: Cannot read properties of null (reading 'r')
```
Der Fehler trat auf der `/videos/` Route auf. Das `'r'` ist ein minifizierter Property-Name (z.B. `route` oder `params`).

## Ursache
- Der `page` Store aus `$app/stores` kann während der Hydration oder bei Svelte 5 Runes `null` sein
- SvelteKit 2.12+ empfiehlt `$app/state` statt `$app/stores` für Svelte 5

## Lösung: Migration auf $app/state

### Geänderte Dateien

1. **+layout.svelte**
   - `import { page } from '$app/stores'` → `import { page } from '$app/state'`
   - `page` ist jetzt ein reaktives Objekt (kein Store), daher kein `$page` mehr
   - Zugriff: `page?.url?.pathname`, `page?.params`

2. **MsqdxAdminLayout.svelte**
   - `import { page } from '$app/state'`
   - `$page?.url?.pathname` → `page?.url?.pathname`

3. **MsqdxAdminNav.svelte**
   - `import { page } from '$app/state'`
   - `$page?.url?.pathname` → `page?.url?.pathname`

4. **videos/[id]/+page.svelte**
   - `import { page } from '$app/state'`
   - `$: videoId = $page.params.id` → `let videoId = $derived(page?.params?.id ?? '')`
   - `$page.params.id` → `page?.params?.id` (überall)
   - `$: if ($videoScenes...)` → `$effect(() => { ... })`

5. **projects/[id]/+page.svelte**
   - Bleibt bei `$app/stores` (keine Runes-Konvertierung nötig)
   - `$: projectId = $page?.params?.id ?? ''` (mit optional chaining)

6. **test-setup.ts**
   - Mock für `$app/state` hinzugefügt (für Vitest)

## Wichtige Unterschiede

| $app/stores | $app/state |
|-------------|------------|
| Store, Zugriff mit `$page` | Reaktives Objekt, Zugriff mit `page` |
| Kann null sein bei Hydration | Stabiler bei Svelte 5 |
| Legacy | Empfohlen für Svelte 5 |

## Zusätzliche Null-Guards (r-Fehler)

Da der Fehler "Cannot read properties of null (reading 'r')" weiterhin auftrat, wurden zusätzliche defensive Null-Checks ergänzt:

### videos/+page.svelte
- `$searchQuery ?? ''`, `$searchResults ?? {}`, `$folders ?? []`, `$videosInFolder ?? []`
- `$selectedItems ?? new Set()` für alle .size und .has() Zugriffe
- `$currentFolder != null` statt `$currentFolder`
- `$viewMode ?? 'grid'`, `$currentLocale ?? 'de'`, `$theme ?? 'dark'`
- `base ?? ''` in goto()-Aufrufen

### Kind-Komponenten
- **MsqdxViewToggle**: `$viewMode ?? 'grid'`
- **MsqdxSearchBar**: `($searchQuery ?? '').trim()`
- **MsqdxBreadcrumbs**: `$breadcrumbs ?? []`, `$currentLocale ?? 'de'`

### Debug-Build
- `VITE_DEBUG_BUILD=1 pnpm run build` deaktiviert Minify, um den echten Property-Namen im Fehler zu sehen

## Referenz
- [SvelteKit $app/state Docs](https://svelte.dev/docs/kit/$app-state)
- [Svelte Issue #13991](https://github.com/sveltejs/svelte/issues/13991) - writable stores null in production
- Änderungen: 2025-01-31
