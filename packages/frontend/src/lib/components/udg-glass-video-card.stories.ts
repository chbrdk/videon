import type { Meta, StoryObj } from '@storybook/sveltekit';
import UdgGlassVideoCard from './udg-glass-video-card.svelte';
import { fn } from 'storybook/test';

// Video type matching the component's expected interface
interface Video {
  id: string;
  originalName: string;
  duration?: number;
  fileSize: number;
  status: 'UPLOADED' | 'ANALYZING' | 'ANALYZED' | 'ERROR';
  createdAt: string;
  updatedAt: string;
  folderId: string | null;
  projectId: string | null;
}

const meta: Meta<UdgGlassVideoCard> = {
  title: 'Components/Cards/VideoCard',
  component: UdgGlassVideoCard,
  tags: ['autodocs'],
  argTypes: {
    video: {
      control: 'object',
      description: 'Video object containing video metadata'
    },
    onselect: {
      action: 'select',
      description: 'Event fired when video card is clicked'
    }
  },
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Video card component with glassmorphism styling. Displays video thumbnail, title, duration, file size, and status.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

const mockVideo: Video = {
  id: 'test-video-1',
  originalName: 'Sample Video.mp4',
  duration: 125,
  fileSize: 15728640,
  status: 'ANALYZED',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  folderId: null,
  projectId: null
};

export const Default: Story = {
  args: {
    video: mockVideo
  }
};

export const Uploaded: Story = {
  args: {
    video: {
      ...mockVideo,
      status: 'UPLOADED'
    }
  }
};

export const Analyzing: Story = {
  args: {
    video: {
      ...mockVideo,
      status: 'ANALYZING'
    }
  }
};

export const Error: Story = {
  args: {
    video: {
      ...mockVideo,
      status: 'ERROR'
    }
  }
};

export const LongTitle: Story = {
  args: {
    video: {
      ...mockVideo,
      originalName: 'This is a very long video title that should be truncated properly in the card component display'
    }
  }
};

export const ShortVideo: Story = {
  args: {
    video: {
      ...mockVideo,
      duration: 5
    }
  }
};

export const LongVideo: Story = {
  args: {
    video: {
      ...mockVideo,
      duration: 3600
    }
  }
};

export const LargeFile: Story = {
  args: {
    video: {
      ...mockVideo,
      fileSize: 1073741824
    }
  }
};

