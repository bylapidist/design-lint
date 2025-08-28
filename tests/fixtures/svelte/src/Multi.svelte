<script context="module" lang="ts">
  const token = 'old-token';
</script>

<script lang="ts">
  const color = '#ffffff';
  const padding = 5;
</script>

<style>
  .container {
    color: #ffffff;
    margin: 5px;
    font-size: 13px;
    font-family: Courier;
    background: old-token;
  }
</style>

<div class="container" style="padding: {padding}px">
  Hello
  <button>Click</button>
  <OldComponent />
</div>
