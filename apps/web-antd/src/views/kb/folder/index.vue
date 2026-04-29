<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { PageQuery } from '#/api/common';
import type { KbFolderVo } from '#/api/kb/folder/model';

import { nextTick, ref } from 'vue';
import { Page, useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message, Popconfirm, Space } from 'antdv-next';

import { addSortParams, useVbenVxeGrid } from '#/adapter/vxe-table';
import { folderList, folderRemove, folderLazyTree } from '#/api/kb/folder';

import { columns, querySchema } from './data';
import FolderModal from './modal.vue';

const viewMode = ref<'list' | 'tree'>('tree');

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
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page, sorts }, formValues = {}) => {
        if (viewMode.value === 'tree') {
          const treeData = await folderLazyTree(0);
          const data = (treeData as any)?.data || treeData || [];
          return { rows: data, total: data.length };
        }
        const params: PageQuery = {
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
        };
        addSortParams(params, sorts);
        return await folderList(params);
      },
    },
  },
  treeConfig: {
    transform: false,
    rowField: 'folderId',
    parentField: 'parentId',
    lazy: true,
    hasChild: 'hasChildren',
    loadMethod: async ({ row }) => {
      const res = await folderLazyTree(row.folderId);
      return (res as any)?.data || res || [];
    },
  },
  rowConfig: {
    keyField: 'folderId',
  },
  sortConfig: {
    remote: true,
    multiple: true,
  },
  id: 'kb-folder-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
  gridEvents: {
    sortChange: () => tableApi.query(),
  },
});

const [ModalComponent, modalApi] = useVbenModal({
  connectedComponent: FolderModal,
});

/** 切换视图模式 */
async function toggleMode() {
  viewMode.value = viewMode.value === 'tree' ? 'list' : 'tree';
  await tableApi.query();
}

/**
 * 递归查找指定 folderId 的行
 * 懒加载模式下，子节点挂在 parentRow.children 上，需要深度遍历
 */
function findRowById(folderId: number): any | null {
  const stack: any[] = [...(tableApi.grid.getData() as any[])];
  while (stack.length > 0) {
    const r = stack.pop();
    if (!r) continue;
    if (r.folderId === folderId) return r;
    if (Array.isArray(r.children) && r.children.length > 0) {
      stack.push(...r.children);
    }
  }
  return null;
}

/**
 * 精准刷新某个父节点下的一层子目录
 * 关键：不重建整棵树，只重新加载该 parentRow 的 children，
 * 其他已展开层级完全不受影响
 */
async function reloadChildrenBranch(parentRow: any): Promise<void> {
  const grid = tableApi.grid;
  const wasExpanded = grid.isTreeExpandByRow(parentRow);

  // 清除该节点的懒加载缓存，保证下次展开会重新调用 loadMethod
  if (typeof (grid as any).clearTreeExpandLoaded === 'function') {
    await (grid as any).clearTreeExpandLoaded(parentRow);
  }

  if (wasExpanded) {
    // 已展开：先折叠再展开，强制触发 loadMethod 重新拉取该层子列表
    await grid.setTreeExpand(parentRow, false);
    await nextTick();
    await grid.setTreeExpand(parentRow, true);
  } else {
    // 未展开：仅更新 hasChildren 标记，保证展开图标正确显示
    const res = await folderLazyTree(parentRow.folderId);
    const children = (res as any)?.data || res || [];
    parentRow.hasChildren = children.length > 0;
  }
}

/**
 * 精准刷新根层级：对根行做增量 insert/remove
 * 不调用 reloadData，避免整棵树的展开状态丢失
 */
async function reloadRootLevel(): Promise<void> {
  const grid = tableApi.grid;
  const res = await folderLazyTree(0);
  const latest = ((res as any)?.data || res || []) as any[];
  const current = grid.getData() as any[];

  const latestIdSet = new Set(latest.map((r) => r.folderId));
  const currentIdSet = new Set(current.map((r) => r.folderId));

  // 删除：当前存在但最新已不存在
  const toRemove = current.filter((r) => !latestIdSet.has(r.folderId));
  if (toRemove.length > 0) {
    await grid.remove(toRemove);
  }

  // 新增：最新存在但当前不存在
  const toAdd = latest.filter((r) => !currentIdSet.has(r.folderId));
  if (toAdd.length > 0) {
    await grid.insert(toAdd);
  }

  // 同步已存在行的字段（避免排序号/状态等字段不同步）
  for (const row of current) {
    const latestRow = latest.find((r) => r.folderId === row.folderId);
    if (latestRow) {
      const preservedChildren = row.children;
      const preservedHasChildren = row.hasChildren;
      Object.assign(row, latestRow, {
        children: preservedChildren,
        hasChildren: preservedHasChildren,
      });
    }
  }
}

