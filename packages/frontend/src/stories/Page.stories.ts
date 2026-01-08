import type { Meta, StoryObj } from '@storybook/sveltekit';
import { expect, userEvent, waitFor, within } from 'storybook/test';
import Page from './Page.svelte';

const meta: Meta<Page> = {
  title: 'Example/Page',
  component: Page,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedIn: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const loginButton = canvas.getByRole('button', { name: /Log in/i });
    await expect(loginButton).toBeInTheDocument();
    await userEvent.click(loginButton);
    await waitFor(() => expect(loginButton).not.toBeInTheDocument());

    const logoutButton = canvas.getByRole('button', { name: /Log out/i });
    await expect(logoutButton).toBeInTheDocument();
  }
};

export const LoggedOut: Story = {};

