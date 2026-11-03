<template>
    <div>
      <header>管理员布局</header>
      <main>
        <slot />
      </main>
      <footer>管理员底部</footer>
    </div>
  </template>
  
  <script>
  export default {
    name: 'AdminLayout'
  }
  </script>
  
  <style scoped>
  /* 添加基本样式 */
  header, footer {
    background: #f0f0f0;
    padding: 1rem;
    text-align: center;
  }
  main {
    padding: 2rem;
  }
  </style>