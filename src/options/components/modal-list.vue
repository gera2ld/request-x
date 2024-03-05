<template>
  <VlModal :show="!!store.editList" @close="onListCancel" transition="fade">
    <form
      class="modal"
      v-if="store.editList"
      @submit.prevent="onListSave"
      ref="el"
    >
      <h3 class="font-bold mb-2" v-text="modalTitle" />
      <div
        class="modal-group"
        v-if="!store.editList.id && !store.editList.isSubscribed"
      >
        <div>Type:</div>
        <div class="flex">
          <label
            class="flex mr-4 items-center"
            v-for="type in ['request', 'cookie']"
            :key="type"
          >
            <input
              class="mr-1"
              type="radio"
              :value="type"
              v-model="store.editList.type"
            />
            {{ formatType(type) }}
          </label>
        </div>
      </div>
      <div class="modal-group" v-else>
        <div>
          Type:
          {{ formatType(store.editList.type ?? subscribeData.data?.type) }}
        </div>
      </div>
      <div class="modal-group" v-if="!store.editList.isSubscribed">
        <div>Name:</div>
        <input type="text" v-model="store.editList.name" />
      </div>
      <div class="modal-group" v-else>
        <div>
          Name:
          {{ subscribeData.data?.name }}
        </div>
      </div>
      <div class="modal-group" v-if="store.editList.isSubscribed">
        <div>Subscribe URL:</div>
        <input
          type="text"
          :class="{ error: errors.subscribeUrl }"
          v-model="store.editList.subscribeUrl"
        />
      </div>
      <div class="mt-1 text-right">
        <span class="mr-1 text-error" v-text="subscribeData.error"></span>
        <button
          class="mr-1"
          type="submit"
          :disabled="!canSubmit"
          v-text="subscribeData.loading ? 'Loading...' : 'OK'"
        ></button>
        <button @click.prevent="onListCancel">Cancel</button>
      </div>
    </form>
  </VlModal>
</template>

<script lang="ts" setup>
import { computed, ref, watch, watchEffect } from 'vue';
import { debounce, pick } from 'lodash-es';
import VlModal from 'vueleton/lib/modal';
import type { ListData } from '@/types';
import { fetchListData } from '@/common/list';
import { store } from '../store';
import { isValidURL } from '../util';
import { listActions } from '../actions';

const el = ref<Element>();
const subscribeData = ref<{
  session: number;
  loading: boolean;
  data?: Partial<ListData>;
  error?: string;
}>({
  session: 0,
  loading: false,
});

const modalTitle = computed(() => {
  if (!store.editList) return null;
  if (store.editList.isSubscribed) return 'Subscribe list';
  if (store.editList.id) return 'Edit list';
  return 'Create list';
});

const errors = computed(() => {
  const { editList } = store;
  return {
    subscribeUrl:
      editList?.isSubscribed &&
      editList.subscribeUrl &&
      !isValidURL(editList.subscribeUrl),
  };
});

const canSubmit = computed(() => {
  if (
    store.editList?.isSubscribed &&
    (subscribeData.value.error || !subscribeData.value.data)
  )
    return false;
  return !Object.values(errors.value).some(Boolean);
});

const onListCancel = () => {
  store.editList = undefined;
};

const onListSave = () => {
  if (!canSubmit.value) return;
  listActions.save([
    store.editList?.isSubscribed
      ? ({
          ...subscribeData.value.data,
          ...pick(store.editList, ['id', 'subscribeUrl']),
        } as Partial<ListData>)
      : pick(store.editList, ['id', 'name', 'type']),
  ]);
  onListCancel();
};

const formatType = (type?: string) =>
  type && type[0].toUpperCase() + type.slice(1);

const resetSubscribedData = () => {
  const { value } = subscribeData;
  value.data = undefined;
  value.error = undefined;
};

const fetchData = debounce(async () => {
  if (
    !store.editList?.isSubscribed ||
    errors.value.subscribeUrl ||
    !store.editList.subscribeUrl
  )
    return;
  const { value } = subscribeData;
  const session = value.session + 1;
  value.session = session;
  value.loading = true;
  try {
    if (session !== value.session) return;
    const data = await fetchListData(store.editList.subscribeUrl);
    value.data = data;
    if (!['request', 'cookie'].includes(data.type || '')) {
      value.error = 'Invalid list type';
    } else if (store.editList.type && store.editList.type !== data.type) {
      value.error = 'Type mismatch';
    }
  } catch {
    value.error ||= 'Fail to load data';
  }
  value.loading = false;
}, 200);

watch(
  () => store.editList?.subscribeUrl,
  () => {
    resetSubscribedData();
    fetchData();
  },
);

watchEffect(
  () => {
    if (store.editList && el.value) {
      const input = el.value.querySelector(
        'input[type=text]',
      ) as HTMLInputElement;
      input.focus();
    }
  },
  { flush: 'post' },
);
</script>
