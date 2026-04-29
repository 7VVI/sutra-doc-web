<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';
import {
  getMediaVideoPage,
  getMediaTagList,
  getMediaVideoDetail,
  getMediaVideoAttachments,
  downloadMediaAttachment,
  likeMediaVideo,
  unlikeMediaVideo,
  getMediaPlayUrl,
} from '#/api/media';
import type { MediaVideoVo, MediaTagVo, MediaVideoAttachmentVo } from '#/api/media';

// 标签数据
const categoryTags = ref<MediaTagVo[]>([]);
const directionTags = ref<MediaTagVo[]>([]);

// 视频列表
const videos = ref<MediaVideoVo[]>([]);
const total = ref(0);
const loading = ref(false);
const currentPage = ref(1);
const pageSize = 12;

// 筛选状态
const mukeSearch = ref('');
const mukeSort = ref('new');
const filterExpanded = ref(false);
const fDirection = ref<number | null>(null);
const fCategory = ref<number | null>(null);
const fYear = ref<string>('all');
const fAuthor = ref<string>('all');

// 筛选数量badge
const filterBadge = computed(() => {
  let n = 0;
  if (fDirection.value) n++;
  if (fCategory.value) n++;
  if (fYear.value !== 'all') n++;
  if (fAuthor.value !== 'all') n++;
  return n;
});

// Toast通知
const toasts = ref<{ id: number; msg: string }[]>([]);
let toastIdCounter = 0;

function showToast(msg: string, dur = 2500) {
  const id = ++toastIdCounter;
  toasts.value.push({ id, msg });
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, dur);
}

// 加载标签
async function loadTags() {
  try {
    const catRes = await getMediaTagList(1);
    const dirRes = await getMediaTagList(2);
    categoryTags.value = (catRes as any)?.data || catRes || [];
    directionTags.value = (dirRes as any)?.data || dirRes || [];
  } catch (e) {
    console.error('加载标签失败:', e);
  }
}

// 加载视频列表
async function loadVideos() {
  loading.value = true;
  try {
    const query: any = {
      pageNum: currentPage.value,
      pageSize,
      keyword: mukeSearch.value || undefined,
    };
    if (fCategory.value) query.categoryIds = [fCategory.value];
    if (fDirection.value) query.directionIds = [fDirection.value];
    if (mukeSort.value === 'new') query.sort = 'createTime-desc';
    else if (mukeSort.value === 'hot') query.sort = 'viewCount-desc';
    else if (mukeSort.value === 'name') query.sort = 'title-asc';

    const res = await getMediaVideoPage(query);
    const data = res as any;
    videos.value = data?.rows || [];
    total.value = data?.total || 0;
  } catch (e) {
    console.error('加载视频失败:', e);
    videos.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadTags();
  loadVideos();
});

watch([mukeSearch, mukeSort, fDirection, fCategory, fYear, fAuthor], () => {
  currentPage.value = 1;
  loadVideos();
});

function goToPage(page: number) {
  if (page < 1 || page > Math.ceil(total.value / pageSize)) return;
  currentPage.value = page;
  loadVideos();
}

function resetFilters() {
  fDirection.value = null;
  fCategory.value = null;
  fYear.value = 'all';
  fAuthor.value = 'all';
  showToast('已重置全部筛选条件');
}

