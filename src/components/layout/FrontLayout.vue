<template>
    <div>
      <header>前台布局</header>
      <main>
        <slot />
      </main>
      <footer>前台底部</footer>
    </div>
  </template>
  
  <script>
  export default {
    name: 'FrontLayout'
  }
  </script>
  
  <style scoped>
  /* 添加基本样式 */
  header, footer {
    background: #e0e0e0;
    padding: 1rem;
    text-align: center;
  }
  main {
    padding: 2rem;
  }
  </style>