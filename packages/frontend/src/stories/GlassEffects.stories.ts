import type { Meta, StoryObj } from '@storybook/sveltekit';
import { defaultTheme } from '$lib/design-tokens';

const meta: Meta = {
  title: 'Foundation/Glass Effects',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Glassmorphism effects showcase demonstrating different backdrop blur levels, opacity variations, and border styles.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const BackdropBlur: Story = {
  render: () => ({
    template: `
      <div class="space-y-4 p-8">
        <div svelte:each={Object.entries(defaultTheme.glassmorphism.backdropBlur)} as [level, value]>
          <div class="glass-card p-4 mb-4" style="backdrop-filter: blur({value});">
            <div class="text-sm font-medium mb-2">Backdrop Blur: {level} ({value})</div>
            <div class="text-xs text-gray-400">This demonstrates the {level} level of backdrop blur effect</div>
          </div>
        </div>
      </div>
    `
  })
};

export const OpacityVariants: Story = {
  render: () => ({
    template: `
      <div class="space-y-4 p-8">
        <div class="glass-card p-4" style="background: {defaultTheme.glassmorphism.opacity.dark.background}; border-color: {defaultTheme.glassmorphism.opacity.dark.border};">
          <div class="text-sm font-medium mb-2">Dark Theme Glass</div>
          <div class="text-xs text-gray-400">Background: {defaultTheme.glassmorphism.opacity.dark.background}</div>
          <div class="text-xs text-gray-400">Border: {defaultTheme.glassmorphism.opacity.dark.border}</div>
        </div>
        <div class="glass-card p-4" style="background: {defaultTheme.glassmorphism.opacity.dark.hover}; border-color: {defaultTheme.glassmorphism.opacity.dark.border};">
          <div class="text-sm font-medium mb-2">Dark Theme Glass (Hover)</div>
          <div class="text-xs text-gray-400">Hover: {defaultTheme.glassmorphism.opacity.dark.hover}</div>
        </div>
      </div>
    `
  })
};

export const BorderWidths: Story = {
  render: () => ({
    template: `
      <div class="space-y-4 p-8">
        <div svelte:each={Object.entries(defaultTheme.glassmorphism.borderWidth)} as [width, value]>
          <div class="glass-card p-4 mb-4" style="border-width: {value};">
            <div class="text-sm font-medium mb-2">Border Width: {width} ({value})</div>
            <div class="text-xs text-gray-400">This demonstrates the {width} border width</div>
          </div>
        </div>
      </div>
    `
  })
};

export const CompleteExample: Story = {
  render: () => ({
    template: `
      <div class="space-y-4 p-8">
        <div class="glass-card p-6" style="background: {defaultTheme.glassmorphism.opacity.dark.background}; backdrop-filter: blur({defaultTheme.glassmorphism.backdropBlur.md}); border: {defaultTheme.glassmorphism.borderWidth.medium} solid {defaultTheme.glassmorphism.opacity.dark.border};">
          <h3 class="text-xl font-semibold mb-2">Complete Glass Effect</h3>
          <p class="text-sm text-gray-400 mb-4">This card demonstrates a complete glassmorphism effect with backdrop blur, opacity, and border.</p>
          <button class="glass-button px-4 py-2">Example Button</button>
        </div>
      </div>
    `
  })
};

