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

  let {
    icon,
    fontSize = 24,
    weight = 200,
    fill = 0,
    grade = 0,
    opticalSize = 24,
    class: className = '',
    style = '',
    'aria-label': ariaLabel,
    'aria-hidden': ariaHidden,
  }: Props = $props();

  const normalizedFontSize = $derived(typeof fontSize === 'number' ? `${fontSize}px` : fontSize);
  const fontVariationSettings = $derived(
    `'FILL' ${fill}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`
  );
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
