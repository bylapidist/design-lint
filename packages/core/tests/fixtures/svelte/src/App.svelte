<script lang="ts">
  const padding = 4;
  const token = 'old-token';
</script>

<style>
  .container {
    font-size: 13px;
    font-family: Courier;
    background: old-token;
  }
</style>

<div
  class="container"
  style="padding: {padding}px; margin: {5}px; color: {'#ffffff'}"
>
  Hello
  <button>Click</button>
  <OldComponent />
</div>
