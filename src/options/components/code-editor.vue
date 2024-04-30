<template>
  <div ref="refCode" :class="{ 'child-error': hasError }"></div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { EditorView, basicSetup } from 'codemirror';
import { linter, lintGutter, diagnosticCount } from '@codemirror/lint';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { EditorState, Compartment, Extension } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import { keymap } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';

const model = defineModel<string>();
const props = defineProps<{
  lang?: string;
  readonly?: boolean;
  contentType?: string;
}>();

const langExtMap: Record<string, () => Extension[]> = {
  json: () => [json(), linter(jsonParseLinter()), lintGutter()],
  html: () => [html()],
};

const refCode = ref<HTMLElement>();

let view: EditorView | undefined;
let lastState: EditorState | undefined;

const langExtComp = new Compartment();
const themeComp = new Compartment();

const hasError = ref(false);
const langExt = computed(() => langExtMap[props.lang || '']?.() || []);

const result = window.matchMedia('(prefers-color-scheme: dark');
const isDark = ref(result.matches);
result.addEventListener('change', (e) => {
  isDark.value = e.matches;
});

watch(langExt, (ext) => {
  view?.dispatch({
    effects: langExtComp.reconfigure(ext),
  });
});

watch(isDark, (dark) => {
  view?.dispatch({
    effects: themeComp.reconfigure(dark ? oneDark : []),
  });
});

watch(model, (value) => {
  if (!view || view.state === lastState) return;
  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: value,
    },
  });
});

onMounted(() => {
  view = new EditorView({
    doc: model.value || '',
    extensions: [
      basicSetup,
      keymap.of([indentWithTab]),
      EditorState.readOnly.of(props.readonly),
      langExtComp.of(langExt.value),
      themeComp.of(isDark.value ? oneDark : []),
      EditorView.updateListener.of((update) => {
        hasError.value = diagnosticCount(update.view.state) > 0;
        if (!update.docChanged) return;
        lastState = update.view.state;
        model.value = update.view.state.doc.toString();
      }),
    ],
    parent: refCode.value,
  });
});
</script>
