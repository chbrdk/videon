/** @type {import('svelte-docgen-cli').Config} */
export default {
  componentPaths: ['../src/lib/components'],
  outputPath: '../docs/components',
  watch: false,
  propsParser: (props) => {
    return props;
  },
  defaultProps: {},
  jsDocTags: {
    example: true,
    see: true,
    since: true,
    deprecated: true
  }
};

