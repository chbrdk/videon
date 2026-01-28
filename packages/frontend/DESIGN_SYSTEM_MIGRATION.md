# MSQDX Design System Migration für VIDEON

## Übersicht

Dieses Dokument beschreibt die Migration des VIDEON Frontends zur Verwendung des MSQDX Design Systems, um Konsistenz mit ECHON, UNION und anderen MSQDX-Produkten zu gewährleisten.

## Problem

VIDEON nutzte bisher:
- Eigene CSS-Klassen (`glass-card-no-padding`, `chip`, etc.)
- Nicht konsistente Styles im Vergleich zu ECHON/UNION
- Design System hatte nur React-Komponenten, keine Svelte-Komponenten

## Lösung

Erstellung von Svelte-Äquivalenten der React Design-System-Komponenten:

### Neue Komponenten

1. **MsqdxGlassCard.svelte** (`src/lib/components/ui/MsqdxGlassCard.svelte`)
   - Äquivalent zu `MsqdxGlassCard.tsx` aus ECHON
   - Unterstützt: `blur`, `opacity`, `hoverable`, `noPadding`, `accent`, `borderRadiusVariant`
   - Responsive Border Radius (xxl auf Mobile, lg auf Desktop)
   - Responsive Padding (md auf Mobile, lg auf Desktop)

2. **MsqdxButton.svelte** (`src/lib/components/ui/MsqdxButton.svelte`)
   - Äquivalent zu `MsqdxButton.tsx` aus ECHON
   - Unterstützt: `variant`, `glass`, `loading`, `disabled`
   - Pill-Shape (border-radius: 999px)
   - Glassmorphism-Support

3. **MsqdxChip.svelte** (`src/lib/components/ui/MsqdxChip.svelte`)
   - Äquivalent zu `MsqdxChip.tsx` aus ECHON
   - Unterstützt: `variant` (glass/filled/outlined), `color`, `glow`
   - Icon-Support

4. **MsqdxBadge.svelte** (`src/lib/components/ui/MsqdxBadge.svelte`)
   - Äquivalent zu `MsqdxBadge.tsx` aus ECHON
   - Unterstützt: `label`, `sublabel`, `color`, `size`

### Migrierte Komponenten

1. ✅ **msqdx-video-card.svelte**
   - Verwendet jetzt `MsqdxGlassCard` statt `glass-card-no-padding`
   - Verwendet `MsqdxChip` für Status-Badges und Info-Chips
   - Entfernte alte CSS-Klassen

2. ✅ **msqdx-folder-card.svelte**
   - Verwendet jetzt `MsqdxGlassCard` statt `glass-card`
   - Behält spezifische Folder-Card-Styles für Icon und Content

3. ✅ **msqdx-upload.svelte**
   - Verwendet jetzt `MsqdxGlassCard` statt `glass-card`
   - Verwendet `MsqdxProgress` für Upload-Fortschritt
   - Verwendet `MsqdxChip` für Fehlermeldungen

4. ✅ **msqdx-progress.svelte**
   - Nutzt jetzt MSQDX Design Tokens für Farben
   - Theme-Support (Light/Dark)
   - Konsistente Farben basierend auf MSQDX_COLORS

5. ✅ **msqdx-search-bar.svelte**
   - Nutzt MSQDX_SPACING für Border Radius
   - Konsistente Glass-Styles

6. ✅ **msqdx-breadcrumbs.svelte**
   - Nutzt MSQDX_SPACING für Border Radius
   - Konsistente Glass-Styles

7. ✅ **msqdx-delete-modal.svelte**
   - Verwendet `MsqdxGlassCard` für Modal-Container
   - Verwendet `MsqdxButton` für Actions
   - Konsistente Styling

8. ✅ **msqdx-context-menu.svelte**
   - Verwendet `MsqdxGlassCard` statt `glass-card`
   - Konsistente Glass-Styles

