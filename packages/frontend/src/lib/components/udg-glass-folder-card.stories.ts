import type { Meta, StoryObj } from '@storybook/svelte-vite';
import UdgGlassFolderCard from './udg-glass-folder-card.svelte';

interface Folder {
  id: string;
  name: string;
  videoCount?: number;
  parentId?: string | null;
}

const meta: Meta<UdgGlassFolderCard> = {
  title: 'Components/Cards/FolderCard',
  component: UdgGlassFolderCard,
  tags: ['autodocs'],
  argTypes: {
    folder: {
      control: 'object',
      description: 'Folder object containing folder metadata'
    },
    onselect: {
      action: 'select',
      description: 'Event fired when folder card is clicked'
    }
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Folder card component with glassmorphism styling. Displays folder name and video count.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockFolder: Folder = {
  id: 'folder-1',
  name: 'My Videos',
  videoCount: 12,
  parentId: null
};

export const Default: Story = {
  args: {
    folder: mockFolder
  }
};

export const EmptyFolder: Story = {
  args: {
    folder: {
      ...mockFolder,
      videoCount: 0
    }
  }
};

export const LongName: Story = {
  args: {
    folder: {
      ...mockFolder,
      name: 'This is a very long folder name that should be truncated properly'
    }
  }
};

export const ManyVideos: Story = {
  args: {
    folder: {
      ...mockFolder,
      videoCount: 999
    }
  }
};

