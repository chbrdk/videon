import type { Meta, StoryObj } from '@storybook/sveltekit';
import Header from './Header.svelte';
import { fn } from 'storybook/test';

const meta: Meta<Header> = {
  title: 'Example/Header',
  component: Header,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onLogin: fn(),
    onLogout: fn(),
    onCreateAccount: fn(),
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedIn: Story = {
  args: {
    user: { name: 'Jane Doe' }
  }
};

export const LoggedOut: Story = {
  args: {}
};

