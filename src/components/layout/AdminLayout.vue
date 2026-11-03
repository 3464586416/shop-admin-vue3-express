<template>
  <div class="admin-layout">
    <slot />
  </div>
</template>

<script>
export default {
  name: 'AdminLayout'
}
</script>

<style scoped>
.admin-layout {
  min-height: 100vh;
}
</style>
