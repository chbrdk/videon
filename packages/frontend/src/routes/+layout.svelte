<script lang="ts">
  import '../app.css';
  let { children } = $props();
  
  console.log('Bare Layout Mounted');
</script>

<div class="debug-layout">
    <h1>Debug Mode</h1>
    {@render children?.()}
</div>
