import type { Meta, StoryObj } from '@storybook/sveltekit';
import { defaultTheme, lightTheme, darkTheme } from '$lib/design-tokens';
import ColorSwatch from './components/ColorSwatch.svelte';
import TokenTable from './components/TokenTable.svelte';

const meta: Meta = {
  title: 'Foundation/Design Tokens',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Design tokens are the foundational design values used throughout the design system. They define colors, spacing, typography, shadows, and more.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Colors: Story = {
  render: () => ({
    Component: ColorSwatch,
    props: {
      colors: defaultTheme.colors
    }
  })
};

export const Typography: Story = {
  render: () => ({
    Component: TokenTable,
    props: {
      title: 'Typography Tokens',
      tokens: {
        'Font Sizes': defaultTheme.typography.fontSize,
        'Font Weights': defaultTheme.typography.fontWeight,
        'Line Heights': defaultTheme.typography.lineHeight
      }
    }
  })
};

export const Spacing: Story = {
  render: () => ({
    Component: TokenTable,
    props: {
      title: 'Spacing Tokens',
      tokens: defaultTheme.spacing
    }
  })
};

export const BorderRadius: Story = {
  render: () => ({
    Component: TokenTable,
    props: {
      title: 'Border Radius Tokens',
      tokens: defaultTheme.borderRadius
    }
  })
};

export const Shadows: Story = {
  render: () => ({
    Component: TokenTable,
    props: {
      title: 'Shadow Tokens',
      tokens: defaultTheme.shadows
    }
  })
};

export const Glassmorphism: Story = {
  render: () => ({
    Component: TokenTable,
    props: {
      title: 'Glassmorphism Tokens',
      tokens: {
        'Backdrop Blur': defaultTheme.glassmorphism.backdropBlur,
        'Dark Theme Opacity': defaultTheme.glassmorphism.opacity.dark,
        'Border Width': defaultTheme.glassmorphism.borderWidth
      }
    }
  })
};

export const ThemeComparison: Story = {
  render: () => ({
    Component: TokenTable,
    props: {
      title: 'Light vs Dark Theme',
      tokens: {
        'Light Theme Background': lightTheme.glassmorphism.opacity.light.background,
        'Dark Theme Background': darkTheme.glassmorphism.opacity.dark.background
      }
    }
  })
};

