<script lang="ts">
  import { MSQDX_COLORS, MSQDX_EFFECTS, MSQDX_SPACING } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';

  type NotchPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

  interface Props {
    borderRadius?: number;
    notchPosition?: NotchPosition;
    class?: string;
    [key: string]: any;
  }

  let {
    borderRadius = 20,
    notchPosition = 'top-right',
    class: className = '',
    children,
    ...rest
  }: Props & { children?: any } = $props();

  let currentTheme = $derived($theme);

  

  const borderColor = $derived(() => {
    return currentTheme === 'dark' 
      ? 'rgba(255, 255, 255, 0.12)' 
      : 'rgba(0, 0, 0, 0.12)';
  });

  const borderTopColor = $derived(() => {
    return currentTheme === 'dark' 
      ? 'rgba(255, 255, 255, 0.18)' 
      : 'rgba(0, 0, 0, 0.18)';
  });

  const backgroundColor = $derived(() => {
    return currentTheme === 'dark' 
      ? 'rgba(0, 0, 0, 0.05)' 
      : 'rgba(255, 255, 255, 0.05)';
  });
</script>

<div
  class="msqdx-notched-label {className}"
  class:notch-top-right={notchPosition === 'top-right'}
  class:notch-top-left={notchPosition === 'top-left'}
  class:notch-bottom-right={notchPosition === 'bottom-right'}
  class:notch-bottom-left={notchPosition === 'bottom-left'}
  style="
    border-radius: {borderRadius}px;
    background-color: {backgroundColor};
    border-color: {borderColor};
    border-top-color: {borderTopColor};
    --notch-radius: {borderRadius}px;
  "
  {...rest}
>
  {#if children}{@render children()}{/if}
</div>

<style>
  .msqdx-notched-label {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid;
    border-left: 1px solid var(--border-top-color, rgba(255, 255, 255, 0.18));
    padding: 8px 16px;
    color: var(--text-color, rgba(255, 255, 255, 1));
    box-shadow: var(--shadow, none);
  }

  .msqdx-notched-label.notch-top-right::after {
    content: '';
    position: absolute;
    left: 100%;
    top: 0;
    width: var(--notch-radius, 20px);
    height: 100%;
    background-color: var(--notch-bg, rgba(0, 0, 0, 0.05));
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid var(--notch-border, rgba(255, 255, 255, 0.12));
    border-left: none;
    border-top-right-radius: var(--notch-radius, 20px);
    border-bottom-right-radius: var(--notch-radius, 20px);
    box-shadow: var(--shadow, none);
    z-index: 1;
    mask-image: radial-gradient(circle var(--notch-radius, 20px) at 0 50%, transparent var(--notch-radius, 20px), black var(--notch-radius, 20px));
    -webkit-mask-image: radial-gradient(circle var(--notch-radius, 20px) at 0 50%, transparent var(--notch-radius, 20px), black var(--notch-radius, 20px));
  }

  :global(.light) .msqdx-notched-label {
    --text-color: rgba(15, 23, 42, 1);
    --border-top-color: rgba(0, 0, 0, 0.18);
    --notch-bg: rgba(255, 255, 255, 0.05);
    --notch-border: rgba(0, 0, 0, 0.12);
  }

  :global(.dark) .msqdx-notched-label {
    --text-color: rgba(255, 255, 255, 1);
    --border-top-color: rgba(255, 255, 255, 0.18);
    --notch-bg: rgba(0, 0, 0, 0.05);
    --notch-border: rgba(255, 255, 255, 0.12);
  }
</style>
