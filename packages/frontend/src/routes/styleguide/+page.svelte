<script lang="ts">
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/theme.store';
  import {
    MSQDX_COLORS,
    MSQDX_TYPOGRAPHY,
    MSQDX_SPACING,
    MSQDX_EFFECTS,
    MSQDX_ICONS,
  } from '$lib/design-tokens';

  // UI Components (Atome)
  import {
    MsqdxButton,
    MsqdxBadge,
    MsqdxChip,
    MsqdxGlassCard,
    MaterialSymbol,
    MsqdxTypography,
    MsqdxTabs,
    MsqdxFormField,
    MsqdxSelect,
    MsqdxNotchedLabel,
    MsqdxGlassCornerCard,
    MsqdxSlider,
    MsqdxStepper,
    MsqdxGlassChip,
    MsqdxGlassSettingsCard,
  } from '$lib/components/ui';
  import MsqdxProgress from '$lib/components/msqdx-progress.svelte';

  // Layout Components
  import { MsqdxAdminLayout } from '$lib/components/ui/layout';

  // Complex Components (Moleküle/Organismen)
  import MsqdxSearchBar from '$lib/components/msqdx-search-bar.svelte';
  import MsqdxBreadcrumbs from '$lib/components/msqdx-breadcrumbs.svelte';
  import MsqdxViewToggle from '$lib/components/msqdx-view-toggle.svelte';
  import MsqdxVideoCard from '$lib/components/msqdx-video-card.svelte';
  import MsqdxFolderCard from '$lib/components/msqdx-folder-card.svelte';
  import MsqdxUpload from '$lib/components/msqdx-upload.svelte';
  import MsqdxDeleteModal from '$lib/components/msqdx-delete-modal.svelte';
  import MsqdxContextMenu from '$lib/components/msqdx-context-menu.svelte';
  import MsqdxSceneList from '$lib/components/msqdx-scene-list.svelte';
  import MsqdxVisionTags from '$lib/components/msqdx-vision-tags.svelte';
  import ServiceStatusPanel from '$lib/components/ServiceStatusPanel.svelte';
  import MsqdxFolderDialog from '$lib/components/msqdx-folder-dialog.svelte';
  import ReVoiceModal from '$lib/components/ReVoiceModal.svelte';
  import ReframeModal from '$lib/components/ReframeModal.svelte';
  import VoiceCloneModal from '$lib/components/VoiceCloneModal.svelte';
  import MsqdxVideoPlayerWrapper from '$lib/components/msqdx-video-player-wrapper.svelte';
  import CentralVideoControls from '$lib/components/central-video-controls.svelte';
  import EditingToolbar from '$lib/components/editing-toolbar.svelte';
  import MsqdxUnifiedTimeline from '$lib/components/msqdx-unified-timeline.svelte';

  let currentTheme: 'light' | 'dark' = 'dark';
  let activeTab = 'atoms';
  let exampleTabValue = 'tab1';
  let deleteModalOpen = false;
  let folderDialogOpen = false;
  let reVoiceModalOpen = false;
  let reframeModalOpen = false;
  let voiceCloneModalOpen = false;
  let isPlaying = false;
  let currentTime = 0;
  let duration = 120;
  let videoMuted = false;
  let videoAudioLevel = 100;

  onMount(() => {
    const unsubscribe = theme.subscribe(value => {
      currentTheme = value;
    });
    return unsubscribe;
  });

  const tabs = [
    { value: 'atoms', label: 'Atome', icon: 'category' },
    { value: 'molecules', label: 'Moleküle', icon: 'Extension' },
    { value: 'organisms', label: 'Organismen', icon: 'view_module' },
    { value: 'tokens', label: 'Design Tokens', icon: 'style' },
    { value: 'layout', label: 'Layout', icon: 'dashboard' },
  ];

  // CSS-Variablen für Style-Block
  const brandGreen = MSQDX_COLORS.brand.green;
  const tabsCount = tabs.length;
</script>

