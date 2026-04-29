<script setup lang="ts">
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { cloneDeep } from '@vben/utils';

import { useVbenForm } from '#/adapter/form';
import {
  categoryAdd,
  categoryUpdate,
} from '#/api/media/direction';
import type { MediaTagVo } from '#/api/media/direction/model';
import { defaultFormValueGetter, useBeforeCloseDiff } from '#/utils/popup';

import { modalSchema } from './data';

const emit = defineEmits<{ reload: [] }>();

const isUpdate = ref(false);
const title = computed(() => {
  return isUpdate.value ? $t('pages.common.edit') : $t('pages.common.add');
});

const [BasicForm, formApi] = useVbenForm({
  layout: 'horizontal',
  commonConfig: {
    labelWidth: 80,
  },
  schema: modalSchema(),
  showDefaultActions: false,
});

const { onBeforeClose, markInitialized, resetInitialized } = useBeforeCloseDiff(
  {
    initializedGetter: defaultFormValueGetter(formApi),
    currentGetter: defaultFormValueGetter(formApi),
  },
);

const [BasicModal, modalApi] = useVbenModal({
  fullscreenButton: false,
  onBeforeClose,
  onClosed: handleClosed,
  onConfirm: handleConfirm,
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      return null;
    }
    modalApi.modalLoading(true);

    const data = modalApi.getData() as { record?: MediaTagVo; parentId?: number };
    isUpdate.value = !!data?.record?.tagId;
    if (isUpdate.value && data?.record) {
      await formApi.setValues({
        tagId: data.record.tagId,
        parentId: data.record.parentId || 0,
        tagName: data.record.tagName,
        sortOrder: data.record.sortOrder,
        status: data.record.status,
      });
    } else {
      // 新增时设置 parentId（新增子分类）
      await formApi.setValues({
        parentId: data?.parentId || 0,
      });
    }
    await markInitialized();

    modalApi.modalLoading(false);
  },
});

async function handleConfirm() {
  try {
    modalApi.lock(true);
    const { valid } = await formApi.validate();
    if (!valid) {
      return;
    }
    const data = cloneDeep(await formApi.getValues());
    if (isUpdate.value) {
      await categoryUpdate(data);
    } else {
      await categoryAdd(data);
    }
    resetInitialized();
    emit('reload');
    modalApi.close();
  } catch (error) {
    console.error(error);
  } finally {
    modalApi.lock(false);
  }
}

async function handleClosed() {
  await formApi.resetForm();
  resetInitialized();
}
</script>

<template>
  <BasicModal :title="title">
    <BasicForm />
  </BasicModal>
</template>