## Verwendung

### Import

```svelte
<script>
  import { MsqdxGlassCard, MsqdxButton, MsqdxChip, MsqdxBadge } from '$lib/components/ui';
</script>
```

### Beispiele

#### GlassCard

```svelte
<MsqdxGlassCard hoverable={true} noPadding={false} accent="purple">
  <h2>Card Content</h2>
</MsqdxGlassCard>
```

#### Button

```svelte
<MsqdxButton variant="contained" glass={false} loading={false}>
  Click Me
</MsqdxButton>
```

#### Chip

```svelte
<MsqdxChip variant="glass" color="success">
  <img src={icon} alt="Icon" />
  <span>Status</span>
</MsqdxChip>
```

#### Badge

```svelte
<MsqdxBadge label="42" sublabel="Videos" color="primary" size="medium" />
```

## Design Tokens

Die Komponenten nutzen die Design Tokens aus dem MSQDX Design System:

- `MSQDX_COLORS` - Brand Colors, Tints, Status Colors
- `MSQDX_SPACING` - Border Radius, Spacing Scale
- `MSQDX_EFFECTS` - Glass Effects, Shadows, Transitions
- `MSQDX_TYPOGRAPHY` - Font Families, Sizes, Weights

## Theme Support

Die Komponenten unterstützen automatisch Light/Dark Theme über den `theme` Store:

```svelte
import { theme } from '$lib/stores/theme.store';
```

## Nächste Schritte

### Weitere Komponenten migrieren

- [x] `msqdx-upload.svelte` ✅
- [x] `msqdx-progress.svelte` ✅
- [x] `msqdx-search-bar.svelte` ✅
- [x] `msqdx-breadcrumbs.svelte` ✅
- [x] `msqdx-delete-modal.svelte` ✅
- [x] `msqdx-context-menu.svelte` ✅
- [ ] Weitere Komponenten nach Bedarf

### Testing

- [ ] Unit Tests für neue Komponenten
- [ ] Visual Regression Tests
- [ ] Cross-Browser Testing

### Dokumentation

- [ ] Storybook Stories für neue Komponenten
- [ ] Usage Examples
- [ ] Migration Guide für Entwickler

## Breaking Changes

### Alte CSS-Klassen (deprecated)

Die folgenden CSS-Klassen sollten nicht mehr verwendet werden:

- `glass-card-no-padding` → Verwende `MsqdxGlassCard` mit `noPadding={true}`
- `glass-card` → Verwende `MsqdxGlassCard`
- `chip`, `chip-info`, `chip-warning`, etc. → Verwende `MsqdxChip` mit entsprechendem `color` Prop

### Migration Pattern

**Vorher:**
```svelte
<div class="glass-card-no-padding">
  <div class="chip chip-info">Status</div>
</div>
```

**Nachher:**
```svelte
<MsqdxGlassCard noPadding={true}>
  <MsqdxChip variant="glass" color="info">Status</MsqdxChip>
</MsqdxGlassCard>
```

## Status

✅ **Abgeschlossen:**
- Basis-Komponenten erstellt (MsqdxGlassCard, MsqdxButton, MsqdxChip, MsqdxBadge, MsqdxProgress)
- `msqdx-video-card.svelte` migriert
- `msqdx-folder-card.svelte` migriert
- `msqdx-upload.svelte` migriert
- `msqdx-progress.svelte` migriert
- `msqdx-search-bar.svelte` migriert
- `msqdx-breadcrumbs.svelte` migriert
- `msqdx-delete-modal.svelte` migriert
- `msqdx-context-menu.svelte` migriert

🔄 **In Arbeit:**
- Weitere Komponenten migrieren

📋 **Geplant:**
- Testing
- Dokumentation
- Storybook Stories

## Support

Bei Fragen zur Migration oder Problemen mit den neuen Komponenten, bitte ein Issue erstellen oder das Team kontaktieren.
