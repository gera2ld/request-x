declare module '*.vue' {
  import { defineComponent } from 'vue';
  const Component: ReturnType<typeof defineComponent>;
  export default Component;
}

declare module 'vueleton/lib/dropdown';
declare module 'vueleton/lib/modal';
