import type { Meta, StoryObj } from '@storybook/sveltekit';
import { defaultTheme } from '$lib/design-tokens';

const meta: Meta = {
  title: 'Foundation/Colors',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Color palette used throughout the design system. Colors are organized by semantic meaning and include full scales from 50-900.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  render: () => ({
    template: `
      <div class="grid grid-cols-10 gap-2 p-4">
        <div svelte:each={Object.entries(defaultTheme.colors.primary)} as [key, value]>
          <div class="space-y-1">
            <div class="h-16 rounded-lg border border-white/20" style="background-color: {value};"></div>
            <div class="text-xs text-center text-gray-400">{key}</div>
          </div>
        </div>
      </div>
    `
  })
};

export const SemanticColors: Story = {
  render: () => ({
    template: `
      <div class="space-y-6 p-4">
        <div svelte:each={Object.entries(defaultTheme.colors)} as [name, scale]>
          <h3 class="text-lg font-semibold mb-2 capitalize">{name}</h3>
          <div class="grid grid-cols-10 gap-2">
            <div svelte:each={Object.entries(scale)} as [key, value]>
              <div class="space-y-1">
                <div class="h-16 rounded-lg border border-white/20" style="background-color: {value};"></div>
                <div class="text-xs text-center text-gray-400">{key}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  })
};

