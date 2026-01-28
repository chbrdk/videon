# VIDEON Branding Guide

## 🎨 Brand Identity

**VIDEON** ist eine moderne Video-Analyse- und Bearbeitungsplattform.

## 📝 Brand Name

- **Primary**: VIDEON
- **Case**: UPPERCASE
- **Usage**: Immer in Großbuchstaben schreiben

## 🎨 Design System

VIDEON nutzt das **MSQDX Design System** für konsistentes Branding:

### Brand Colors

- **Purple**: `#b638ff` (Primary Accent)
- **Yellow**: `#fef14d`
- **Pink**: `#f256b6`
- **Orange**: `#ff6a3b`
- **Blue**: `#3b82f6`
- **Green**: `#00ca55`

### Typography

- **Primary Font**: "Noto Sans JP", sans-serif
- **Mono Font**: "JetBrains Mono", monospace

## 🖼️ Logo

Das VIDEON Logo wird als Text-Logo dargestellt:

```svelte
<span class="font-semibold text-gray-900 dark:text-white"
      style="letter-spacing: -0.15em; font-size: 4.25rem;">
  VIDEON
</span>
```

## 📱 UI-Komponenten

Alle UI-Komponenten verwenden das `msqdx-*` Präfix:

- `msqdx-video-card`
- `msqdx-folder-card`
- `msqdx-upload`
- `msqdx-progress`
- etc.

## 🎯 Brand Voice

- **Professionell**: Klare, präzise Kommunikation
- **Modern**: Nutzung aktueller Technologien
- **Benutzerfreundlich**: Intuitive Bedienung im Fokus

## 📄 Verwendung

### Korrekt ✅

- "VIDEON Video Analysis Dashboard"
- "VIDEON API"
- "VIDEON Backend"
- "Powered by VIDEON"

### Falsch ❌

- "Videon" (nicht korrekte Groß-/Kleinschreibung)
- "PrismVid" (alte Brand)
- "prismvid" (alte Brand)

## 🔗 Links

- [MSQDX Design System](./packages/msqdx-design-system/README.md)
- [Design Tokens](./packages/frontend/src/lib/design-tokens.ts)
