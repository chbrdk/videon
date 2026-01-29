<script lang="ts">
  import { MSQDX_COLORS } from '$lib/design-tokens';

  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let color: string = 'currentColor';

  const sizes = {
    sm: '16px',
    md: '24px',
    lg: '48px',
  };

  $: normalizedSize = sizes[size];
</script>

<div
  class="msqdx-spinner"
  style="
    width: {normalizedSize};
    height: {normalizedSize};
    border-color: {color};
    border-top-color: transparent;
  "
></div>

<style>
  .msqdx-spinner {
    border: 2px solid;
    border-radius: 50%;
    display: inline-block;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
