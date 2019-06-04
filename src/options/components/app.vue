<template>
  <div id="app" class="flex flex-col h-100">
    <div class="flex flex-auto">
      <rule-body class="flex-auto"></rule-body>
      <rule-nav></rule-nav>
    </div>
    <footer class="flex">
      <div class="flex-auto">&copy; Gerald</div>
      <div>
        Links:
        <a href="https://github.com/gera2ld/request-blocker" target="_blank">GitHub</a>
        |
        <a href="https://github.com/gera2ld/request-blocker/issues" target="_blank">Feedback</a>
      </div>
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
  max-height: 50rem;
  margin: 0 auto;
  > header {
    > img {
      margin-right: 1rem;
    }
  }
  > footer {
    margin-top: .5rem;
  }
}
</style>
