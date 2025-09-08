<script setup lang="ts">
const color = '#ffffff';
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

<style scoped>
.container {
  color: #ffffff;
  margin: 5px;
  font-size: 13px;
  font-family: Courier;
  background: old-token;
}
</style>
