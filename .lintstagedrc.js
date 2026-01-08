module.exports = {
  '*.{js,ts,jsx,tsx,svelte}': [
    'eslint --fix',
    'prettier --write',
  ],
  '*.{json,md,yml,yaml}': [
    'prettier --write',
  ],
};
