<template>
  <div id="app" class="flex flex-col h-100">
    <header class="flex flex-center">
      <img src="/public/images/icon48.png">
      <h2 class="flex-auto">Request Blocker</h2>
      <div>&copy; Gerald</div>
    </header>
    <div class="flex flex-auto">
      <rule-body class="flex-auto"></rule-body>
      <rule-nav></rule-nav>
    </div>
    <footer>
      Links:
      <a href="https://github.com/gera2ld/request-blocker" target="_blank">GitHub</a>
      |
      <a href="https://github.com/gera2ld/request-blocker/issues" target="_blank">Feedback</a>
    </footer>
  </div>
</template>

<script>
import RuleNav from './rule-nav';
import RuleBody from './rule-body';

export default {
  components: {
    RuleNav,
    RuleBody,
  },
};
</script>

<style>
#app {
  max-width: 60rem;
  max-height: 50rem;
  margin: 0 auto;
  > .flex-auto {
    margin: 1rem 0;
  }
  > header {
    > img {
      margin-right: 1rem;
    }
  }
  > footer {
    margin-top: .5rem;
    text-align: center;
  }
}
</style>
