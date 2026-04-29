<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { KbSysConfigVo } from '#/api/kb/config/model';

import { ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message, Popconfirm, Space } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { configList, configRemove } from '#/api/kb/config';

import { columns, querySchema } from './data';
import ConfigModal from './modal.vue';

const loading = ref(false);

const formOptions: VbenFormProps = {
  commonConfig: {
    labelWidth: 80,
    componentProps: {
      allowClear: true,
    },
  },
  schema: querySchema(),
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
};

const gridOptions: VxeGridProps = {
  columns,
  height: 'auto',
  keepSource: true,
  rowConfig: {
    keyField: 'configId',
  },
  sortConfig: {
    remote: false,
    multiple: true,
  },
  id: 'kb-config-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

/** 加载数据 */
async function loadData(formValues: Record<string, any> = {}) {
  loading.value = true;
  try {
    const data = await configList();
    let filtered: KbSysConfigVo[] = (data as any)?.data || data || [];
    if (formValues.itemName) {
      filtered = filtered.filter((item) =>
        item.itemName.includes(formValues.itemName),
      );
    }
    if (formValues.itemCode) {
      filtered = filtered.filter((item) =>
        item.itemCode.includes(formValues.itemCode),
      );
    }
    if (formValues.status !== undefined && formValues.status !== null) {
      filtered = filtered.filter((item) => item.status === formValues.status);
    }
    tableApi.grid.loadData(filtered);
  } catch (e) {
    console.error('加载失败:', e);
  } finally {
    loading.value = false;
  }
}

/** 搜索 */
async function handleQuery() {
  const formValues = await tableApi.formApi.getValues();
  await loadData(formValues);
}

/** 重置 */
async function handleReset() {
  await tableApi.formApi.resetForm();
  await loadData();
}

loadData();

const [ModalComponent, modalApi] = useVbenModal({
  connectedComponent: ConfigModal,
});

/** 新增 */
function handleAdd() {
  modalApi.setData({});
  modalApi.open();
}

/** 编辑 */
function handleEdit(record: KbSysConfigVo) {
  modalApi.setData({ record });
  modalApi.open();
}

/** 删除 */
async function handleDelete(row: KbSysConfigVo) {
  try {
    await configRemove(row.configId);
    message.success('删除成功');
    await handleQuery();
  } catch (e: any) {
    message.error(e?.message || '删除失败');
  }
}
</script>

<template>
  <Page :auto-content-height="true">
    <BasicTable :loading="loading">
      <template #toolbar-actions>
        <Space>
          <a-button
            type="primary"
            v-access:code="['kb:config:add']"
            @click="handleAdd"
          >
            {{ $t('pages.common.add') }}
          </a-button>
        </Space>
      </template>
      <template #action="{ row }">
        <Space>
          <action-button
            v-access:code="['kb:config:edit']"
            @click.stop="handleEdit(row)"
          >
            {{ $t('pages.common.edit') }}
          </action-button>
          <Popconfirm
            placement="left"
            title="确认删除该配置？"
            @confirm="handleDelete(row)"
          >
            <action-button
              danger
              v-access:code="['kb:config:remove']"
              @click.stop=""
            >
              {{ $t('pages.common.delete') }}
            </action-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>
    <ModalComponent @reload="handleQuery()" />
  </Page>
</template>
