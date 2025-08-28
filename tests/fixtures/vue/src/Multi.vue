<script lang="ts">
const color = '#ffffff';
</script>
<script setup lang="ts">
const padding = 5;
const token = 'old-token';
</script>

<template>
  <div class="container" :style="{ padding: padding + 'px' }">
    Hello
    <button>Click</button>
    <OldComponent />
  </div>
</template>

<style>
.container {
  color: #ffffff;
}
</style>
<style scoped>
.container {
  margin: 5px;
  font-size: 13px;
  font-family: Courier;
  background: old-token;
}
</style>