function formatDuration(seconds: number | undefined) {
  if (!seconds) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(d: string) {
  if (!d) return '';
  return d.substring(0, 10);
}

// Video.js 播放器
const playerOpen = ref(false);
const playerLoading = ref(false);
const playerVideo = ref<MediaVideoVo | null>(null);
const videoAreaRef = ref<HTMLDivElement | null>(null);
let playerBlobUrl = '';
let vjsPlayer: Player | null = null;

function initVjsPlayer(src: string, type: string) {
  // 销毁旧实例
  if (vjsPlayer) {
    vjsPlayer.dispose();
    vjsPlayer = null;
  }

  const container = videoAreaRef.value;
  if (!container) return;

  // 创建新的 video 元素
  const videoEl = document.createElement('video');
  videoEl.className = 'video-js vjs-big-play-centered';
  videoEl.setAttribute('playsinline', 'true');
  container.prepend(videoEl);

  vjsPlayer = videojs(videoEl, {
    controls: true,
    autoplay: true,
    preload: 'auto',
    fluid: true,
    aspectRatio: '16:9',
    responsive: true,
    playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
    controlBar: {
      children: [
        'playToggle',
        'volumePanel',
        'currentTimeDisplay',
        'timeDivider',
        'durationDisplay',
        'progressControl',
        'playbackRateMenuButton',
        'fullscreenToggle',
      ],
    },
  });

  vjsPlayer.src({ type, src });
}

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
    const res = await fetch(getMediaPlayUrl(video.videoId), {
      headers: {
        Authorization: 'Bearer ' + token,
        ClientID: clientId,
      },
    });
    if (!res.ok) throw new Error('播放失败: ' + res.status);
    const blob = await res.blob();
    if (playerBlobUrl) URL.revokeObjectURL(playerBlobUrl);
    playerBlobUrl = URL.createObjectURL(blob);

    initVjsPlayer(playerBlobUrl, blob.type || 'video/mp4');
  } catch (e) {
    console.error('加载视频失败:', e);
    showToast('视频加载失败，请稍后重试');
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

// 详情弹窗
const detailModalOpen = ref(false);
const detailLoading = ref(false);
const selectedVideo = ref<MediaVideoVo | null>(null);
const videoDetail = ref<any>(null);
const videoAttachments = ref<MediaVideoAttachmentVo[]>([]);
const likingVideoId = ref<number | null>(null);

async function openDetail(video: MediaVideoVo) {
  selectedVideo.value = video;
  videoDetail.value = null;
  videoAttachments.value = [];
  detailModalOpen.value = true;
  detailLoading.value = true;
  try {
    const [detailRes, attachRes] = await Promise.all([
      getMediaVideoDetail(video.videoId),
      getMediaVideoAttachments(video.videoId),
    ]);
    videoDetail.value = (detailRes as any)?.data || detailRes;
    videoAttachments.value = (attachRes as any)?.data || attachRes || [];
  } catch (e) {
    console.error('加载详情失败:', e);
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  detailModalOpen.value = false;
  selectedVideo.value = null;
  videoDetail.value = null;
  videoAttachments.value = [];
}

function playFromDetail() {
  const video = selectedVideo.value;
  closeDetail();
  if (video) playVideo(video);
}

// 卡片点赞
async function toggleLikeOnCard(video: MediaVideoVo, event: Event) {
  event.stopPropagation();
  if (likingVideoId.value === video.videoId) return;
  likingVideoId.value = video.videoId;
  try {
    if (video.hasLiked) {
      await unlikeMediaVideo(video.videoId);
      video.hasLiked = false;
      video.likeCount--;
    } else {
      await likeMediaVideo(video.videoId);
      video.hasLiked = true;
      video.likeCount++;
      showToast('点赞成功');
    }
  } catch (e) {
    console.error('点赞操作失败:', e);
  } finally {
    likingVideoId.value = null;
  }
}

// 详情弹窗点赞
async function handleLike() {
  if (!videoDetail.value || likingVideoId.value) return;
  likingVideoId.value = videoDetail.value.videoId;
  try {
    const isLiked = videoDetail.value.hasLiked;
    if (isLiked) {
      await unlikeMediaVideo(videoDetail.value.videoId);
      videoDetail.value.hasLiked = false;
      videoDetail.value.likeCount--;
    } else {
      await likeMediaVideo(videoDetail.value.videoId);
      videoDetail.value.hasLiked = true;
      videoDetail.value.likeCount++;
      showToast('点赞成功');
    }
    const v = videos.value.find(v => v.videoId === videoDetail.value.videoId);
    if (v) {
      v.hasLiked = videoDetail.value.hasLiked;
      v.likeCount = videoDetail.value.likeCount;
    }
  } catch (e) {
    console.error('点赞操作失败:', e);
  } finally {
    likingVideoId.value = null;
  }
}

async function downloadAttach(attach: MediaVideoAttachmentVo) {
  try {
    await downloadMediaAttachment(attach.attachmentId, attach.fileName);
    showToast(`开始下载「${attach.fileName}」`);
  } catch (e) {
    console.error('下载失败:', e);
    showToast('下载失败，请稍后重试');
  }
}

// 分页数组
const pageNumbers = computed(() => {
  const pages: (number | string)[] = [];
  const tp = Math.ceil(total.value / pageSize);
  const cp = currentPage.value;
  if (tp <= 7) {
    for (let i = 1; i <= tp; i++) pages.push(i);
  } else {
    pages.push(1);
    if (cp > 3) pages.push('...');
    for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i);
    if (cp < tp - 2) pages.push('...');
    pages.push(tp);
  }
  return pages;
});

const totalPages = computed(() => Math.ceil(total.value / pageSize));

// 辅助函数
const aiCls = (e: string) => ({xlsx:'ai-xlsx',docx:'ai-docx',pdf:'ai-pdf',pptx:'ai-pptx',zip:'ai-zip'})[e]||'ai-pdf';
const aiFA = (e: string) => ({xlsx:'fa-solid fa-file-excel',docx:'fa-solid fa-file-word',pdf:'fa-solid fa-file-pdf',pptx:'fa-solid fa-file-powerpoint',zip:'fa-solid fa-file-zipper'})[e]||'fa-solid fa-file';

// 点击主区域自动折叠（无筛选条件时）
function handleMainClick() {
  if (filterExpanded.value && filterBadge.value === 0) {
    filterExpanded.value = false;
  }
}

// 切换筛选面板展开状态
function toggleFilterPanel() {
  filterExpanded.value = !filterExpanded.value;
}

// 设置方向筛选
function setDirectionFilter(tagId: number | null) {
  fDirection.value = tagId;
}

// 设置分类筛选
function setCategoryFilter(tagId: number | null) {
  fCategory.value = tagId;
}
</script>

<template>
  <div class="apple-muke">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">讲武堂</h1>
        <p class="hero-subtitle">让每一次学习，学以致用</p>
        <div class="hero-search">
          <svg class="hero-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input type="text" v-model="mukeSearch" placeholder="搜索课程名称、讲师...">
        </div>
      </div>
    </section>

    <!-- Filter Bar -->
    <section class="filter-bar">
      <div class="filter-bar-inner">
        <div class="filter-bar-left">
          <button class="filter-toggle" :class="{ active: filterBadge > 0 }" @click="toggleFilterPanel">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
            筛选
            <span v-if="filterBadge > 0" class="filter-badge">{{ filterBadge }}</span>
            <svg class="toggle-arrow" :class="{ open: filterExpanded }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button v-if="filterBadge > 0" class="filter-reset-btn" @click="resetFilters">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            重置
          </button>
        </div>
        <div class="filter-sort">
          <button class="sort-pill" :class="{ active: mukeSort === 'new' }" @click="mukeSort = 'new'">最新</button>
          <button class="sort-pill" :class="{ active: mukeSort === 'hot' }" @click="mukeSort = 'hot'">热门</button>
          <button class="sort-pill" :class="{ active: mukeSort === 'name' }" @click="mukeSort = 'name'">名称</button>
        </div>
      </div>

      <!-- Expanded filter panel -->
      <Transition name="filter-slide">
        <div v-if="filterExpanded" class="filter-panel">
          <div class="filter-row">
            <span class="filter-label">方向</span>
            <div class="filter-chips">
              <button class="filter-chip" :class="{ active: !fDirection }" @click="setDirectionFilter(null)">全部</button>
              <button
                v-for="t in directionTags" :key="'d-'+t.tagId"
                class="filter-chip" :class="{ active: fDirection === t.tagId }"
                @click="setDirectionFilter(fDirection === t.tagId ? null : t.tagId)"
              >{{ t.tagName }}</button>
            </div>
          </div>
          <div class="filter-row">
            <span class="filter-label">分类</span>
            <div class="filter-chips">
              <button class="filter-chip" :class="{ active: !fCategory }" @click="setCategoryFilter(null)">全部</button>
              <button
                v-for="t in categoryTags" :key="'c-'+t.tagId"
                class="filter-chip" :class="{ active: fCategory === t.tagId }"
                @click="setCategoryFilter(fCategory === t.tagId ? null : t.tagId)"
              >{{ t.tagName }}</button>
            </div>
          </div>
          <div class="filter-row">
            <span class="filter-label">年份</span>
            <div class="filter-chips">
              <button class="filter-chip" :class="{ active: fYear === 'all' }" @click="fYear = 'all'">全部</button>
              <button class="filter-chip" :class="{ active: fYear === '2026' }" @click="fYear = '2026'">2026</button>
              <button class="filter-chip" :class="{ active: fYear === '2025' }" @click="fYear = '2025'">2025</button>
              <button class="filter-chip" :class="{ active: fYear === '2024' }" @click="fYear = '2024'">2024</button>
            </div>
          </div>
          <div class="filter-row">
            <span class="filter-label">讲师</span>
            <div class="filter-chips">
              <button class="filter-chip" :class="{ active: fAuthor === 'all' }" @click="fAuthor = 'all'">全部</button>
            </div>
          </div>
        </div>
      </Transition>
    </section>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>正在加载</span>
    </div>

    <!-- Course Grid -->
    <section v-else-if="videos.length > 0" class="course-grid">
      <article
        v-for="(v, idx) in videos" :key="v.videoId"
        class="card"
        :style="{ '--i': idx }"
      >
        <div class="card-thumb" @click="playVideo(v)">
          <img v-if="v.thumbnail" :src="v.thumbnail" :alt="v.title" loading="lazy">
          <div v-else class="thumb-fallback">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
          <div class="card-play-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z"/></svg>
          </div>
          <div class="card-views-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {{ v.viewCount.toLocaleString() }}
          </div>
        </div>

        <div class="card-body" @click="openDetail(v)">
          <div class="card-main">
            <h3 class="card-title">{{ v.title }}</h3>
            <div class="card-meta">
              <span class="author-avatar">{{ v.authorName?.charAt(0) || '?' }}</span>
              <span class="author-name">{{ v.authorName || '未知' }}</span>
              <span class="meta-dot">·</span>
              <span class="card-date">{{ formatDate(v.createTime) }}</span>
            </div>
          </div>
          <div class="card-side">
            <span class="card-attach-count">
              <i class="fa-solid fa-paperclip"></i>
              {{ v.attachmentCount || 0 }}
            </span>
            <div class="card-like" @click.stop="toggleLikeOnCard(v, $event)">
              <i :class="likingVideoId === v.videoId ? 'fa-solid fa-spinner fa-spin' : (v.hasLiked ? 'fa-solid fa-heart liked' : 'fa-regular fa-heart')"></i>
              <span>{{ v.likeCount }}</span>
            </div>
          </div>
        </div>
      </article>
    </section>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <p class="empty-title">未找到匹配课程</p>
      <p class="empty-desc">请尝试调整筛选条件或关键词</p>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1 && !loading" class="pagination">
      <button class="page-arrow" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <template v-for="p in pageNumbers" :key="p">
        <span v-if="p === '...'" class="page-dots">…</span>
        <button v-else class="page-num" :class="{ active: p === currentPage }" @click="goToPage(p as number)">{{ p }}</button>
      </template>
      <button class="page-arrow" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="detailModalOpen" class="detail-overlay" @click.self="closeDetail">
          <div class="detail-modal">
            <div class="detail-modal-header">
              <div>
                <h2 class="detail-modal-title">{{ selectedVideo?.title }}</h2>
                <p class="detail-modal-sub">
                  {{ videoDetail?.authorName || selectedVideo?.authorName }} ·
                  {{ formatDuration(videoDetail?.duration) }} ·
                  {{ videoAttachments.length }} 份附件
                </p>
              </div>
              <button class="detail-close" @click="closeDetail">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div v-if="detailLoading" class="modal-loading">
              <div class="loading-spinner"></div>
              <span>加载中</span>
            </div>

            <template v-else-if="videoDetail">
              <div class="detail-actions">
                <button class="btn-play" @click="playFromDetail()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11-6.86a1 1 0 0 0 0-1.72l-11-6.86A1 1 0 0 0 8 5.14z"/></svg>
                  播放视频
                </button>
                <button class="btn-like" :class="{ liked: videoDetail.hasLiked }" @click="handleLike" :disabled="likingVideoId === videoDetail.videoId">
                  <i :class="likingVideoId === videoDetail.videoId ? 'fa-solid fa-spinner fa-spin' : (videoDetail.hasLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart')"></i>
                  {{ videoDetail.hasLiked ? '已点赞' : '点赞' }} · {{ videoDetail.likeCount }}
                </button>
              </div>

              <div v-if="videoDetail.description" class="detail-desc">
                {{ videoDetail.description }}
              </div>

              <div class="detail-attach-list">
                <div v-for="a in videoAttachments" :key="a.attachmentId" class="attach-row">
                  <div class="attach-icon" :class="aiCls(a.fileFormat || 'pdf')">
                    <i :class="aiFA(a.fileFormat || 'pdf')"></i>
                  </div>
                  <div class="attach-info">
                    <div class="attach-name">{{ a.fileName }}</div>
                    <div class="attach-size">{{ formatFileSize(a.fileSize) }}</div>
                  </div>
                  <button class="attach-download" @click="downloadAttach(a)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    下载
                  </button>
                </div>
                <div v-if="videoAttachments.length === 0" class="attach-empty">暂无附件</div>
              </div>
            </template>

            <div class="detail-footer">
              发布于 {{ formatDate(videoDetail?.createTime || selectedVideo?.createTime) }}
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Video Player Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="playerOpen" class="player-overlay" @click.self="closePlayer">
          <div class="player-wrapper">
            <div class="player-title-bar">
              <div class="player-title-text">{{ playerVideo?.title }}</div>
              <button class="player-close-btn" @click.stop="closePlayer" title="关闭">
                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>

            <div ref="videoAreaRef" class="video-area">
              <div v-if="playerLoading" class="center-play">
                <div class="center-play-btn loading-state">
                  <i class="fa-solid fa-spinner fa-spin" style="color:#fff;font-size:28px"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <TransitionGroup name="toast-anim" tag="div" class="toast-container">
        <div v-for="t in toasts" :key="t.id" class="toast-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
          <span>{{ t.msg }}</span>
        </div>
      </TransitionGroup>
    </Teleport>
  </div>
</template>

<style scoped>
/* ===== Apple Design System ===== */
.apple-muke {
  min-height: 100vh;
  background: #fafafa;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* --- Hero Section --- */
.hero {
  padding: 72px 48px 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(180deg, #fff 0%, #fafafa 100%);
}

.hero-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-title {
  font-size: 42px;
  font-weight: 900;
  letter-spacing: -1px;
  color: #1A1A1A;
  line-height: 1;
  text-align: center;
  margin: 0 0 10px;
  animation: fadeUp 0.7s ease both;
}

.hero-subtitle {
  font-size: 14px;
  font-weight: 300;
  color: #A0A0A0;
  text-align: center;
  letter-spacing: 0.3px;
  margin: 0 0 36px;
  animation: fadeUp 0.7s ease 0.06s both;
}

.hero-search {
  width: 100%;
  max-width: 760px;
  margin-bottom: 16px;
  position: relative;
  animation: fadeUp 0.7s ease 0.1s both;
}

.hero-search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  color: #86868b;
  pointer-events: none;
}

.hero-search input {
  width: 100%;
  height: 56px;
  border: 2px solid #ECECEC;
  border-radius: 20px;
  padding: 0 20px 0 48px;
  font-size: 15px;
  font-family: inherit;
  color: #1A1A1A;
  background: #fff;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.hero-search input:hover {
  border-color: #D5D5D5;
}

.hero-search input:focus {
  outline: none;
  border-color: #1A1A1A;
  box-shadow: 0 0 0 4px rgba(26, 26, 26, 0.08);
}

.hero-search input::placeholder {
  color: #A0A0A0;
  font-weight: 300;
}

/* --- Filter Bar --- */
.filter-bar {
  position: sticky;
  top: 56px;
  z-index: 100;
  background: rgba(250, 250, 250, 0.72);
  backdrop-filter: saturate(180%) blur(20px);
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  animation: fadeUp 0.7s ease 0.15s both;
}

.filter-bar-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 12px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.filter-bar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: #fff;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: #86868b;
  cursor: pointer;
  transition: all 0.25s ease;
}

.filter-toggle:hover {
  border-color: rgba(0, 0, 0, 0.15);
  color: #1d1d1f;
}

.filter-toggle.active {
  border-color: rgba(0, 0, 0, 0.15);
  color: #1d1d1f;
  background: #fff;
}

.toggle-arrow {
  transition: transform 0.3s ease;
}

.toggle-arrow.open {
  transform: rotate(180deg);
}

.filter-reset-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border: none;
  border-radius: 10px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: #86868b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-reset-btn:hover {
  color: #1d1d1f;
  background: rgba(0, 0, 0, 0.04);
}

