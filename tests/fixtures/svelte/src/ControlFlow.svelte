<script lang="ts">
  const padding = 4;
  const items = [];
  const promise = Promise.resolve();
</script>

{#if true}
  <div style="padding: {padding}px; color: {'#ffffff'}"></div>
{:else}
  <div style="padding: {padding}px; color: {'#ffffff'}"></div>
{/if}

{#each items as item}
  <div style="padding: {padding}px; color: {'#ffffff'}"></div>
{:else}
  <div style="padding: {padding}px; color: {'#ffffff'}"></div>
{/each}

{#await promise}
  <div style="padding: {padding}px; color: {'#ffffff'}"></div>
{:then value}
  <div style="padding: {padding}px; color: {'#ffffff'}"></div>
{:catch error}
  <div style="padding: {padding}px; color: {'#ffffff'}"></div>
{/await}
