<script lang="ts">
  interface Props {
    icon: string;
    fontSize?: number | string;
    weight?: number;
    fill?: 0 | 1;
    grade?: number;
    opticalSize?: number;
    class?: string;
    style?: string;
    'aria-label'?: string;
    'aria-hidden'?: boolean;
  }

  export let icon: string;
  export let fontSize: number | string = 24;
  export let weight = 200;
  export let fill: 0 | 1 = 0;
  export let grade = 0;
  export let opticalSize = 24;
  let className = '';
  export { className as class };
  export let style = '';
  export let ariaLabel: string | undefined = undefined;
  export { ariaLabel as 'aria-label' };
  export let ariaHidden: boolean | undefined = undefined;
  export { ariaHidden as 'aria-hidden' };

  const normalizedFontSize = typeof fontSize === 'number' ? `${fontSize}px` : fontSize;
  const fontVariationSettings = `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`;
</script>

<span
  class="material-symbols-outlined {className}"
  style="
    font-variation-settings: {fontVariationSettings};
    font-size: {normalizedFontSize};
    line-height: 1;
    color: inherit;
    {style}
  "
  aria-label={ariaLabel}
  aria-hidden={ariaHidden ?? (ariaLabel ? undefined : true)}
>
  {icon}
</span>

<style>
  .material-symbols-outlined {
    font-family: 'Material Symbols Outlined';
    font-weight: normal;
    font-style: normal;
    display: inline-block;
    line-height: 1;
    text-transform: none;
    letter-spacing: normal;
    word-wrap: normal;
    white-space: nowrap;
    direction: ltr;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
    -moz-osx-font-smoothing: grayscale;
    font-feature-settings: 'liga';
  }
</style>
