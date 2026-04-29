<script setup lang="ts">
import type { VbenFormProps } from '@vben/common-ui';
import type { VxeGridProps } from '#/adapter/vxe-table';
import type { MediaVideoVo } from '#/api/media/video/model';

import { ref, nextTick, onBeforeUnmount } from 'vue';
import 'video.js/dist/video-js.css';

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
  resizableConfig: {
    // 拖拽列宽时保持表格整体宽度不变，相邻列自动补偿
    syncResize: true,
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

onBeforeUnmount(() => {
  if (vjsPlayer) {
    vjsPlayer.dispose();
    vjsPlayer = null;
  }
  if (playerBlobUrl) {
    URL.revokeObjectURL(playerBlobUrl);
    playerBlobUrl = '';
  }
});

/** 查看详情 - 播放视频 */
function handleView(row: MediaVideoVo) {
  playVideo(row);
}

// Video.js 播放器
const playerOpen = ref(false);
const playerLoading = ref(false);
const playerVideo = ref<MediaVideoVo | null>(null);
const videoAreaRef = ref<HTMLDivElement | null>(null);
let playerBlobUrl = '';
let vjsPlayer: any = null;

async function playVideo(video: MediaVideoVo) {
  playerVideo.value = video;
  playerOpen.value = true;
  playerLoading.value = true;

  await nextTick();

  try {
    const { useAccessStore } = await import('@vben/stores');
    const { useAppConfig } = await import('@vben/hooks');
    const token = useAccessStore().accessToken;
    const { clientId } = useAppConfig(import.meta.env, import.meta.env.PROD);
    const res = await fetch(`/api/media/video/play/${video.videoId}`, {
      headers: {
        Authorization: 'Bearer ' + token,
        ClientID: clientId,
      },
    });
    if (!res.ok) throw new Error('播放失败: ' + res.status);
    const blob = await res.blob();
    if (playerBlobUrl) URL.revokeObjectURL(playerBlobUrl);
    playerBlobUrl = URL.createObjectURL(blob);

    if (vjsPlayer) {
      vjsPlayer.dispose();
      vjsPlayer = null;
    }

    const container = videoAreaRef.value;
    if (!container) return;

    const videoEl = document.createElement('video');
    videoEl.className = 'video-js vjs-big-play-centered';
    videoEl.setAttribute('playsinline', 'true');
    container.prepend(videoEl);

    const videojs = (await import('video.js')).default;
    vjsPlayer = videojs(videoEl, {
      controls: true,
      autoplay: true,
      preload: 'auto',
      fluid: true,
      aspectRatio: '16:9',
      responsive: true,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
    });

    vjsPlayer.src({ type: blob.type || 'video/mp4', src: playerBlobUrl });
  } catch (e) {
    console.error('加载视频失败:', e);
  } finally {
    playerLoading.value = false;
  }
}

function closePlayer() {
  if (vjsPlayer) {
    vjsPlayer.dispose();
    vjsPlayer = null;
  }
  playerOpen.value = false;
  playerVideo.value = null;
  if (playerBlobUrl) {
    URL.revokeObjectURL(playerBlobUrl);
    playerBlobUrl = '';
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

    <!-- Video Player Modal -->
    <Teleport to="body">
      <div v-if="playerOpen" class="admin-player-overlay" @click.self="closePlayer">
        <div class="admin-player-wrapper">
          <div class="admin-player-title-bar">
            <div class="admin-player-title-text">{{ playerVideo?.title }}</div>
            <button class="admin-player-close-btn" @click.stop="closePlayer" title="关闭">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          <div ref="videoAreaRef" class="admin-video-area">
            <div v-if="playerLoading" class="admin-center-play">
              <i class="fa-solid fa-spinner fa-spin" style="color:#fff;font-size:28px"></i>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </Page>
</template>

<style scoped>
.admin-player-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.admin-player-wrapper {
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
  box-shadow: 0 32px 80px -12px rgba(0,0,0,0.7);
  max-width: 96vw;
  width: max-content;
}

.admin-player-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: rgba(10, 10, 10, 0.95);
}

.admin-player-title-text {
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 16px;
}

.admin-player-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255,255,255,0.5);
  transition: 0.2s;
  flex-shrink: 0;
}

.admin-player-close-btn:hover {
  background: rgba(255,255,255,0.12);
  color: #fff;
}

.admin-video-area {
  width: 960px;
  max-width: 96vw;
  background: #000;
  position: relative;
}

.admin-center-play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
</style>

<!-- Video.js 样式覆盖（非 scoped） -->
<style>
.admin-player-wrapper .video-js {
  font-family: inherit;
  width: 100%;
}

.admin-player-wrapper .video-js .vjs-big-play-button {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(12px);
  border: 1.5px solid rgba(255,255,255,0.18);
  line-height: 72px;
  font-size: 36px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.2s ease;
}

.admin-player-wrapper .video-js .vjs-big-play-button:hover {
  background: rgba(255,255,255,0.18);
  transform: translate(-50%, -50%) scale(1.08);
}

.admin-player-wrapper .video-js .vjs-control-bar {
  background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);
  height: 44px;
  padding: 0 8px;
}

.admin-player-wrapper .video-js .vjs-play-progress,
.admin-player-wrapper .video-js .vjs-volume-level {
  background: #fff;
}

.admin-player-wrapper .video-js .vjs-slider {
  background: rgba(255,255,255,0.2);
}

.admin-player-wrapper .video-js .vjs-time-control {
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  color: rgba(255,255,255,0.8);
  line-height: 44px;
}

.video-js.vjs-fullscreen video {
  object-fit: contain;
}
</style>