.filter-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  background: #1d1d1f;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 9px;
}

/* Filter Panel (expanded) */
.filter-panel {
  max-width: 1280px;
  margin: 0 auto;
  padding: 4px 32px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-label {
  font-size: 12px;
  font-weight: 600;
  color: #aeaeb2;
  letter-spacing: 0.02em;
  flex-shrink: 0;
  width: 32px;
  text-align: right;
}

.filter-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  flex: 1;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.filter-chips::-webkit-scrollbar { display: none; }

.filter-chip {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: #86868b;
  background: rgba(0, 0, 0, 0.03);
  border: none;
  border-radius: 980px;
  cursor: pointer;
  transition: all 0.25s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.filter-chip:hover {
  color: #1d1d1f;
  background: rgba(0, 0, 0, 0.06);
}

.filter-chip.active {
  color: #fff;
  background: #1d1d1f;
}

/* Filter expand/collapse transition */
.filter-slide-enter-active { transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.filter-slide-leave-active { transition: all 0.2s ease; }
.filter-slide-enter-from, .filter-slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  overflow: hidden;
}
.filter-slide-enter-to, .filter-slide-leave-from {
  opacity: 1;
  max-height: 300px;
}

.filter-sort {
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  padding: 3px;
  flex-shrink: 0;
}

.sort-pill {
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  color: #86868b;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sort-pill:hover { color: #1d1d1f; }

.sort-pill.active {
  color: #1d1d1f;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

/* --- Loading --- */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 24px;
  color: #86868b;
  font-size: 15px;
}

.loading-spinner {
  width: 28px;
  height: 28px;
  border: 2.5px solid rgba(0, 0, 0, 0.08);
  border-top-color: #1d1d1f;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

/* --- Course Grid --- */
.course-grid {
  max-width: 1280px;
  margin: 0 auto;
  padding: 40px 32px 20px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 28px;
}

/* --- Card --- */
.card {
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.4s ease;
  animation: cardIn 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
  animation-delay: calc(var(--i) * 0.06s);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.card:hover {
  transform: scale(1.02);
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes fadeUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* --- Card Thumbnail --- */
.card-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  cursor: pointer;
  background: #f5f5f7;
}

.card-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.card:hover .card-thumb img {
  transform: scale(1.06);
}

.thumb-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d2d2d7;
}

.card-play-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.8);
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.card:hover .card-play-icon {
  opacity: 1;
  transform: translate(-50%, -50%) scale(1);
}

.card-views-badge {
  position: absolute;
  bottom: 12px;
  left: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: rgba(255, 255, 255, 0.9);
  font-size: 11px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

/* --- Card Body --- */
.card-body {
  padding: 12px 16px;
  cursor: pointer;
  display: flex;
  gap: 12px;
}

.card-main {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
  line-height: 1.4;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  letter-spacing: -0.01em;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.author-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #f5f5f7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: #86868b;
  flex-shrink: 0;
}

.author-name {
  font-size: 12px;
  color: #86868b;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta-dot {
  font-size: 10px;
  color: #d2d2d7;
  flex-shrink: 0;
}

.card-date {
  font-size: 12px;
  color: #aeaeb2;
  white-space: nowrap;
}

.card-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
  flex-shrink: 0;
  padding-top: 1px;
}

.card-attach-count {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #aeaeb2;
  white-space: nowrap;
  padding: 3px 6px;
}

.card-attach-count i {
  font-size: 12px;
}

/* --- Card Like --- */
.card-like {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #aeaeb2;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 6px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.card-like:hover {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.06);
}

.card-like i {
  font-size: 12px;
  width: 12px;
  text-align: center;
}

.card-like i.liked {
  color: #ff6b6b;
}

/* --- Empty State --- */
.empty-state {
  padding: 100px 24px;
  text-align: center;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0 0 6px;
}

.empty-desc {
  font-size: 15px;
  color: #86868b;
  margin: 0;
}

/* --- Pagination --- */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 32px 24px 64px;
}

.page-arrow {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #86868b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.page-arrow:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.04);
  color: #1d1d1f;
}

.page-arrow:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-num {
  min-width: 36px;
  height: 36px;
  border: none;
  border-radius: 10px;
  background: transparent;
  color: #86868b;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.page-num:hover:not(.active) {
  background: rgba(0, 0, 0, 0.04);
  color: #1d1d1f;
}

.page-num.active {
  background: #1d1d1f;
  color: #fff;
}

.page-dots {
  color: #aeaeb2;
  font-size: 14px;
  padding: 0 4px;
}

/* ===== Detail Modal ===== */
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.detail-modal {
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  border-radius: 24px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.12);
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-modal-header {
  padding: 24px 28px 20px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.detail-modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.detail-modal-sub {
  font-size: 13px;
  color: #86868b;
  margin: 0;
}

.detail-close {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  color: #86868b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.detail-close:hover {
  background: rgba(0, 0, 0, 0.08);
  color: #1d1d1f;
}

.modal-loading {
  padding: 48px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  color: #86868b;
  font-size: 15px;
}

.detail-actions {
  padding: 0 28px 20px;
  display: flex;
  gap: 12px;
}

.btn-play {
  height: 44px;
  padding: 0 24px;
  border: none;
  border-radius: 12px;
  background: #1d1d1f;
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.25s ease;
}

.btn-play:hover {
  background: #000;
  transform: scale(1.02);
}

.btn-like {
  height: 44px;
  padding: 0 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  background: transparent;
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  color: #86868b;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.25s ease;
}

.btn-like:hover {
  border-color: rgba(0, 0, 0, 0.15);
  color: #1d1d1f;
}

.btn-like.liked {
  color: #ff6b6b;
  border-color: rgba(255, 107, 107, 0.2);
  background: rgba(255, 107, 107, 0.04);
}

.detail-desc {
  padding: 0 28px 20px;
  font-size: 15px;
  color: #6e6e73;
  line-height: 1.65;
}

.detail-attach-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  max-height: 280px;
}

.detail-attach-list::-webkit-scrollbar { width: 4px; }
.detail-attach-list::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 2px; }

.attach-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 28px;
  transition: background 0.2s ease;
}

