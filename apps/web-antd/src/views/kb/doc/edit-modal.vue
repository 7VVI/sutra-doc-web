<script setup lang="ts">
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { useVbenForm } from '#/adapter/form';
import { docDetail, docUpdate } from '#/api/kb/doc';
import type { KbDocVo } from '#/api/kb/doc/model';
import { defaultFormValueGetter, useBeforeCloseDiff } from '#/utils/popup';

import { editModalSchema } from './data';

const emit = defineEmits<{ reload: [] }>();

const isUpdate = ref(false);
const title = computed(() => {
  return isUpdate.value ? '编辑文档' : '新增文档';
});

const [BasicForm, formApi] = useVbenForm({
  layout: 'horizontal',
  commonConfig: {
    labelWidth: 80,
  },
  schema: editModalSchema(),
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
    if (!isOpen) return null;
    modalApi.modalLoading(true);

    const data = modalApi.getData() as { record?: KbDocVo };
    isUpdate.value = !!data?.record?.docId;
    if (isUpdate.value && data?.record) {
      try {
        const detail = await docDetail(data.record.docId);
        const doc = (detail as any)?.data || detail;
        await formApi.setValues({
          docId: doc.docId,
          docTitle: doc.docTitle,
          category: doc.category,
          keywords: doc.keywords,
          remark: doc.remark,
        });
      } catch (e) {
        console.error('获取文档详情失败:', e);
        await formApi.setValues({
          docId: data.record.docId,
          docTitle: data.record.docTitle,
          category: data.record.category,
          keywords: data.record.keywords,
          remark: data.record.remark,
        });
      }
    }
    await markInitialized();

    modalApi.modalLoading(false);
  },
});

async function handleConfirm() {
  try {
    modalApi.lock(true);
    const { valid } = await formApi.validate();
    if (!valid) return;
    const { cloneDeep } = await import('@vben/utils');
    const data = cloneDeep(await formApi.getValues());
    await docUpdate(data);
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