<MsqdxAdminLayout title="Styleguide" subtitle="VIDEON Design System Komponenten">
  <div class="styleguide-wrapper">
    <div class="styleguide-header">
      <h1 class="styleguide-title">msqdx-glass Design System</h1>
      <p class="styleguide-description">
        Zentrale Übersicht aller UI-Komponenten, Atome und deren Zustände.
      </p>
    </div>

    <!-- Tabs Navigation -->
    <MsqdxTabs
      value={activeTab}
      onChange={value => (activeTab = value)}
      tabs={tabs.map(tab => ({
        value: tab.value,
        label: tab.label,
        icon: tab.icon,
      }))}
    />

    <!-- Content -->
    <div class="styleguide-content">
      <!-- Atome -->
      {#if activeTab === 'atoms'}
        <div class="section">
          <!-- Typography -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Typography</MsqdxTypography>
            <div class="component-grid">
              <MsqdxGlassCard>
                <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                  >Variants (with default weights)</MsqdxTypography
                >
                <div class="typography-examples">
                  <div class="typography-item">
                    <MsqdxTypography
                      variant="caption"
                      style="opacity: 0.5; display: block; margin-bottom: 0.5rem;"
                      >H1 - Extrabold (800)</MsqdxTypography
                    >
                    <MsqdxTypography variant="h1">Heading 1 (Noto Sans JP)</MsqdxTypography>
                  </div>
                  <div class="typography-item">
                    <MsqdxTypography
                      variant="caption"
                      style="opacity: 0.5; display: block; margin-bottom: 0.5rem;"
                      >H2 - Extrabold (800)</MsqdxTypography
                    >
                    <MsqdxTypography variant="h2">Heading 2 (Noto Sans JP)</MsqdxTypography>
                  </div>
                  <div class="typography-item">
                    <MsqdxTypography
                      variant="caption"
                      style="opacity: 0.5; display: block; margin-bottom: 0.5rem;"
                      >H3 - Bold (700)</MsqdxTypography
                    >
                    <MsqdxTypography variant="h3">Heading 3 (Noto Sans JP)</MsqdxTypography>
                  </div>
                  <div class="typography-item">
                    <MsqdxTypography
                      variant="caption"
                      style="opacity: 0.5; display: block; margin-bottom: 0.5rem;"
                      >H4 - Bold (700)</MsqdxTypography
                    >
                    <MsqdxTypography variant="h4">Heading 4 (Noto Sans JP)</MsqdxTypography>
                  </div>
                  <div class="typography-item">
                    <MsqdxTypography
                      variant="caption"
                      style="opacity: 0.5; display: block; margin-bottom: 0.5rem;"
                      >Subtitle1 - Medium (500)</MsqdxTypography
                    >
                    <MsqdxTypography variant="subtitle1"
                      >Subtitle 1: Medium weight for emphasis</MsqdxTypography
                    >
                  </div>
                  <div class="typography-item">
                    <MsqdxTypography
                      variant="caption"
                      style="opacity: 0.5; display: block; margin-bottom: 0.5rem;"
                      >Subtitle2 - Semibold (600)</MsqdxTypography
                    >
                    <MsqdxTypography variant="subtitle2"
                      >Subtitle 2: Semibold for section labels</MsqdxTypography
                    >
                  </div>
                  <div class="typography-item">
                    <MsqdxTypography
                      variant="caption"
                      style="opacity: 0.5; display: block; margin-bottom: 0.5rem;"
                      >Body1 - Regular (400)</MsqdxTypography
                    >
                    <MsqdxTypography variant="body1"
                      >Body 1: The quick brown fox jumps over the lazy dog.</MsqdxTypography
                    >
                  </div>
                  <div class="typography-item">
                    <MsqdxTypography
                      variant="caption"
                      style="opacity: 0.5; display: block; margin-bottom: 0.5rem;"
                      >Body2 - Regular (400)</MsqdxTypography
                    >
                    <MsqdxTypography variant="body2"
                      >Body 2: The quick brown fox jumps over the lazy dog.</MsqdxTypography
                    >
                  </div>
                  <div class="typography-item">
                    <MsqdxTypography
                      variant="caption"
                      style="opacity: 0.5; display: block; margin-bottom: 0.5rem;"
                      >Caption - Regular (400)</MsqdxTypography
                    >
                    <MsqdxTypography variant="caption"
                      >Caption: Used for metadata and small notes.</MsqdxTypography
                    >
                  </div>
                </div>
              </MsqdxGlassCard>
              <MsqdxGlassCard>
                <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                  >Font Weights</MsqdxTypography
                >
                <div class="typography-examples">
                  {#each Object.entries(MSQDX_TYPOGRAPHY.fontWeight) as [key, value]}
                    <div class="typography-item">
                      <MsqdxTypography
                        variant="caption"
                        style="opacity: 0.5; display: block; margin-bottom: 0.5rem;"
                        >{key.charAt(0).toUpperCase() + key.slice(1)} ({value})</MsqdxTypography
                      >
                      <MsqdxTypography variant="body1" weight={key}
                        >{value}: The quick brown fox jumps over the lazy dog</MsqdxTypography
                      >
                    </div>
                  {/each}
                  <div
                    class="typography-item"
                    style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255, 255, 255, 0.1);"
                  >
                    <MsqdxTypography
                      variant="caption"
                      style="opacity: 0.5; display: block; margin-bottom: 0.5rem;"
                      >Custom Weight (550)</MsqdxTypography
                    >
                    <MsqdxTypography variant="body1" weight={550}
                      >Custom Weight: The quick brown fox jumps over the lazy dog</MsqdxTypography
                    >
                  </div>
                </div>
              </MsqdxGlassCard>
              <MsqdxGlassCard>
                <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                  >Eyebrow Variant</MsqdxTypography
                >
                <div class="typography-examples">
                  <MsqdxTypography eyebrow>Section Label</MsqdxTypography>
                  <MsqdxTypography variant="h3">Main Heading</MsqdxTypography>
                  <MsqdxTypography variant="body1"
                    >Regular content below eyebrow label.</MsqdxTypography
                  >
                </div>
              </MsqdxGlassCard>
            </div>
          </div>

          <!-- Tabs -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Tabs</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                >Tab Navigation</MsqdxTypography
              >
              {@const exampleTabs = [
                { value: 'tab1', label: 'Tab 1', icon: 'home' },
                { value: 'tab2', label: 'Tab 2', icon: 'settings' },
                { value: 'tab3', label: 'Tab 3', icon: 'info' },
              ]}
              <MsqdxTabs
                value={exampleTabValue}
                onChange={value => (exampleTabValue = value)}
                tabs={exampleTabs}
              />
            </MsqdxGlassCard>
          </div>

          <!-- Form Fields -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Form Fields</MsqdxTypography>
            <div class="component-grid">
              <MsqdxGlassCard>
                <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                  >MsqdxFormField</MsqdxTypography
                >
                <div class="form-examples">
                  <MsqdxFormField label="Email" placeholder="Enter your email" icon="mail" />
                  <MsqdxFormField
                    label="Password"
                    type="password"
                    placeholder="Enter password"
                    icon="lock"
                    required
                  />
                  <MsqdxFormField label="Success" placeholder="Valid input" success />
                  <MsqdxFormField
                    label="Error"
                    placeholder="Invalid input"
                    error
                    errorText="This field is required"
                  />
                  <MsqdxFormField label="Disabled" placeholder="Cannot edit" disabled />
                </div>
              </MsqdxGlassCard>
              <MsqdxGlassCard>
                <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                  >MsqdxSelect</MsqdxTypography
                >
                <div class="form-examples">
                  <MsqdxSelect
                    label="Category"
                    options={[
                      { value: '1', label: 'Option 1' },
                      { value: '2', label: 'Option 2' },
                      { value: '3', label: 'Option 3' },
                    ]}
                    helperText="Select an option"
                  />
                  <MsqdxSelect
                    label="Status"
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                    error
                  />
                </div>
              </MsqdxGlassCard>
            </div>
          </div>

          <!-- Buttons -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Buttons</MsqdxTypography>
            <MsqdxGlassCard>
              <div class="component-grid-2">
                <div>
                  <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                    >Variants</MsqdxTypography
                  >
                  <div class="button-group">
                    <MsqdxButton variant="contained">Primary Action</MsqdxButton>
                    <MsqdxButton variant="outlined" glass={true}>Glass Secondary</MsqdxButton>
                    <MsqdxButton variant="text">Ghost Action</MsqdxButton>
                  </div>
                </div>
                <div>
                  <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                    >States & Icons</MsqdxTypography
                  >
                  <div class="button-group">
                    <MsqdxButton variant="contained" loading={true}>Saving...</MsqdxButton>
                    <MsqdxButton variant="contained" disabled>Disabled</MsqdxButton>
                    <MsqdxButton variant="contained">
                      <MaterialSymbol
                        icon="auto_awesome"
                        fontSize={MSQDX_ICONS.sizes.md}
                        weight={MSQDX_ICONS.weights.regular}
                        style="margin-right: 0.5rem;"
                      />
                      With Icon
                    </MsqdxButton>
                  </div>
                </div>
              </div>
            </MsqdxGlassCard>
          </div>

          <!-- Notched Label -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Notched Label</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                >Notched Label Variants</MsqdxTypography
              >
              <div class="badge-group">
                <MsqdxNotchedLabel borderRadius={20}>Notched Label</MsqdxNotchedLabel>
                <MsqdxNotchedLabel borderRadius={20} notchPosition="top-left"
                  >Top Left Notch</MsqdxNotchedLabel
                >
                <MsqdxNotchedLabel borderRadius={16}>Smaller Radius</MsqdxNotchedLabel>
              </div>
            </MsqdxGlassCard>
          </div>

          <!-- Badges -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Badges</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                >Variants</MsqdxTypography
              >
              <div class="badge-group">
                <MsqdxBadge>Default</MsqdxBadge>
                <MsqdxBadge variant="success">Success</MsqdxBadge>
                <MsqdxBadge variant="warning">Warning</MsqdxBadge>
                <MsqdxBadge variant="error">Error</MsqdxBadge>
                <MsqdxBadge variant="info">Info</MsqdxBadge>
              </div>
            </MsqdxGlassCard>
          </div>

          <!-- Chips -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Chips</MsqdxTypography>
            <div class="component-grid">
              <MsqdxGlassCard>
                <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                  >MsqdxChip (UI Component)</MsqdxTypography
                >
                <div class="chip-group">
                  <MsqdxChip>Default</MsqdxChip>
                  <MsqdxChip variant="purple">Purple</MsqdxChip>
                  <MsqdxChip variant="yellow">Yellow</MsqdxChip>
                  <MsqdxChip variant="pink">Pink</MsqdxChip>
                  <MsqdxChip variant="orange">Orange</MsqdxChip>
                  <MsqdxChip variant="blue">Blue</MsqdxChip>
                  <MsqdxChip variant="green">Green</MsqdxChip>
                </div>
              </MsqdxGlassCard>
              <MsqdxGlassCard>
                <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                  >MsqdxGlassChip (Generic Component)</MsqdxTypography
                >
                <div class="chip-examples">
                  <div>
                    <MsqdxTypography
                      variant="caption"
                      style="opacity: 0.6; display: block; margin-bottom: 0.5rem;"
                      >Persona Variants</MsqdxTypography
                    >
                    <div class="chip-group">
                      <MsqdxGlassChip variant="trait">Trait</MsqdxGlassChip>
                      <MsqdxGlassChip variant="vocab">Vocab</MsqdxGlassChip>
                      <MsqdxGlassChip variant="pain">Pain</MsqdxGlassChip>
                      <MsqdxGlassChip variant="goal">Goal</MsqdxGlassChip>
                      <MsqdxGlassChip variant="value">Value</MsqdxGlassChip>
                      <MsqdxGlassChip variant="interest">Interest</MsqdxGlassChip>
                    </div>
                  </div>
                  <div>
                    <MsqdxTypography
                      variant="caption"
                      style="opacity: 0.6; display: block; margin-bottom: 0.5rem; margin-top: 1rem;"
                      >Status Variants</MsqdxTypography
                    >
                    <div class="chip-group">
                      <MsqdxGlassChip variant="draft">Draft</MsqdxGlassChip>
                      <MsqdxGlassChip variant="published">Published</MsqdxGlassChip>
                      <MsqdxGlassChip variant="archived">Archived</MsqdxGlassChip>
                      <MsqdxGlassChip variant="success">Success</MsqdxGlassChip>
                      <MsqdxGlassChip variant="processing">Processing</MsqdxGlassChip>
                      <MsqdxGlassChip variant="error">Error</MsqdxGlassChip>
                    </div>
                  </div>
                  <div>
                    <MsqdxTypography
                      variant="caption"
                      style="opacity: 0.6; display: block; margin-bottom: 0.5rem; margin-top: 1rem;"
                      >With Priority</MsqdxTypography
                    >
                    <div class="chip-group">
                      <MsqdxGlassChip variant="pain" priority="high"
                        >High Priority Pain</MsqdxGlassChip
                      >
                      <MsqdxGlassChip variant="goal" priority="medium"
                        >Medium Priority Goal</MsqdxGlassChip
                      >
                      <MsqdxGlassChip variant="trait" priority="low"
                        >Low Priority Trait</MsqdxGlassChip
                      >
                    </div>
                  </div>
                  <div>
                    <MsqdxTypography
                      variant="caption"
                      style="opacity: 0.6; display: block; margin-bottom: 0.5rem; margin-top: 1rem;"
                      >Highlighted</MsqdxTypography
                    >
                    <div class="chip-group">
                      <MsqdxGlassChip variant="trait" highlighted>New Trait</MsqdxGlassChip>
                      <MsqdxGlassChip variant="pain" highlighted>New Pain</MsqdxGlassChip>
                    </div>
                  </div>
                </div>
              </MsqdxGlassCard>
            </div>
          </div>

          <!-- Slider -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Slider</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                >MsqdxSlider</MsqdxTypography
              >
              <div class="form-examples">
                <MsqdxSlider label="Volume" min={0} max={100} value={50} showValue />
                <MsqdxSlider
                  label="Brightness"
                  min={0}
                  max={100}
                  value={75}
                  showValue
                  helperText="Adjust screen brightness"
                />
                <MsqdxSlider min={0} max={100} value={25} disabled />
              </div>
            </MsqdxGlassCard>
          </div>

          <!-- Stepper -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Stepper</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                >MsqdxStepper</MsqdxTypography
              >
              <div class="form-examples">
                <MsqdxStepper
                  steps={[
                    { label: 'Step 1', description: 'First step description' },
                    { label: 'Step 2', description: 'Second step description' },
                    { label: 'Step 3', description: 'Third step description' },
                  ]}
                  activeStep={1}
                  orientation="horizontal"
                />
              </div>
            </MsqdxGlassCard>
          </div>

          <!-- Icons -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Icons</MsqdxTypography>
            <MsqdxGlassCard>
              <div class="component-grid-2">
                <div>
                  <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                    >Sizes</MsqdxTypography
                  >
                  <div class="icon-size-examples">
                    {#each Object.entries(MSQDX_ICONS.sizes) as [key, value]}
                      <div class="icon-size-item">
                        <MaterialSymbol
                          icon="star"
                          fontSize={value}
                          weight={MSQDX_ICONS.weights.regular}
                        />
                        <span class="icon-size-label">{value}px</span>
                      </div>
                    {/each}
                  </div>
                </div>
                <div>
                  <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                    >Weights & Styles</MsqdxTypography
                  >
                  <div class="icon-weight-examples">
                    {#each Object.entries(MSQDX_ICONS.weights) as [key, value]}
                      <div class="icon-weight-item">
                        <MaterialSymbol icon="auto_awesome" fontSize={24} weight={value} />
                        <span>{key.charAt(0).toUpperCase() + key.slice(1)} ({value})</span>
                      </div>
                    {/each}
                    <div class="icon-weight-item">
                      <MaterialSymbol icon="auto_awesome" fontSize={24} fill={1} />
                      <span>Filled (fill=1)</span>
                    </div>
                  </div>
                </div>
              </div>
            </MsqdxGlassCard>
          </div>

          <!-- Glass Corner Card -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Glass Corner Card</MsqdxTypography>
            <div class="card-grid">
              <MsqdxGlassCornerCard topLeftBadge="1" borderRadiusVariant="xl">
                <MsqdxTypography variant="h6">MsqdxGlassCornerCard</MsqdxTypography>
                <MsqdxTypography variant="body2" style="opacity: 0.7;">
                  Signature notched corners with integrated badges. Ideal for ordered lists or items
                  with a clear Call-to-Action.
                </MsqdxTypography>
              </MsqdxGlassCornerCard>
              <MsqdxGlassCornerCard topLeftBadge="★" borderRadiusVariant="xl">
                <MsqdxTypography variant="h6">Accent & Icons</MsqdxTypography>
                <MsqdxTypography variant="body2" style="opacity: 0.7;">
                  Supports all standard card features like top-border accents and custom badge
                  content.
                </MsqdxTypography>
              </MsqdxGlassCornerCard>
            </div>
          </div>

          <!-- Glass Settings Card -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Glass Settings Card</MsqdxTypography>
            <div class="card-grid">
              <MsqdxGlassSettingsCard
                title="Settings"
                description="Manage your application settings and preferences"
                icon="settings"
                count={12}
                status="active"
              />
              <MsqdxGlassSettingsCard
                title="Users"
                description="User management and permissions"
                icon="people"
                count={42}
                status="active"
                accentColor={MSQDX_COLORS.brand.blue}
              />
            </div>
          </div>

          <!-- Progress -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Progress</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                >Progress Bars</MsqdxTypography
              >
              <div class="progress-examples">
                <MsqdxProgress value={0} />
                <MsqdxProgress value={25} />
                <MsqdxProgress value={50} />
                <MsqdxProgress value={75} />
                <MsqdxProgress value={100} />
              </div>
            </MsqdxGlassCard>
          </div>

          <!-- Glass Card -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Glass Card</MsqdxTypography>
            <div class="card-grid">
              <MsqdxGlassCard>
                <MsqdxTypography variant="h6">Default Glass Card</MsqdxTypography>
                <MsqdxTypography variant="body2" style="opacity: 0.7;"
                  >Standard glass card with blur effect</MsqdxTypography
                >
              </MsqdxGlassCard>
              <MsqdxGlassCard blur={20} opacity={0.1}>
                <MsqdxTypography variant="h6">Custom Blur</MsqdxTypography>
                <MsqdxTypography variant="body2" style="opacity: 0.7;"
                  >Custom blur and opacity values</MsqdxTypography
                >
              </MsqdxGlassCard>
              <MsqdxGlassCard accent="purple">
                <MsqdxTypography variant="h6">Purple Accent</MsqdxTypography>
                <MsqdxTypography variant="body2" style="opacity: 0.7;"
                  >Glass card with purple accent</MsqdxTypography
                >
              </MsqdxGlassCard>
              <MsqdxGlassCard accent="yellow">
                <MsqdxTypography variant="h6">Yellow Accent</MsqdxTypography>
                <MsqdxTypography variant="body2" style="opacity: 0.7;"
                  >Glass card with yellow accent</MsqdxTypography
                >
              </MsqdxGlassCard>
            </div>
          </div>
        </div>
      {/if}

      <!-- Moleküle -->
      {#if activeTab === 'molecules'}
        <div class="section">
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Search Bar</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxSearchBar />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Breadcrumbs</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Breadcrumbs werden automatisch aus dem Folder-Store geladen.</MsqdxTypography
              >
              <MsqdxBreadcrumbs />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>View Toggle</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxViewToggle />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Upload</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Drag & Drop oder Klick zum Hochladen von Videos.</MsqdxTypography
              >
              <MsqdxUpload on:upload={e => console.log('Upload:', e.detail)} />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Context Menu</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Rechtsklick-Menü für Kontext-Aktionen. (Beispiel mit Mock-Daten)</MsqdxTypography
              >
              <MsqdxContextMenu
                x={100}
                y={100}
                items={[
                  { label: 'Bearbeiten', icon: 'edit', action: () => console.log('Edit') },
                  { label: 'Löschen', icon: 'delete', action: () => console.log('Delete') },
                  { label: 'Kopieren', icon: 'content_copy', action: () => console.log('Copy') },
                ]}
                onClose={() => console.log('Menu closed')}
              />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Scene List</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Liste von Szenen mit Thumbnails und Metadaten. (Beispiel mit Mock-Daten)</MsqdxTypography
              >
              <MsqdxSceneList
                scenes={[
                  {
                    id: '1',
                    startTime: 0,
                    endTime: 10,
                    thumbnailUrl: '',
                    description: 'Example Scene 1',
                  },
                  {
                    id: '2',
                    startTime: 10,
                    endTime: 20,
                    thumbnailUrl: '',
                    description: 'Example Scene 2',
                  },
                ]}
                visionData={[]}
                on:sceneSelect={e => console.log('Scene selected:', e.detail)}
              />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Vision Tags</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Tags für visuelle Erkennung und Kategorisierung. (Beispiel mit Mock-Daten)</MsqdxTypography
              >
              <MsqdxVisionTags
                objects={[
                  { label: 'Person', confidence: 0.95 },
                  { label: 'Car', confidence: 0.87 },
                  { label: 'Building', confidence: 0.72 },
                ]}
                faces={[{ confidence: 0.89 }]}
                sceneClassification={[
                  { label: 'Outdoor', confidence: 0.91, category: 'location' },
                  { label: 'Daytime', confidence: 0.85, category: 'time' },
                ]}
                aiDescription="A person walking near a building during daytime."
              />
            </MsqdxGlassCard>
          </div>
        </div>
      {/if}

      <!-- Organismen -->
      {#if activeTab === 'organisms'}
        <div class="section">
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Video Card</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Die Video Card wird in der Video-Gallery verwendet.</MsqdxTypography
              >
              <div class="card-grid">
                <MsqdxVideoCard
                  video={{
                    id: 'example-1',
                    title: 'Example Video',
                    duration: 120,
                    thumbnailUrl: '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }}
                />
              </div>
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Folder Card</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Die Folder Card wird in der Video-Gallery verwendet.</MsqdxTypography
              >
              <div class="card-grid">
                <MsqdxFolderCard
                  folder={{
                    id: 'example-1',
                    name: 'Example Folder',
                    videoCount: 5,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }}
                />
              </div>
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Delete Modal</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Bestätigungs-Modal zum Löschen von Videos.</MsqdxTypography
              >
              <MsqdxButton on:click={() => (deleteModalOpen = true)}
                >Delete Modal öffnen</MsqdxButton
              >
              <MsqdxDeleteModal
                bind:open={deleteModalOpen}
                video={{
                  id: 'example-1',
                  filename: 'example-video.mp4',
                  originalName: 'Example Video.mp4',
                }}
                on:close={() => (deleteModalOpen = false)}
                on:confirm={() => {
                  deleteModalOpen = false;
                  console.log('Delete confirmed');
                }}
              />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Service Status Panel</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Status-Übersicht für Backend-Services.</MsqdxTypography
              >
              <ServiceStatusPanel />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Folder Dialog</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Dialog zum Erstellen und Verwalten von Ordnern.</MsqdxTypography
              >
              <MsqdxButton on:click={() => (folderDialogOpen = true)}
                >Folder Dialog öffnen</MsqdxButton
              >
              <MsqdxFolderDialog
                bind:open={folderDialogOpen}
                on:close={() => (folderDialogOpen = false)}
                on:create={e => {
                  folderDialogOpen = false;
                  console.log('Folder created:', e.detail);
                }}
              />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>ReVoice Modal</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Modal zum Ersetzen von Stimmen in Videos.</MsqdxTypography
              >
              <MsqdxButton on:click={() => (reVoiceModalOpen = true)}
                >ReVoice Modal öffnen</MsqdxButton
              >
              <ReVoiceModal
                bind:open={reVoiceModalOpen}
                videoId="example-1"
                on:close={() => (reVoiceModalOpen = false)}
              />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Reframe Modal</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Modal zum Neurahmen von Videos.</MsqdxTypography
              >
              <MsqdxButton on:click={() => (reframeModalOpen = true)}
                >Reframe Modal öffnen</MsqdxButton
              >
              <ReframeModal
                bind:open={reframeModalOpen}
                videoId="example-1"
                on:close={() => (reframeModalOpen = false)}
              />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Voice Clone Modal</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Modal zum Klonen von Stimmen.</MsqdxTypography
              >
              <MsqdxButton on:click={() => (voiceCloneModalOpen = true)}
                >Voice Clone Modal öffnen</MsqdxButton
              >
              <VoiceCloneModal
                bind:open={voiceCloneModalOpen}
                on:close={() => (voiceCloneModalOpen = false)}
              />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Video Player Wrapper</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Kompletter Video-Player mit Controls und Timeline. (Beispiel mit Mock-Daten)</MsqdxTypography
              >
              <MsqdxVideoPlayerWrapper
                videoSrc=""
                posterSrc=""
                scenes={[]}
                transcriptionSegments={[]}
                videoDuration={120}
                originalVideoDuration={120}
                videoId="example-1"
                isProject={false}
                showVideoControls={true}
                canUndo={false}
                canRedo={false}
                canSplit={false}
                canAddScene={true}
                showSearchModal={false}
                searchQuery=""
                searchResults={[]}
                searching={false}
              />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Central Video Controls</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Zentrale Steuerung für Video-Wiedergabe mit Play/Pause, Navigation, Volume und
                Editing-Tools.</MsqdxTypography
              >
              <CentralVideoControls
                bind:isPlaying
                bind:currentTime
                bind:duration
                bind:videoMuted
                bind:videoAudioLevel
                canGoBack={true}
                canGoForward={true}
                canUndo={true}
                canRedo={false}
                canSplit={true}
                canAddScene={true}
                showSearchModal={false}
                searchQuery=""
                searchResults={[]}
                searching={false}
                on:playPause={() => (isPlaying = !isPlaying)}
                on:previous={() => console.log('Previous')}
                on:next={() => console.log('Next')}
                on:muteToggle={() => (videoMuted = !videoMuted)}
                on:volumeChange={e => (videoAudioLevel = e.detail.level)}
                on:undo={() => console.log('Undo')}
                on:redo={() => console.log('Redo')}
                on:split={() => console.log('Split')}
                on:addScene={() => console.log('Add Scene')}
                on:search={() => console.log('Search')}
                on:searchInput={() => console.log('Search Input')}
                on:addSceneToProject={() => console.log('Add Scene to Project')}
                on:closeSearchModal={() => console.log('Close Search Modal')}
              />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Editing Toolbar</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Toolbar für Edit-Operationen (Undo, Redo, Split).</MsqdxTypography
              >
              <EditingToolbar
                canSplit={true}
                on:undo={() => console.log('Undo')}
                on:redo={() => console.log('Redo')}
                on:split={() => console.log('Split')}
              />
            </MsqdxGlassCard>
          </div>

          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Unified Timeline</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body2" style="margin-bottom: 1rem; opacity: 0.7;"
                >Vereinheitlichte Timeline mit Scenes, Transcription, Audio Stems und Voice
                Segments. (Beispiel mit Mock-Daten)</MsqdxTypography
              >
              <div style="height: 400px; overflow: hidden;">
                <MsqdxUnifiedTimeline
                  scenes={[
                    { id: '1', sceneId: '1', startTime: 0, endTime: 10, videoId: 'example-1' },
                    { id: '2', sceneId: '2', startTime: 10, endTime: 20, videoId: 'example-1' },
                  ]}
                  transcriptionSegments={[]}
                  videoElement={null}
                  videoDuration={120}
                  originalVideoDuration={120}
                  videoId="example-1"
                  isProject={false}
                  on:seekTo={() => console.log('Seek')}
                  on:sceneClick={() => console.log('Scene Click')}
                  on:sceneResize={() => console.log('Scene Resize')}
                  on:sceneResizeEnd={() => console.log('Scene Resize End')}
                  on:sceneReorder={() => console.log('Scene Reorder')}
                  on:deleteScene={() => console.log('Delete Scene')}
                  on:audioTrackRegister={() => console.log('Audio Track Register')}
                  on:audioTrackUnregister={() => console.log('Audio Track Unregister')}
                  on:videoMuteToggle={() => console.log('Video Mute Toggle')}
                  on:videoAudioLevelChange={() => console.log('Video Audio Level Change')}
                />
              </div>
            </MsqdxGlassCard>
          </div>
        </div>
      {/if}

      <!-- Design Tokens -->
      {#if activeTab === 'tokens'}
        <div class="section">
          <!-- Colors -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Colors</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                >Brand Colors</MsqdxTypography
              >
              <div class="color-grid">
                {#each Object.entries(MSQDX_COLORS.brand) as [key, value]}
                  {#if key !== 'white' && key !== 'black'}
                    <div class="color-item">
                      <div class="color-swatch" style="background-color: {value};"></div>
                      <div class="color-info">
                        <strong>{key.charAt(0).toUpperCase() + key.slice(1)}</strong>
                        <code>{value}</code>
                      </div>
                    </div>
                  {/if}
                {/each}
              </div>
            </MsqdxGlassCard>
          </div>

          <!-- Typography -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Typography</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                >Font Families</MsqdxTypography
              >
              <div class="typography-examples">
                <MsqdxTypography variant="body1"
                  ><strong>Primary:</strong>
                  <span style="font-family: {MSQDX_TYPOGRAPHY.fontFamily.primary};"
                    >{MSQDX_TYPOGRAPHY.fontFamily.primary}</span
                  ></MsqdxTypography
                >
                <MsqdxTypography variant="body1"
                  ><strong>Mono:</strong>
                  <span style="font-family: {MSQDX_TYPOGRAPHY.fontFamily.mono};"
                    >{MSQDX_TYPOGRAPHY.fontFamily.mono}</span
                  ></MsqdxTypography
                >
              </div>
              <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem; margin-top: 1.5rem;"
                >Font Sizes</MsqdxTypography
              >
              <div class="typography-examples">
                {#each Object.entries(MSQDX_TYPOGRAPHY.fontSize) as [key, value]}
                  <MsqdxTypography variant="body1" style="font-size: {value};">
                    <strong>{key}:</strong>
                    {value} - The quick brown fox jumps over the lazy dog
                  </MsqdxTypography>
                {/each}
              </div>
            </MsqdxGlassCard>
          </div>

          <!-- Spacing -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Spacing</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                >Border Radius</MsqdxTypography
              >
              <div class="spacing-grid">
                {#each Object.entries(MSQDX_SPACING.borderRadius) as [key, value]}
                  <div class="spacing-item">
                    <div
                      class="spacing-visual"
                      style="border-radius: {value}px; width: 60px; height: 60px; background: {MSQDX_COLORS
                        .brand.green};"
                    ></div>
                    <div class="spacing-info">
                      <strong>{key}</strong>
                      <code>{value}px</code>
                    </div>
                  </div>
                {/each}
              </div>
              <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem; margin-top: 1.5rem;"
                >Scale</MsqdxTypography
              >
              <div class="spacing-grid">
                {#each Object.entries(MSQDX_SPACING.scale) as [key, value]}
                  <div class="spacing-item">
                    <div
                      class="spacing-visual"
                      style="width: {value}px; height: {value}px; background: {MSQDX_COLORS.brand
                        .green};"
                    ></div>
                    <div class="spacing-info">
                      <strong>{key}</strong>
                      <code>{value}px</code>
                    </div>
                  </div>
                {/each}
              </div>
            </MsqdxGlassCard>
          </div>

          <!-- Effects -->
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Effects</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem;"
                >Glass Effects</MsqdxTypography
              >
              <div class="effects-list">
                <MsqdxTypography variant="body1"
                  ><strong>Blur:</strong> {MSQDX_EFFECTS.glass.blur}</MsqdxTypography
                >
                <MsqdxTypography variant="body1"
                  ><strong>Saturate:</strong> {MSQDX_EFFECTS.glass.saturate}</MsqdxTypography
                >
              </div>
              <MsqdxTypography variant="subtitle2" style="margin-bottom: 1rem; margin-top: 1.5rem;"
                >Transitions</MsqdxTypography
              >
              <div class="effects-list">
                {#each Object.entries(MSQDX_EFFECTS.transitions) as [key, value]}
                  <MsqdxTypography variant="body1"
                    ><strong>{key}:</strong> <code>{value}</code></MsqdxTypography
                  >
                {/each}
              </div>
            </MsqdxGlassCard>
          </div>
        </div>
      {/if}

      <!-- Layout -->
      {#if activeTab === 'layout'}
        <div class="section">
          <div class="component-section">
            <MsqdxTypography variant="h6" eyebrow>Admin Layout</MsqdxTypography>
            <MsqdxGlassCard>
              <MsqdxTypography variant="body1"
                >Das <code>MsqdxAdminLayout</code> ist die Hauptlayout-Komponente für VIDEON.</MsqdxTypography
              >
              <MsqdxTypography variant="body1" style="margin-top: 0.5rem;"
                >Es enthält:</MsqdxTypography
              >
              <ul>
                <li>
                  <MsqdxTypography variant="body1" style="display: inline;"
                    >Sidebar-Navigation (MsqdxAdminNav)</MsqdxTypography
                  >
                </li>
                <li>
                  <MsqdxTypography variant="body1" style="display: inline;"
                    >Header mit Logo und Titel</MsqdxTypography
                  >
                </li>
                <li>
                  <MsqdxTypography variant="body1" style="display: inline;"
                    >L-förmiges Corner-Element</MsqdxTypography
                  >
                </li>
                <li>
                  <MsqdxTypography variant="body1" style="display: inline;"
                    >Grüner Brand-Hintergrund</MsqdxTypography
                  >
                </li>
                <li>
                  <MsqdxTypography variant="body1" style="display: inline;"
                    >Grid-Pattern</MsqdxTypography
                  >
                </li>
              </ul>
            </MsqdxGlassCard>
          </div>
        </div>
      {/if}
    </div>
  </div>
</MsqdxAdminLayout>

<style>
  .styleguide-wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .styleguide-header {
    margin-bottom: 2rem;
  }

  .styleguide-title {
    font-size: 2rem;
    font-weight: 800;
    margin: 0 0 0.5rem 0;
    color: inherit;
    font-family: var(--msqdx-font-primary, 'Noto Sans JP', sans-serif);
  }

  .styleguide-description {
    font-size: 1rem;
    opacity: 0.7;
    margin: 0;
    color: inherit;
  }

  .tabs-container {
    position: relative;
    margin-bottom: 2rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  }

  .tabs-wrapper {
    display: flex;
    gap: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tabs-wrapper::-webkit-scrollbar {
    display: none;
  }

  .tab-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    border: none;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s ease;
    color: rgba(0, 0, 0, 0.6);
    font-weight: 500;
    font-size: 0.875rem;
    white-space: nowrap;
    position: relative;
  }

  .tab-button:hover {
    color: inherit;
    background-color: rgba(0, 0, 0, 0.03);
  }

  .tab-button.active {
    color: var(--msqdx-color-brand-orange);
    font-weight: 600;
  }

  .tabs-indicator {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 3px;
    border-radius: 3px 3px 0 0;
    transition: transform 0.2s ease;
  }

  .styleguide-content {
    margin-top: 2rem;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 3rem;
  }

  .component-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .form-examples {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .chip-examples {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .component-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .component-grid-2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 2rem;
  }

  .button-group,
  .badge-group,
  .chip-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
  }

  .typography-examples {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .typography-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .typography-label {
    font-size: 0.75rem;
    opacity: 0.5;
    color: inherit;
  }

  .progress-examples {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .color-item {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .color-swatch {
    width: 100%;
    height: 80px;
    border-radius: 8px;
    border: 1px solid rgba(0, 0, 0, 0.1);
  }

  .color-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .color-info code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.6);
  }

  .spacing-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
  }

  .spacing-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .spacing-visual {
    border-radius: 4px;
  }

  .spacing-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    text-align: center;
  }

  .spacing-info code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.75rem;
    color: rgba(0, 0, 0, 0.6);
  }

  .effects-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .effects-list p {
    margin: 0;
  }

  .icon-size-examples {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    align-items: center;
  }

  .icon-size-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .icon-size-label {
    font-size: 0.75rem;
    opacity: 0.6;
    color: inherit;
  }

  .icon-weight-examples {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .icon-weight-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .icon-weight-item span {
    font-size: 0.875rem;
    color: inherit;
  }

  .helper-text {
    font-size: 0.875rem;
    color: rgba(0, 0, 0, 0.6);
    margin-bottom: 1rem;
  }

  code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.875rem;
    background: rgba(0, 0, 0, 0.05);
    padding: 0.125rem 0.375rem;
    border-radius: 4px;
  }

  ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  li {
    margin: 0.25rem 0;
  }

  h1,
  h2,
  h3,
  h4,
  p {
    margin: 0;
  }
</style>