/**
 * 统一入口：根据操作类型分发刷新策略
 *
 * 编辑      → 就地更新行数据，完全不碰树结构
 * 新增子目录 → 只刷新父节点的一层 children
 * 新增根目录 → 根层级做增量 insert
 * 删除      → 同上，按 parentId 定向刷新对应分支
 */
async function handleReload(
  parentId: number,
  op: 'add' | 'update' = 'add',
  updatedRow?: any,
) {
  // 编辑：就地更新，不触发任何树结构变更
  if (op === 'update' && updatedRow) {
    const target = findRowById(updatedRow.folderId);
    if (target) {
      const preservedChildren = target.children;
      const preservedHasChildren = target.hasChildren;
      Object.assign(target, updatedRow, {
        children: preservedChildren,
        hasChildren: preservedHasChildren,
      });
      tableApi.grid.updateData();
    }
    return;
  }

  // 新增 / 删除
  if (!parentId || parentId === 0) {
    // 根层级变更
    await reloadRootLevel();
    return;
  }

  // 子层级变更：定位父节点，只刷新该分支
  const parentRow = findRowById(parentId);
  if (parentRow) {
    await reloadChildrenBranch(parentRow);
  }
  // 父节点不在当前视图（比如其祖先节点尚未展开），无需更新 UI，
  // 用户展开到该层时会自然触发 loadMethod 拿到最新数据
}

/** 新增根目录 */
function handleAdd() {
  modalApi.setData({ parentId: 0 });
  modalApi.open();
}

/** 新增子目录 */
function handleAddChild(row: KbFolderVo) {
  modalApi.setData({ parentId: row.folderId });
  modalApi.open();
}

/** 编辑目录 */
function handleEdit(record: KbFolderVo) {
  modalApi.setData({ record });
  modalApi.open();
}

/** 删除目录 */
async function handleDelete(row: KbFolderVo) {
  try {
    await folderRemove(row.folderId);
    message.success('删除成功');
    await handleReload(row.parentId ?? 0);
  } catch (e: any) {
    message.error(e?.message || '删除失败');
  }
}
</script>

<template>
  <Page :auto-content-height="true">
    <BasicTable>
      <template #toolbar-actions>
        <Space>
          <a-button
            type="primary"
            v-access:code="['kb:folder:add']"
            @click="handleAdd"
          >
            {{ $t('pages.common.add') }}
          </a-button>
        </Space>
      </template>
      <template #toolbar-tools>
        <a-tooltip :title="viewMode === 'tree' ? '切换到列表' : '切换到树状'">
          <a-button size="small" @click="toggleMode">
            <i v-if="viewMode === 'tree'" class="fa-solid fa-table-list" style="font-size: 14px;"></i>
            <i v-else class="fa-solid fa-sitemap" style="font-size: 14px;"></i>
          </a-button>
        </a-tooltip>
      </template>
      <template #action="{ row }">
        <Space>
          <action-button
            v-access:code="['kb:folder:add']"
            @click.stop="handleAddChild(row)"
          >
            新增子目录
          </action-button>
          <action-button
            v-access:code="['kb:folder:edit']"
            @click.stop="handleEdit(row)"
          >
            {{ $t('pages.common.edit') }}
          </action-button>
          <Popconfirm
            placement="left"
            title="确认删除该目录？"
            @confirm="handleDelete(row)"
          >
            <action-button
              danger
              v-access:code="['kb:folder:remove']"
              @click.stop=""
            >
              {{ $t('pages.common.delete') }}
            </action-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>
    <ModalComponent @reload="handleReload" />
  </Page>
</template>
