<template>
  <div ref="refCode"></div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { EditorView, basicSetup } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { EditorState, Compartment } from '@codemirror/state';
import { indentWithTab } from '@codemirror/commands';
import type { LanguageSupport } from '@codemirror/language';
import { keymap } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';

const model = defineModel<string>();
const props = defineProps<{
  lang?: string;
  readonly?: boolean;
  contentType?: string;
}>();

const langExtMap: Record<string, () => LanguageSupport> = {
  json,
  html,
};

const refCode = ref<HTMLElement>();

let view: EditorView | undefined;
let lastState: EditorState | undefined;

const langExtComp = new Compartment();
const themeComp = new Compartment();

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
        if (!update.docChanged || update.view !== view) return;
        lastState = view.state;
        model.value = view.state.doc.toString();
      }),
    ],
    parent: refCode.value,
  });
});
</script>
