# Build Fixes für Svelte 5 Runes Mode

## Problem

Die Komponenten verwendeten Svelte 4 Syntax, aber das Projekt nutzt Svelte 5 im Runes Mode.

## Gelöste Probleme

### 1. `export let` → `$props()`

**Vorher (Svelte 4):**
```svelte
export let progress: number = 0;
export let label: string = 'Lädt...';
```

**Nachher (Svelte 5 Runes):**
```svelte
interface Props {
  progress?: number;
  label?: string;
}

let {
  progress = 0,
  label = 'Lädt...'
}: Props = $props();
```

### 2. `$$restProps` → `...rest` in `$props()`

**Vorher:**
```svelte
{...$$restProps}
```

**Nachher:**
```svelte
let {
  ...rest
}: Props = $props();

{...rest}
```

### 3. CSS JavaScript-Ausdrücke

**Vorher:**
```css
font-weight: {MSQDX_TYPOGRAPHY.fontWeight.semibold};
```

**Nachher:**
```css
font-weight: 600; /* MSQDX_TYPOGRAPHY.fontWeight.semibold */
```

Oder mit CSS-Klassen:
```svelte
class:filled={variant === 'filled'}
```

```css
.msqdx-chip.filled {
  font-weight: 600;
}
```

### 4. Import-Pfade korrigiert

Von `packages/frontend/src/lib/components/ui/`:
- Korrekt: `../../../../../msqdx-design-system/packages/design-system/src/tokens`

Von `packages/frontend/src/lib/components/`:
- Korrekt: `../../../../msqdx-design-system/packages/design-system/src/tokens`

### 5. `class:selected` auf Komponenten

**Vorher:**
```svelte
<MsqdxGlassCard class:selected>
```

**Nachher:**
```svelte
<MsqdxGlassCard class="{selected ? 'selected' : ''}">
```

### 6. `draggable` auf Komponenten

**Vorher:**
```svelte
<MsqdxGlassCard draggable="true">
```

**Nachher:**
```svelte
<MsqdxGlassCard>
  <div draggable="true">
```

## Nächste Schritte

1. **Dev-Server neu starten:**
   ```bash
   cd packages/frontend
   npm run dev
   ```

2. **Browser-Cache leeren** (falls nötig)

3. **Prüfen, ob alle Komponenten korrekt angezeigt werden**

## Status

✅ Build erfolgreich
✅ Alle Svelte 5 Runes Mode Syntax-Fehler behoben
✅ Import-Pfade korrigiert
✅ CSS-Syntax korrigiert
