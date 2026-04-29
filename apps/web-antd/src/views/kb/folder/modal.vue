<script setup lang="ts">
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { cloneDeep } from '@vben/utils';

import { useVbenForm } from '#/adapter/form';
import { folderDetail } from '#/api/kb/folder';
import { folderAdd, folderUpdate } from '#/api/kb/folder';
import type { KbFolderVo } from '#/api/kb/folder/model';
import { defaultFormValueGetter, useBeforeCloseDiff } from '#/utils/popup';

import { modalSchema } from './data';

const emit = defineEmits<{ reload: [parentId: number, op: 'add' | 'update', row?: any] }>();

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
    if (!isOpen) return null;
    modalApi.modalLoading(true);

    const data = modalApi.getData() as {
      record?: KbFolderVo;
      parentId?: number;
    };
    isUpdate.value = !!data?.record?.folderId;

    if (isUpdate.value && data?.record) {
      try {
        const detail = await folderDetail(data.record.folderId);
        const doc = (detail as any)?.data || detail;
        await formApi.setValues({
          folderId: doc.folderId,
          parentId: doc.parentId,
          folderName: doc.folderName,
          folderCode: doc.folderCode,
          sortOrder: doc.sortOrder,
          status: doc.status,
          description: doc.description,
        });
      } catch (e) {
        console.error('获取目录详情失败:', e);
        await formApi.setValues({
          folderId: data.record.folderId,
          parentId: data.record.parentId,
          folderName: data.record.folderName,
          folderCode: data.record.folderCode,
          sortOrder: data.record.sortOrder,
          status: data.record.status,
          description: data.record.description,
        });
      }
    } else {
      // 新增：设置 parentId
      await formApi.setValues({
        parentId: data?.parentId ?? 0,
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
    if (!valid) return;
    const data = cloneDeep(await formApi.getValues());
    if (isUpdate.value) {
      await folderUpdate(data);
      // 编辑：传递操作类型 'update' 和更新后的行数据
      emit('reload', data.parentId ?? 0, 'update', {
        folderId: data.folderId,
        parentId: data.parentId,
        folderName: data.folderName,
        folderCode: data.folderCode,
        sortOrder: data.sortOrder,
        status: data.status,
        description: data.description,
      });
    } else {
      await folderAdd(data);
      // 新增：传递 parentId 让父节点重新加载子列表
      emit('reload', data.parentId ?? 0, 'add');
    }
    resetInitialized();
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
