import type { Meta, StoryObj } from '@storybook/sveltekit';
import ChipsShowcase from './components/ChipsShowcase.svelte';

const meta: Meta<ChipsShowcase> = {
  title: 'Foundation/Chips',
  component: ChipsShowcase,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Chip/Badge components used throughout the application for displaying status, tags, and metadata. Available in multiple variants: default, primary, success, warning, error, and info.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllVariants: Story = {
  args: {
    variant: 'all'
  }
};

export const WithIcons: Story = {
  args: {
    variant: 'icons'
  }
};

export const UsageExamples: Story = {
  args: {
    variant: 'usage'
  }
};

