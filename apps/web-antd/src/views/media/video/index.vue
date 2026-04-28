<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { MediaVideoVo } from '#/api/media/video/model';

import { ref } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Image, Popconfirm, Space, Tag } from 'antdv-next';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { videoPage, videoRemove } from '#/api/media/video';

import { columns, querySchema } from './data';
import EditModal from './edit-modal.vue';
import UploadModal from './upload-modal.vue';

const loading = ref(false);
const pagination = ref({ current: 1, pageSize: 10, total: 0 });

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
  pagerConfig: {
    enabled: true,
    currentPage: 1,
    pageSize: 10,
  },
  rowConfig: {
    keyField: 'videoId',
  },
  id: 'media-video-index',
};

const [BasicTable, tableApi] = useVbenVxeGrid({
  formOptions,
  gridOptions,
});

// 加载数据
async function loadData(formValues = {}) {
  loading.value = true;
  try {
    const params: any = {
      pageNum: pagination.value.current,
      pageSize: pagination.value.pageSize,
    };
    if (formValues.keyword) {
      params.keyword = formValues.keyword;
    }
    if (formValues.authType !== undefined && formValues.authType !== null) {
      params.authType = formValues.authType;
    }
    if (formValues.categoryIds && formValues.categoryIds.length > 0) {
      params.categoryIds = formValues.categoryIds;
    }
    if (formValues.directionIds && formValues.directionIds.length > 0) {
      params.directionIds = formValues.directionIds;
    }
    const res = await videoPage(params);
    const data = res as any;
    const rows = data?.rows || data?.data?.rows || [];
    const total = data?.total || data?.data?.total || 0;
    pagination.value.total = total;
    tableApi.grid.loadData(rows);
  } catch (e) {
    console.error('加载失败:', e);
  } finally {
    loading.value = false;
  }
}

// 搜索
async function handleQuery() {
  pagination.value.current = 1;
  const formValues = await tableApi.formApi.getValues();
  await loadData(formValues);
}

// 重置
async function handleReset() {
  await tableApi.formApi.resetForm();
  pagination.value.current = 1;
  await loadData();
}

// 分页变化
async function handlePageChange(page: number) {
  pagination.value.current = page;
  const formValues = await tableApi.formApi.getValues();
  await loadData(formValues);
}

// 初始化加载
loadData();

// 上传弹窗
const [UploadModalComp, uploadModalApi] = useVbenModal({
  connectedComponent: UploadModal,
});

// 编辑弹窗
const [EditModalComp, editModalApi] = useVbenModal({
  connectedComponent: EditModal,
});

/** 上传视频 */
function handleUpload() {
  uploadModalApi.setData({});
  uploadModalApi.open();
}

/** 编辑视频信息 */
function handleEdit(record: MediaVideoVo) {
  editModalApi.setData({ record });
  editModalApi.open();
}

/** 删除视频 */
async function handleDelete(row: MediaVideoVo) {
  await videoRemove(row.videoId);
  const formValues = await tableApi.formApi.getValues();
  await loadData(formValues);
}

/** 查看详情 */
function handleView(row: MediaVideoVo) {
  // TODO: 实现视频详情查看
  console.log('查看视频:', row);
}
</script>

<template>
  <Page :auto-content-height="true">
    <BasicTable :loading="loading">
      <template #toolbar-actions>
        <Space>
          <a-button
            type="primary"
            v-access:code="['media:video:add']"
            @click="handleUpload"
          >
            <i class="fa-solid fa-plus"></i> 新增
          </a-button>
        </Space>
      </template>
      <template #thumbnail="{ row }">
        <Image
          v-if="row.thumbnail"
          :src="row.thumbnail"
          :width="60"
          :height="40"
          style="object-fit: cover; border-radius: 4px;"
          fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjYwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjVGNUY1Ii8+PHRleHQgeD0iMzAiIHk9IjIwIiBmb250LXNpemU9IjEyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb3l1bmFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5Ij5ObyBJbWFnZTwvdGV4dD48L3N2Zz4="
        />
        <span v-else style="color: #A0A0A0;">暂无</span>
      </template>
      <template #action="{ row }">
        <Space>
          <action-button @click.stop="handleView(row)">
            <i class="fa-solid fa-eye"></i> 查看
          </action-button>
          <action-button
            v-access:code="['media:video:edit']"
            @click.stop="handleEdit(row)"
          >
            {{ $t('pages.common.edit') }}
          </action-button>
          <Popconfirm
            placement="left"
            title="确认删除该视频？"
            @confirm="handleDelete(row)"
          >
            <action-button
              danger
              v-access:code="['media:video:remove']"
              @click.stop=""
            >
              {{ $t('pages.common.delete') }}
            </action-button>
          </Popconfirm>
        </Space>
      </template>
    </BasicTable>
    <UploadModalComp @reload="handleQuery()" />
    <EditModalComp @reload="handleQuery()" />
  </Page>
</template>