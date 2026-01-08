# Storybook Stories

This directory contains all Storybook stories for the PrismVid Design System.

## Structure

```
stories/
├── Introduction.stories.mdx          # Design system introduction
├── DesignTokens.stories.ts           # Design tokens showcase
├── Colors.stories.ts                 # Color palette
├── Typography.stories.ts             # Typography system
├── GlassEffects.stories.ts           # Glassmorphism examples
├── Chips.stories.ts                  # Chip/Badge components
├── components/                       # Helper components for stories
│   ├── ColorSwatch.svelte
│   └── TokenTable.svelte
└── assets/                           # Storybook assets
```

## Component Stories

Component stories are co-located with their components in `src/lib/components/`:

- `udg-glass-video-card.stories.ts` - Video card component
- `udg-glass-folder-card.stories.ts` - Folder card component
- More component stories will be added as the design system evolves

## Running Storybook

```bash
npm run storybook
```

Storybook will be available at `http://localhost:6006`

## Building Storybook

```bash
npm run build-storybook
```

The built Storybook will be in the `storybook-static` directory.

## Story Conventions

1. **File Naming**: Stories should be named `[ComponentName].stories.ts` or `.stories.svelte`
2. **Story Structure**: Each story should include:
   - Default story (basic usage)
   - Variant stories (different states/variations)
   - Interactive examples where applicable
3. **Documentation**: Use `tags: ['autodocs']` to enable auto-generated documentation
4. **Args**: Document all props using `argTypes` with descriptions

## Adding New Stories

1. Create a story file next to your component or in the stories directory
2. Import the component and necessary types
3. Define meta with title, component, and tags
4. Export default meta
5. Create story objects with different variations

Example:

```typescript
import type { Meta, StoryObj } from '@storybook/svelte';
import MyComponent from './MyComponent.svelte';

const meta: Meta<MyComponent> = {
  title: 'Components/MyComponent',
  component: MyComponent,
  tags: ['autodocs'],
  argTypes: {
    // Define your props here
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    // Default props
  }
};
```

