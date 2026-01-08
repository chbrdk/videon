import type { Meta, StoryObj } from '@storybook/sveltekit';
import { defaultTheme } from '$lib/design-tokens';

const meta: Meta = {
  title: 'Foundation/Typography',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Typography system including font sizes, weights, and line heights used throughout the design system.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const FontSizes: Story = {
  render: () => ({
    template: `
      <div class="space-y-4 p-4">
        <div svelte:each={Object.entries(defaultTheme.typography.fontSize)} as [size, value]>
          <div class="space-y-1">
            <div class="text-xs text-gray-400 font-mono">{size}: {value}</div>
            <div class="border-b border-white/10" style="font-size: {value};">
              The quick brown fox jumps over the lazy dog
            </div>
          </div>
        </div>
      </div>
    `
  })
};

export const FontWeights: Story = {
  render: () => ({
    template: `
      <div class="space-y-4 p-4">
        <div svelte:each={Object.entries(defaultTheme.typography.fontWeight)} as [weight, value]>
          <div class="space-y-1">
            <div class="text-xs text-gray-400 font-mono">{weight}: {value}</div>
            <div class="border-b border-white/10" style="font-weight: {value};">
              The quick brown fox jumps over the lazy dog
            </div>
          </div>
        </div>
      </div>
    `
  })
};

export const LineHeights: Story = {
  render: () => ({
    template: `
      <div class="space-y-4 p-4 max-w-md">
        <div svelte:each={Object.entries(defaultTheme.typography.lineHeight)} as [height, value]>
          <div class="space-y-1">
            <div class="text-xs text-gray-400 font-mono">{height}: {value}</div>
            <div class="border-b border-white/10" style="line-height: {value};">
              The quick brown fox jumps over the lazy dog. This is a longer text to demonstrate how line height affects the readability and spacing of text content.
            </div>
          </div>
        </div>
      </div>
    `
  })
};

