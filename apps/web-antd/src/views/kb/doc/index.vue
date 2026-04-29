<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { PageQuery } from '#/api/common';
import type { KbDocVo } from '#/api/kb/doc/model';

import { Page, useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message, Popconfirm, Space } from 'antdv-next';

import { addSortParams, useVbenVxeGrid } from '#/adapter/vxe-table';
import { docList, docRemove, docPublish, docWithdraw } from '#/api/kb/doc';
import { downloadDoc } from '#/api/kb';

import { columns, querySchema } from './data';
import EditModal from './edit-modal.vue';
import UploadModal from './upload-modal.vue';

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
  resizableConfig: {
    // 拖拽列宽时保持表格整体宽度不变，相邻列自动补偿
    syncResize: true,
  },
  proxyConfig: {
    ajax: {
      query: async ({ page, sorts }, formValues = {}) => {
        const params: PageQuery = {
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
        };
        addSortParams(params, sorts);
        return await docList(params);
      },
    },
  },
  rowConfig: {
    keyField: 'docId',
  },
  sortConfig: {
    remote: true,
    multiple: true,
  },
  id: 'kb-doc-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
  gridEvents: {
    sortChange: () => tableApi.query(),
  },
});

const [EditModalComponent, editModalApi] = useVbenModal({
  connectedComponent: EditModal,
});

const [UploadModalComponent, uploadModalApi] = useVbenModal({
  connectedComponent: UploadModal,
});

/** 上传文档 */
function handleUpload() {
  uploadModalApi.setData({});
  uploadModalApi.open();
}

/** 编辑文档 */
function handleEdit(record: KbDocVo) {
  editModalApi.setData({ record });
  editModalApi.open();
}

/** 删除文档 */
async function handleDelete(row: KbDocVo) {
  await docRemove(row.docId);
  await tableApi.query();
}

/** 发布文档 */
async function handlePublish(row: KbDocVo) {
  await docPublish(row.docId);
  message.success('发布成功');
  await tableApi.query();
}

/** 撤回文档 */
async function handleWithdraw(row: KbDocVo) {
  await docWithdraw(row.docId);
  message.success('撤回成功');
  await tableApi.query();
}

/** 下载文档 */
async function handleDownload(row: KbDocVo) {
  try {
    await downloadDoc(row.docId, row.docName);
  } catch (e: any) {
    message.error(e?.message || '下载失败');
  }
}

/** 刷新列表 */
function handleReload() {
  tableApi.query();
}
</script>

<template>
  <Page :auto-content-height="true">
    <BasicTable>
      <template #toolbar-actions>
        <Space>
          <a-button
            type="primary"
            v-access:code="['kb:doc:add']"
            @click="handleUpload"
          >
            新增
          </a-button>
        </Space>
      </template>
      <template #action="{ row }">
        <Space>
          <action-button
            v-access:code="['kb:doc:download']"
            @click.stop="handleDownload(row)"
          >
            下载
          </action-button>
          <action-button
            v-if="row.status === 0 || row.status === 2"
            v-access:code="['kb:doc:edit']"
            @click.stop="handlePublish(row)"
          >
            发布
          </action-button>
          <action-button
            v-if="row.status === 1"
            v-access:code="['kb:doc:edit']"
            @click.stop="handleWithdraw(row)"
          >
            撤回
          </action-button>
          <action-button
            v-access:code="['kb:doc:edit']"
            @click.stop="handleEdit(row)"
          >
            {{ $t('pages.common.edit') }}
          </action-button>
          <Popconfirm
            placement="left"
            title="确认删除该文档？"
            @confirm="handleDelete(row)"
          >
            <action-button
              danger
              v-access:code="['kb:doc:remove']"
              @click.stop=""
            >
              {{ $t('pages.common.delete') }}
            </action-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>
    <EditModalComponent @reload="handleReload" />
    <UploadModalComponent @reload="handleReload" />
  </Page>
</template>
