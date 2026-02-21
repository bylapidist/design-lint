<template>
  <div
    :style="{ color: '#ffffff', padding: '5px' }"
  >
    object
  </div>
  <div :style="[{ color: '#fafafa' }, { margin: '6px' }]">array</div>
  <div
    :style="[
      {
        color: '#f5f5f5',
        padding: '7px',
      },
      {
        margin: '8px',
      },
    ]"
  >
    multiline
  </div>
  <div v-bind:style="computedStyles ? { color: '#f0f0f0' } : { margin: '9px' }">
    computed
  </div>
</template>

<script setup lang="ts">
const computedStyles = true;
</script>
