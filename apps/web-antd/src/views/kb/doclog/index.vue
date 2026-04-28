<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { PageQuery } from '#/api/common';

import { Page } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Space } from 'antdv-next';

import {
  addSortParams,
  useVbenVxeGrid,
  vxeCheckboxChecked,
} from '#/adapter/vxe-table';
import {
  docLogDelete,
  docLogExport,
  docLogExportSelected,
  docLogList,
} from '#/api/kb/doclog';
import type { DocLogVo } from '#/api/kb/doclog/model';
import { useBlobExport } from '#/utils/file/export';

import { columns, querySchema } from './data';

const formOptions: VbenFormProps = {
  commonConfig: {
    labelWidth: 80,
    componentProps: {
      allowClear: true,
    },
  },
  schema: querySchema(),
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  fieldMappingTime: [
    [
      'createTime',
      ['createTimeStart', 'createTimeEnd'],
      ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm:ss'],
    ],
  ],
};

const gridOptions: VxeGridProps = {
  checkboxConfig: {
    highlight: true,
    reserve: true,
    trigger: 'row',
  },
  columns,
  height: 'auto',
  keepSource: true,
  pagerConfig: {},
  proxyConfig: {
    ajax: {
      query: async ({ page, sorts }, formValues = {}) => {
        const params: PageQuery = {
          pageNum: page.currentPage,
          pageSize: page.pageSize,
          ...formValues,
        };
        addSortParams(params, sorts);
        return await docLogList(params);
      },
    },
  },
  rowConfig: {
    keyField: 'visitId',
  },
  sortConfig: {
    remote: true,
    multiple: true,
  },
  id: 'kb-doclog-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
  gridEvents: {
    sortChange: () => tableApi.query(),
  },
});

const { exportBlob, exportLoading, buildExportFileName } =
  useBlobExport(docLogExport);

const { exportBlob: exportSelectedBlob, exportLoading: exportSelectedLoading } =
  useBlobExport(docLogExportSelected);

/** 导出全部 */
async function handleExportAll() {
  const formValues = await tableApi.formApi.getValues();
  const fileName = buildExportFileName('文档日志');
  exportBlob({ data: formValues, fileName });
}

/** 导出选中 */
async function handleExportSelected() {
  const rows = tableApi.grid.getCheckboxRecords();
  if (rows.length === 0) {
    window.message.warning('请先选择要导出的数据');
    return;
  }
  const ids = rows.map((r: DocLogVo) => r.visitId).join(',');
  const fileName = buildExportFileName('文档日志_选中');
  exportSelectedBlob({ data: { ids }, fileName });
}

/** 删除日志 */
async function handleDelete() {
  const rows = tableApi.grid.getCheckboxRecords();
  if (rows.length === 0) {
    window.message.warning('请先选择要删除的数据');
    return;
  }
  const ids = rows.map((row: DocLogVo) => row.visitId).join(',');
  window.modal.confirm({
    title: '提示',
    okType: 'danger',
    content: `确认删除选中的 ${rows.length} 条文档日志吗？`,
    onOk: async () => {
      await docLogDelete(ids);
      await tableApi.query();
    },
  });
}
</script>

<template>
  <Page :auto-content-height="true">
    <BasicTable table-title="文档日志列表">
      <template #toolbar-tools>
        <Space>
          <a-button
            v-access:code="['kb:doclog:export']"
            :loading="exportLoading"
            :disabled="exportLoading"
            @click="handleExportAll"
          >
            {{ $t('pages.common.export') }}
          </a-button>
          <a-button
            v-access:code="['kb:doclog:export']"
            :loading="exportSelectedLoading"
            :disabled="exportSelectedLoading || !vxeCheckboxChecked(tableApi)"
            @click="handleExportSelected"
          >
            导出选中
          </a-button>
          <a-button
            v-access:code="['kb:doclog:remove']"
            :disabled="!vxeCheckboxChecked(tableApi)"
            danger
            type="primary"
            @click="handleDelete"
          >
            {{ $t('pages.common.delete') }}
          </a-button>
        </Space>
      </template>
    </BasicTable>
  </Page>
</template>