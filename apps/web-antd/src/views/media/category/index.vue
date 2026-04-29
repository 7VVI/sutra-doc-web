<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { MediaTagVo } from '#/api/media/direction/model';

import { ref, nextTick } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Popconfirm, Space } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { categoryList, categoryRemove } from '#/api/media/direction';

import { columns, querySchema } from './data';
import CategoryModal from './modal.vue';

const loading = ref(false);
// 当前展开的 tagId 集合
const expandedIds = ref<Set<number>>(new Set());

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
    enabled: false,
  },
  rowConfig: {
    keyField: 'tagId',
  },
  treeConfig: {
    parentField: 'parentId',
    rowField: 'tagId',
    transform: true,
  },
  id: 'media-category-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
  gridEvents: {
    toggleTreeExpand: (e: any) => {
      const { row, expanded } = e;
      if (expanded) {
        expandedIds.value.add(row.tagId);
      } else {
        expandedIds.value.delete(row.tagId);
      }
    },
  },
});

// 收集当前所有展开行的 tagId
function snapshotExpandedIds() {
  const grid = tableApi.grid;
  const ids = new Set<number>();
  const records = grid.getData() as any[];
  for (const row of records) {
    if (grid.isTreeExpandByRow(row)) {
      ids.add(row.tagId);
    }
  }
  expandedIds.value = ids;
}

// 加载数据后恢复展开
async function loadData(formValues: Record<string, any> = {}, restoreExpand = true) {
  loading.value = true;
  try {
    // 先拍快照
    if (restoreExpand) {
      snapshotExpandedIds();
    }

    const data = await categoryList();
    let filtered: any[] = data || [];
    if (formValues.tagName) {
      filtered = filtered.filter(item => item.tagName.includes(formValues.tagName));
    }
    if (formValues.status !== undefined && formValues.status !== null) {
      filtered = filtered.filter(item => item.status === formValues.status);
    }
    tableApi.grid.loadData(filtered);

    // 等 DOM 更新后恢复展开
    await nextTick();
    if (restoreExpand && expandedIds.value.size > 0) {
      const grid = tableApi.grid;
      const records = grid.getData() as any[];
      for (const row of records) {
        if (expandedIds.value.has(row.tagId)) {
          grid.setTreeExpand(row, true);
        }
      }
    }
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

// 初始化加载 - 全部展开
async function initialLoad() {
  loading.value = true;
  try {
    const data = await categoryList();
    tableApi.grid.loadData(data || []);
    await nextTick();
    tableApi.grid.setAllTreeExpand(true);
    // 记录初始展开
    snapshotExpandedIds();
  } catch (e) {
    console.error('加载失败:', e);
  } finally {
    loading.value = false;
  }
}
initialLoad();

const [Modal, modalApi] = useVbenModal({
  connectedComponent: CategoryModal,
});

/** 新增 */
function handleAdd() {
  modalApi.setData({});
  modalApi.open();
}

/** 新增子分类 */
function handleAddChild(row: MediaTagVo) {
  modalApi.setData({ parentId: row.tagId });
  modalApi.open();
}

/** 编辑 */
function handleEdit(record: MediaTagVo) {
  modalApi.setData({ record });
  modalApi.open();
}

/** 删除 */
async function handleDelete(row: MediaTagVo) {
  await categoryRemove(row.tagId);
  await loadData();
}

/** 弹窗关闭后刷新 - 保持展开状态 */
async function handleReload() {
  await loadData();
}
</script>

<template>
  <Page :auto-content-height="true">
    <BasicTable :loading="loading">
      <template #toolbar-actions>
        <Space>
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
            v-access:code="['media:tag:add']"
            @click.stop="handleAddChild(row)"
          >
            新增子分类
          </action-button>
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
    <Modal @reload="handleReload()" />
  </Page>
</template>