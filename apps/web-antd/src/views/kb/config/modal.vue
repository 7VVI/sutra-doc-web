<script setup lang="ts">
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { cloneDeep } from '@vben/utils';

import { useVbenForm } from '#/adapter/form';
import { configDetail, configAdd, configUpdate } from '#/api/kb/config';
import type { KbSysConfigVo } from '#/api/kb/config/model';
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

const { onBeforeClose, markInitialized, resetInitialized } =
  useBeforeCloseDiff({
    initializedGetter: defaultFormValueGetter(formApi),
    currentGetter: defaultFormValueGetter(formApi),
  });

const [BasicModal, modalApi] = useVbenModal({
  fullscreenButton: false,
  onBeforeClose,
  onClosed: handleClosed,
  onConfirm: handleConfirm,
  onOpenChange: async (isOpen) => {
    if (!isOpen) return null;
    modalApi.modalLoading(true);

    const data = modalApi.getData() as { record?: KbSysConfigVo };
    isUpdate.value = !!data?.record?.configId;

    if (isUpdate.value && data?.record) {
      try {
        const detail = await configDetail(data.record.configId);
        const doc = (detail as any)?.data || detail;
        await formApi.setValues({
          configId: doc.configId,
          itemCode: doc.itemCode,
          itemName: doc.itemName,
          itemValue: doc.itemValue,
          valueType: doc.valueType,
          itemGroup: doc.itemGroup,
          sortOrder: doc.sortOrder,
          status: doc.status,
          remark: doc.remark,
        });
      } catch {
        await formApi.setValues({
          configId: data.record.configId,
          itemCode: data.record.itemCode,
          itemName: data.record.itemName,
          itemValue: data.record.itemValue,
          valueType: data.record.valueType,
          itemGroup: data.record.itemGroup,
          sortOrder: data.record.sortOrder,
          status: data.record.status,
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
    const data = cloneDeep(await formApi.getValues());
    if (isUpdate.value) {
      await configUpdate(data);
    } else {
      await configAdd(data);
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