.attach-row:hover { background: rgba(0, 0, 0, 0.02); }

.attach-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.ai-xlsx { background: #e8f5ed; color: #2d8b55; }
.ai-docx { background: #e8eff8; color: #3b6fb5; }
.ai-pdf { background: #fceeed; color: #c44536; }
.ai-pptx { background: #fdf3e7; color: #d4841c; }
.ai-zip { background: #f0ede8; color: #8b7355; }

.attach-info { flex: 1; min-width: 0; }

.attach-name {
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attach-size {
  font-size: 12px;
  color: #aeaeb2;
  margin-top: 2px;
}

.attach-download {
  height: 32px;
  padding: 0 14px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  color: #86868b;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.attach-download:hover {
  border-color: rgba(0, 0, 0, 0.15);
  color: #1d1d1f;
}

.attach-empty {
  padding: 32px;
  text-align: center;
  color: #aeaeb2;
  font-size: 15px;
}

.detail-footer {
  padding: 14px 28px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
  font-size: 12px;
  color: #aeaeb2;
}

/* ===== Video Player (Video.js) ===== */
.player-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.player-wrapper {
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  background: #000;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.06), 0 32px 80px -12px rgba(0,0,0,0.7);
  max-width: 96vw;
  width: max-content;
}

.player-wrapper::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  padding: 1px;
  background: linear-gradient(160deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 40%, transparent 60%, rgba(120,120,255,0.06) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  z-index: 30;
}

.player-wrapper::after {
  content: '';
  position: absolute;
  top: -1px;
  left: 15%;
  right: 15%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
  z-index: 31;
  pointer-events: none;
}

.video-area {
  position: relative;
  width: 960px;
  max-width: 96vw;
  background: #000;
  overflow: hidden;
}

.center-play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.center-play-btn {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1.5px solid rgba(255,255,255,0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}

.center-play-btn.loading-state {
  cursor: default;
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.08);
}

.player-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: rgba(10, 10, 10, 0.95);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}

.player-title-text {
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 16px;
}

.player-close-btn {
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

.player-close-btn:hover {
  background: rgba(255,255,255,0.12);
  color: #fff;
}

/* ===== Transitions ===== */
.modal-fade-enter-active { transition: opacity 0.35s ease; }
.modal-fade-leave-active { transition: opacity 0.25s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-active .detail-modal,
.modal-fade-enter-active .player-wrapper {
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.modal-fade-enter-from .detail-modal {
  transform: scale(0.95) translateY(16px);
}
.modal-fade-enter-from .player-wrapper {
  transform: scale(0.95);
}
.modal-fade-leave-active .detail-modal,
.modal-fade-leave-active .player-wrapper {
  transition: transform 0.25s ease;
}
.modal-fade-leave-to .detail-modal {
  transform: scale(0.98) translateY(8px);
}
.modal-fade-leave-to .player-wrapper {
  transform: scale(0.98);
}

/* Toast */
.toast-container {
  position: fixed;
  top: 72px;
  right: 32px;
  z-index: 9999999;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast-item {
  background: rgba(29, 29, 31, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 14px;
  padding: 12px 18px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #fff;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.toast-item svg { color: #34c759; flex-shrink: 0; }

.toast-anim-enter-active { transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.toast-anim-leave-active { transition: all 0.25s ease; }
.toast-anim-enter-from { opacity: 0; transform: translateX(40px) scale(0.95); }
.toast-anim-leave-to { opacity: 0; transform: translateX(40px) scale(0.95); }

/* --- Responsive --- */
@media (max-width: 1024px) {
  .course-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    padding: 32px 24px 20px;
  }
  .hero-title { font-size: 44px; }
  .hero-subtitle { font-size: 19px; }
}

@media (max-width: 768px) {
  .hero { padding: 40px 20px 20px; }
  .hero-title { font-size: 28px; }
  .hero-subtitle { font-size: 13px; margin-bottom: 28px; }
  .hero-search input { height: 46px; font-size: 14px; border-radius: 14px; }

  .filter-bar-inner { padding: 10px 16px; }
  .filter-panel { padding: 4px 16px 12px; }
  .filter-chip { padding: 5px 10px; font-size: 12px; }
  .filter-label { font-size: 11px; width: 28px; }
  .sort-pill { padding: 4px 10px; font-size: 11px; }
  .filter-toggle { padding: 6px 10px; font-size: 12px; }
  .filter-reset-btn { padding: 6px 10px; font-size: 12px; }

  .course-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 24px 16px 16px;
  }

  .card { border-radius: 16px; }
  .card-thumb { border-radius: 16px 16px 0 0; }

  .detail-modal { border-radius: 20px; margin: 16px; }
  .detail-modal-header { padding: 20px 20px 16px; }
  .detail-modal-title { font-size: 18px; }
  .detail-actions { padding: 0 20px 16px; }
  .detail-desc { padding: 0 20px 16px; }
  .attach-row { padding: 10px 20px; }
  .detail-footer { padding: 12px 20px; }

  .toast-container { right: 16px; top: 64px; }

  .player-wrapper { border-radius: 14px; }
  .video-area { width: 100% !important; }
}
</style>

<!-- Video.js 样式覆盖（不使用 scoped，否则无法作用于动态创建的 DOM） -->
<style>
.player-wrapper .video-js {
  font-family: inherit;
  width: 100%;
}

.player-wrapper .video-js .vjs-big-play-button {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1.5px solid rgba(255,255,255,0.18);
  line-height: 80px;
  font-size: 40px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transition: all 0.2s ease;
}

.player-wrapper .video-js .vjs-big-play-button:hover {
  background: rgba(255,255,255,0.18);
  transform: translate(-50%, -50%) scale(1.08);
}

.player-wrapper .video-js .vjs-big-play-button .vjs-icon-placeholder::before {
  display: flex;
  align-items: center;
  justify-content: center;
}

.player-wrapper .video-js .vjs-control-bar {
  background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);
  height: 44px;
  padding: 0 8px;
}

.player-wrapper .video-js .vjs-play-progress,
.player-wrapper .video-js .vjs-volume-level {
  background: #fff;
}

.player-wrapper .video-js .vjs-slider {
  background: rgba(255,255,255,0.2);
}

.player-wrapper .video-js .vjs-load-progress div {
  background: rgba(255,255,255,0.1);
}

.player-wrapper .video-js .vjs-time-control {
  font-variant-numeric: tabular-nums;
  font-size: 13px;
  color: rgba(255,255,255,0.8);
  line-height: 44px;
  padding: 0 4px;
}

/* Video.js 自带全屏模式样式 */
.video-js.vjs-fullscreen {
  width: 100% !important;
  height: 100% !important;
}

.video-js.vjs-fullscreen video {
  object-fit: contain;
}

@media (max-width: 768px) {
  .player-wrapper .video-js .vjs-big-play-button { width: 64px; height: 64px; line-height: 64px; font-size: 32px; }
  .player-wrapper .video-js .vjs-control-bar { height: 38px; }
  .player-wrapper .video-js .vjs-time-control { font-size: 12px; line-height: 38px; }
}
</style>
