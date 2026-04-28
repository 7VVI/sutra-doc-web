<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { MediaTagVo } from '#/api/media/direction/model';

import { ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Popconfirm, Space } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { directionList, directionRemove } from '#/api/media/direction';

import { columns, querySchema } from './data';
import DirectionModal from './modal.vue';

// 数据列表
const dataList = ref<MediaTagVo[]>([]);
const loading = ref(false);

const formOptions: VbenFormProps = {
  commonConfig: {
    labelWidth: 60,
    componentProps: {
      allowClear: true,
    },
  },
  schema: querySchema(),
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
};

const gridOptions: VxeGridProps = {
  columns,
  height: 'auto',
  keepSource: true,
  pagerConfig: {
    enabled: true,
  },
  rowConfig: {
    keyField: 'tagId',
  },
  id: 'media-direction-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

// 加载数据
async function loadData(formValues = {}) {
  loading.value = true;
  try {
    const data = await directionList();
    // 过滤数据
    let filtered = data || [];
    if (formValues.tagName) {
      filtered = filtered.filter(item => item.tagName.includes(formValues.tagName));
    }
    if (formValues.status !== undefined && formValues.status !== null) {
      filtered = filtered.filter(item => item.status === formValues.status);
    }
    dataList.value = filtered;
    // 更新表格数据（使用分页）
    tableApi.grid.loadData(filtered);
  } catch (e) {
    console.error('加载失败:', e);
  } finally {
    loading.value = false;
  }
}

// 搜索
async function handleQuery() {
  const formValues = await tableApi.formApi.getValues();
  await loadData(formValues);
}

// 重置
async function handleReset() {
  await tableApi.formApi.resetForm();
  await loadData();
}

// 初始化加载
loadData();

const [Modal, modalApi] = useVbenModal({
  connectedComponent: DirectionModal,
});

/** 新增 */
function handleAdd() {
  modalApi.setData({});
  modalApi.open();
}

/** 编辑 */
function handleEdit(record: MediaTagVo) {
  modalApi.setData({ record });
  modalApi.open();
}

/** 删除 */
async function handleDelete(row: MediaTagVo) {
  await directionRemove(row.tagId);
  const formValues = await tableApi.formApi.getValues();
  await loadData(formValues);
}
</script>

<template>
  <Page :auto-content-height="true">
    <BasicTable :loading="loading">
      <template #toolbar-actions>
        <Space>
          <a-button @click="handleReset">重置</a-button>
          <a-button type="primary" @click="handleQuery">查询</a-button>
          <a-button
            type="primary"
            v-access:code="['media:tag:add']"
            @click="handleAdd"
          >
            {{ $t('pages.common.add') }}
          </a-button>
        </Space>
      </template>
      <template #action="{ row }">
        <Space>
          <action-button
            v-access:code="['media:tag:edit']"
            @click.stop="handleEdit(row)"
          >
            {{ $t('pages.common.edit') }}
          </action-button>
          <Popconfirm
            placement="left"
            title="确认删除？"
            @confirm="handleDelete(row)"
          >
            <action-button
              danger
              v-access:code="['media:tag:remove']"
              @click.stop=""
            >
              {{ $t('pages.common.delete') }}
            </action-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>
    <Modal @reload="handleQuery()" />
  </Page>
</template>