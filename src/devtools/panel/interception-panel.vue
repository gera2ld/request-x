<template>
  <div class="panel">
    <div class="panel-close" @click="onClose">&cross;</div>
    <section>
      <div class="section-title">General</div>
      <div class="section-body">
        <div>
          <span class="entry-label">Request URL:</span>
          <span v-text="store.active.url"></span>
        </div>
        <div>
          <span class="entry-label">Request Method:</span>
          <span v-text="store.active.method"></span>
        </div>
      </div>
    </section>
    <section>
      <div class="section-title">Actions</div>
      <div class="section-body">
        <div class="action" v-for="(action, i) in actions" :key="i">
          <div>
            <span class="entry-label">Type:</span>
            <span v-text="action.typeText"></span>
          </div>
          <template v-if="action.type === 'redirect'">
            <div>
              <span class="entry-label">Target URL:</span>
              <span v-text="action.redirectUrl"></span>
            </div>
          </template>
          <template v-if="action.type === 'headers'">
            <div
              class="text-red-500"
              v-for="(header, j) in action.headers?.removed"
              :key="j"
            >
              - {{ header.name }}: {{ header.value }}
            </div>
            <div
              class="text-green-500"
              v-for="(header, j) in action.headers?.added"
              :key="j"
            >
              + {{ header.name }}: {{ header.value }}
            </div>
          </template>
        </div>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue';
import { store } from './util';

export default defineComponent({
  setup() {
    const actions = computed(() => {
      const { result } = store.active;
      const actions = [
        result.cancel && {
          type: 'block',
          typeText: 'Block',
        },
        result.redirectUrl && {
          type: 'redirect',
          typeText: 'Redirect',
          redirectUrl: result.redirectUrl,
        },
        result.requestHeaders && {
          type: 'headers',
          typeText: 'Modify request headers',
          headers: result.payload?.requestHeaders,
        },
        result.responseHeaders && {
          type: 'headers',
          typeText: 'Modify response headers',
          headers: result.payload?.responseHeaders,
        },
      ].filter(Boolean);
      return actions;
    });

    const onClose = () => {
      store.active = null;
    };

    return {
      store,
      actions,
      onClose,
    };
  },
});
</script>
