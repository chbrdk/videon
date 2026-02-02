<script lang="ts">
  import { onMount } from 'svelte';
  import { MSQDX_COLORS, MSQDX_TYPOGRAPHY } from '$lib/design-tokens';
  import { theme } from '$lib/stores/theme.store';
  import MaterialSymbol from './MaterialSymbol.svelte';
  import MsqdxTypography from './MsqdxTypography.svelte';
  import { _ } from '$lib/i18n';

  interface Step {
    label: string;
    description?: string;
    icon?: string;
    optional?: boolean;
  }

  interface Props {
    steps: Step[];
    activeStep?: number;
    orientation?: 'horizontal' | 'vertical';
    showConnector?: boolean;
    class?: string;
  }

  export let steps: Step[];
  export let activeStep = 0;
  export let orientation: 'horizontal' | 'vertical' = 'horizontal';
  export let showConnector = true;
  let className = '';
  export { className as class };

  let currentTheme: 'light' | 'dark' = 'dark';

  const unsubscribe = theme.subscribe(t => {
    currentTheme = t;
  });

  onMount(() => {
    return unsubscribe;
  });

  $: connectorColor = currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';
  $: stepIconBg = currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  $: stepIconColor = currentTheme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
</script>

<div
  class="msqdx-stepper {className}"
  class:horizontal={orientation === 'horizontal'}
  class:vertical={orientation === 'vertical'}
>
  {#each steps as step, index}
    <div class="msqdx-step">
      <div class="msqdx-step-content">
        <div
          class="msqdx-step-icon"
          class:active={index === activeStep}
          class:completed={index < activeStep}
          style="
            background-color: {index === activeStep
            ? MSQDX_COLORS.brand.green
            : index < activeStep
              ? MSQDX_COLORS.status.success
              : stepIconBg};
            color: {index === activeStep || index < activeStep ? '#ffffff' : stepIconColor};
            box-shadow: {index === activeStep
            ? `0 0 0 4px rgba(${MSQDX_COLORS.brand.orangeRgb}, 0.16)`
            : 'none'};
          "
        >
          {#if index < activeStep}
            <MaterialSymbol icon="check" fontSize={16} weight={MSQDX_TYPOGRAPHY.fontWeight.bold} />
          {:else if step.icon}
            <MaterialSymbol
              icon={step.icon}
              fontSize={16}
              weight={MSQDX_TYPOGRAPHY.fontWeight.bold}
            />
          {:else}
            {index + 1}
          {/if}
        </div>

        <div class="msqdx-step-label-wrapper">
          <div
            class="msqdx-step-label"
            class:active={index === activeStep}
            class:completed={index < activeStep}
            style="
              color: {index === activeStep
              ? currentTheme === 'dark'
                ? '#ffffff'
                : '#0f172a'
              : index < activeStep
                ? MSQDX_COLORS.status.success
                : currentTheme === 'dark'
                  ? 'rgba(255, 255, 255, 0.7)'
                  : 'rgba(0, 0, 0, 0.7)'};
              font-weight: {index === activeStep || index < activeStep
              ? MSQDX_TYPOGRAPHY.fontWeight.semibold
              : MSQDX_TYPOGRAPHY.fontWeight.medium};
            "
          >
            {step.label}
            {#if step.optional}
              <span class="msqdx-step-optional">{_('common.optional')}</span>
            {/if}
          </div>
          {#if step.description && orientation === 'vertical'}
            <MsqdxTypography variant="body2" style="margin-top: 0.5rem; opacity: 0.7;">
              {step.description}
            </MsqdxTypography>
          {/if}
        </div>
      </div>

      {#if showConnector && index < steps.length - 1}
        <div
          class="msqdx-step-connector"
          class:horizontal={orientation === 'horizontal'}
          class:vertical={orientation === 'vertical'}
          style="
            border-color: {connectorColor};
            {orientation === 'horizontal'
            ? 'left: calc(-50% + 12px); right: calc(50% + 12px);'
            : 'top: calc(50% + 12px); bottom: calc(-50% + 12px);'}
          "
        ></div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .msqdx-stepper {
    display: flex;
    width: 100%;
  }

  .msqdx-stepper.horizontal {
    flex-direction: row;
  }

  .msqdx-stepper.vertical {
    flex-direction: column;
  }

  .msqdx-step {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
  }

  .msqdx-stepper.horizontal .msqdx-step {
    flex-direction: column;
  }

  .msqdx-stepper.vertical .msqdx-step {
    flex-direction: row;
  }

  .msqdx-step-content {
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 1;
  }

  .msqdx-stepper.horizontal .msqdx-step-content {
    flex-direction: row;
  }

  .msqdx-stepper.vertical .msqdx-step-content {
    flex-direction: row;
    width: 100%;
  }

  .msqdx-step-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.2s ease-in-out;
    flex-shrink: 0;
  }

  .msqdx-step-label-wrapper {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .msqdx-step-label {
    font-size: var(--msqdx-font-size-body1);
    font-family: var(--msqdx-font-primary);
    transition: all var(--msqdx-transition-standard);
  }

  .msqdx-step-optional {
    font-size: 0.75rem;
    opacity: 0.6;
    margin-left: 0.5rem;
  }

  .msqdx-step-connector {
    position: absolute;
    border-style: solid;
    z-index: 0;
  }

  .msqdx-step-connector.horizontal {
    top: 12px;
    border-top-width: 2px;
    border-left: none;
    border-right: none;
    border-bottom: none;
  }

  .msqdx-step-connector.vertical {
    left: 12px;
    border-left-width: 2px;
    border-top: none;
    border-right: none;
    border-bottom: none;
  }
</style>
