import os
import re

directory = "/Users/christoph.bordeck/Desktop/videon_github/videon/packages/frontend/src/lib/components/ui"
files = [
    "MsqdxSelect.svelte", "MsqdxStepper.svelte", "MsqdxNotchedLabel.svelte", 
    "MsqdxProgress.svelte", "MsqdxGlassChip.svelte", "MsqdxFormField.svelte", 
    "MsqdxGlassSettingsCard.svelte", "MsqdxSlider.svelte", "MsqdxTypography.svelte", 
    "MsqdxGlassCornerCard.svelte", "MsqdxTabs.svelte"
]

for filename in files:
    path = os.path.join(directory, filename)
    if not os.path.exists(path):
        print(f"File not found: {path}")
        continue
    
    with open(path, 'r') as f:
        content = f.read()
    
    # 1. Replace currentTheme declaration
    # Matches: let currentTheme = 'dark'; OR let currentTheme: 'light' | 'dark' = 'dark';
    content = re.sub(r"let currentTheme[:\s'a-z|]*=.*['\"](dark|light)['\"];", "let currentTheme = $derived($theme);", content)
    
    # 2. Remove $effect theme subscription
    # This is a bit complex as it spans multiple lines.
    # Pattern: $effect(() => { const unsubscribe = theme.subscribe(...) return unsubscribe; });
    effect_pattern = re.compile(r"\$effect\(\(\) => \{[\s\n]*const unsubscribe = theme\.subscribe\(.*?\}\);[\s\n]*return unsubscribe;[\s\n]*\}\);", re.DOTALL)
    content = effect_pattern.sub("", content)
    
    # Also handle variants where the variable name might be different in the subscribe closure (t vs value)
    # But the structure is usually the same.
    
    with open(path, 'w') as f:
        f.write(content)
    print(f"Processed {filename}")
