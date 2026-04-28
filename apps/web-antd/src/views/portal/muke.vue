<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue';
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
const pageSize = 16;

// 筛选状态
const mukeSearch = ref('');
const mukeSort = ref('new');
const sidebarExpanded = ref(false);
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
    const catRes = await getMediaTagList(1); // type=1 分类标签
    const dirRes = await getMediaTagList(2); // type=2 方向标签
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

// 初始化加载
onMounted(() => {
  loadTags();
  loadVideos();
});

// 监听筛选条件变化
watch([mukeSearch, mukeSort, fDirection, fCategory, fYear, fAuthor], () => {
  currentPage.value = 1;
  loadVideos();
});

// 分页
function goToPage(page: number) {
  if (page < 1 || page > Math.ceil(total.value / pageSize)) return;
  currentPage.value = page;
  loadVideos();
}

// 重置筛选
function resetFilters() {
  fDirection.value = null;
  fCategory.value = null;
  fYear.value = 'all';
  fAuthor.value = 'all';
  showToast('已重置全部筛选条件');
}

// 格式化时长
function formatDuration(seconds: number | undefined) {
  if (!seconds) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// 格式化文件大小
function formatFileSize(bytes: number) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// 格式化日期
function formatDate(d: string) {
  if (!d) return '';
  return d.substring(0, 10);
}

// 播放视频
const playerOpen = ref(false);
const playerLoading = ref(false);
const playerVideo = ref<MediaVideoVo | null>(null);
const playerSrc = ref('');
let playerBlobUrl = '';

async function playVideo(video: MediaVideoVo) {
  playerVideo.value = video;
  playerOpen.value = true;
  playerLoading.value = true;
  playerSrc.value = '';
  try {
    const { useAccessStore } = await import('@vben/stores');
    const { useAppConfig } = await import('@vben/hooks');
    const token = useAccessStore().accessToken;
    const { clientId } = useAppConfig(import.meta.env, import.meta.env.PROD);
    const res = await fetch(getMediaPlayUrl(video.videoId), {
      headers: {
        Authorization: `Bearer ${token}`,
        ClientID: clientId,
      },
    });
    if (!res.ok) throw new Error(`播放失败: ${res.status}`);
    const blob = await res.blob();
    if (playerBlobUrl) URL.revokeObjectURL(playerBlobUrl);
    playerBlobUrl = URL.createObjectURL(blob);
    playerSrc.value = playerBlobUrl;
  } catch (e) {
    console.error('加载视频失败:', e);
    showToast('视频加载失败，请稍后重试');
  } finally {
    playerLoading.value = false;
  }
}

function closePlayer() {
  playerOpen.value = false;
  playerVideo.value = null;
  playerSrc.value = '';
  if (playerBlobUrl) {
    URL.revokeObjectURL(playerBlobUrl);
    playerBlobUrl = '';
  }
}

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
    // 同步更新列表中的状态
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

// 点击右侧区域自动折叠（无筛选条件时）
function handleMainClick() {
  if (sidebarExpanded.value && filterBadge.value === 0) {
    sidebarExpanded.value = false;
  }
}

// 切换侧边栏展开状态
function toggleSidebar() {
  sidebarExpanded.value = !sidebarExpanded.value;
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
  <div class="portal-muke-page">
    <!-- 主布局 -->
    <div class="muke-layout">
      <!-- 左侧筛选面板 -->
      <aside class="muke-sidebar" :class="{ expanded: sidebarExpanded }">
        <div class="sidebar-header" @click="toggleSidebar">
          <i class="fa-solid fa-sliders"></i>
          <div class="sidebar-header-text">
            筛选条件
            <span v-if="filterBadge > 0" class="filter-active-count">{{ filterBadge }}</span>
          </div>
        </div>

        <div class="filter-group">
          <div class="filter-label">方向</div>
          <div class="filter-tags">
            <span class="filter-tag" :class="{ active: !fDirection }" @click="setDirectionFilter(null)">全部</span>
            <span v-for="t in directionTags" :key="t.tagId" class="filter-tag" :class="{ active: fDirection === t.tagId }" @click="setDirectionFilter(t.tagId)">{{ t.tagName }}</span>
          </div>
        </div>

        <div class="filter-group">
          <div class="filter-label">分类</div>
          <div class="filter-tags">
            <span class="filter-tag" :class="{ active: !fCategory }" @click="setCategoryFilter(null)">全部</span>
            <span v-for="t in categoryTags" :key="t.tagId" class="filter-tag" :class="{ active: fCategory === t.tagId }" @click="setCategoryFilter(t.tagId)">{{ t.tagName }}</span>
          </div>
        </div>

        <div class="filter-group">
          <div class="filter-label">年份</div>
          <select class="filter-select" v-model="fYear">
            <option value="all">全部年份</option>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
        </div>

        <div class="filter-group">
          <div class="filter-label">讲师</div>
          <select class="filter-select" v-model="fAuthor">
            <option value="all">全部讲师</option>
          </select>
        </div>

        <div class="filter-reset" @click="resetFilters">
          <i class="fa-solid fa-rotate-left"></i>
          重置筛选
        </div>
      </aside>

      <!-- 右侧主内容 -->
      <main class="muke-main" @click="handleMainClick">
        <div class="main-header">
          <div class="main-title-area">
            <div class="main-title">讲武堂</div>
            <div class="main-desc">让每一次学习，学以致用</div>
          </div>
          <div class="main-search">
            <input type="text" v-model="mukeSearch" placeholder="搜索课程名称、讲师...">
            <i class="fa-solid fa-magnifying-glass"></i>
          </div>
        </div>

        <div class="sort-bar">
          <span class="sort-left"></span>
          <div class="sort-right">
            <button class="sort-btn" :class="{ active: mukeSort === 'new' }" @click="mukeSort = 'new'">
              <i class="fa-regular fa-clock"></i>最新
            </button>
            <button class="sort-btn" :class="{ active: mukeSort === 'hot' }" @click="mukeSort = 'hot'">
              <i class="fa-solid fa-fire"></i>热门
            </button>
            <button class="sort-btn" :class="{ active: mukeSort === 'name' }" @click="mukeSort = 'name'">
              <i class="fa-solid fa-arrow-down-a-z"></i>名称
            </button>
          </div>
        </div>

        <!-- 加载中 -->
        <div v-if="loading" class="muke-loading">
          <i class="fa-solid fa-spinner fa-spin"></i>
          <span>加载中...</span>
        </div>

        <!-- 课程网格 -->
        <div v-else-if="videos.length > 0" class="course-grid">
          <div v-for="(v, idx) in videos" :key="v.videoId" class="course-card" :style="{ animationDelay: `${idx * 0.04}s` }">
            <div class="course-thumb" @click="playVideo(v)">
              <img v-if="v.thumbnail" :src="v.thumbnail" :alt="v.title" loading="lazy">
              <div v-else class="thumb-placeholder"><i class="fa-solid fa-video"></i></div>
              <div class="course-thumb-overlay"></div>
              <div class="course-views"><i class="fa-regular fa-eye"></i>{{ v.viewCount.toLocaleString() }}</div>
              <div class="course-play"><i class="fa-solid fa-play"></i></div>
            </div>
            <div class="course-body" @click="openDetail(v)">
              <div class="course-title-wrapper">
                <div class="course-title">{{ v.title }}</div>
                <div class="course-attach-badge-inline">
                  <i class="fa-solid fa-paperclip"></i>附件({{ v.attachmentCount || 0 }})
                </div>
              </div>
              <div class="course-meta-row">
                <div class="meta-author">
                  <div class="meta-avatar">{{ v.authorName?.charAt(0) || '?' }}</div>
                  <span>{{ v.authorName || '未知' }}</span>
                </div>
                <div class="meta-date"><i class="fa-regular fa-calendar"></i>{{ formatDate(v.createTime) }}</div>
              </div>
            </div>
            <div class="course-footer" @click="openDetail(v)">
              <div class="course-like" @click="toggleLikeOnCard(v, $event)">
                <div class="like-btn" :class="{ active: v.hasLiked }">
                  <i :class="likingVideoId === v.videoId ? 'fa-solid fa-spinner fa-spin' : (v.hasLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart')"></i>
                </div>
                <span class="like-count">{{ v.likeCount }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state show">
          <div class="empty-icon"><i class="fa-regular fa-circle-play"></i></div>
          <div class="empty-title">未找到匹配课程</div>
          <div class="empty-desc">请尝试调整筛选条件或关键词</div>
        </div>

        <!-- 分页 -->
        <div v-if="totalPages > 1 && !loading" class="muke-pagination">
          <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
            <i class="fa-solid fa-chevron-left"></i>
          </button>
          <template v-for="p in pageNumbers" :key="p">
            <span v-if="p === '...'" class="page-ellipsis">…</span>
            <button v-else class="page-btn" :class="{ active: p === currentPage }" @click="goToPage(p as number)">
              {{ p }}
            </button>
          </template>
          <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>
      </main>
    </div>

    <!-- 详情弹窗 -->
    <Teleport to="body">
      <div v-if="detailModalOpen" class="modal-overlay open" @click.self="closeDetail">
        <div class="modal">
          <div class="modal-header">
            <div class="modal-icon"><i class="fa-solid fa-paperclip"></i></div>
            <div class="modal-info">
              <div class="modal-title">{{ selectedVideo?.title }}</div>
              <div class="modal-sub">
                {{ videoDetail?.authorName || selectedVideo?.authorName }} ·
                {{ formatDuration(videoDetail?.duration) }} ·
                {{ videoAttachments.length }} 份附件
              </div>
            </div>
            <button class="modal-close" @click="closeDetail"><i class="fa-solid fa-xmark"></i></button>
          </div>

          <!-- 加载中 -->
          <div v-if="detailLoading" class="modal-loading">
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>加载中...</span>
          </div>

          <template v-else-if="videoDetail">
            <!-- 操作栏 -->
            <div class="detail-actions">
              <button class="detail-action-btn play-btn" @click="closeDetail(); playVideo(selectedVideo!)">
                <i class="fa-solid fa-play"></i>播放视频
              </button>
              <button class="detail-action-btn like-btn" :class="{ liked: videoDetail.hasLiked }" @click="handleLike" :disabled="likingVideoId === videoDetail.videoId">
                <i :class="likingVideoId === videoDetail.videoId ? 'fa-solid fa-spinner fa-spin' : (videoDetail.hasLiked ? 'fa-solid fa-heart' : 'fa-regular fa-heart')"></i>
                {{ videoDetail.hasLiked ? '已点赞' : '点赞' }} · {{ videoDetail.likeCount }}
              </button>
            </div>

            <!-- 描述 -->
            <div v-if="videoDetail.description" class="detail-desc">
              {{ videoDetail.description }}
            </div>

            <!-- 附件列表 -->
            <div class="modal-body">
              <div v-for="a in videoAttachments" :key="a.attachmentId" class="attach-item">
                <div class="attach-icon" :class="aiCls(a.fileFormat || 'pdf')"><i :class="aiFA(a.fileFormat || 'pdf')"></i></div>
                <div class="attach-info">
                  <div class="attach-name">{{ a.fileName }}</div>
                  <div class="attach-meta">{{ formatFileSize(a.fileSize) }}</div>
                </div>
                <button class="attach-dl" @click="downloadAttach(a)"><i class="fa-solid fa-download"></i>下载</button>
              </div>
              <div v-if="videoAttachments.length === 0" class="attach-empty">暂无附件</div>
            </div>
          </template>

          <div class="modal-footer">
            <div class="modal-footer-info">发布于 {{ formatDate(videoDetail?.createTime || selectedVideo?.createTime) }}</div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 播放弹窗 -->
    <Teleport to="body">
      <div v-if="playerOpen" class="player-overlay open" @click.self="closePlayer">
        <div class="player-modal">
          <div class="player-header">
            <div class="player-title">{{ playerVideo?.title }}</div>
            <button class="player-close" @click="closePlayer"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="player-body">
            <div v-if="playerLoading" class="player-loading">
              <i class="fa-solid fa-spinner fa-spin"></i>
              <span>视频加载中...</span>
            </div>
            <video
              v-show="!playerLoading"
              :src="playerSrc"
              controls
              autoplay
              class="player-video"
            ></video>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast通知 -->
    <Teleport to="body">
      <div class="toast-container">
        <div v-for="t in toasts" :key="t.id" class="toast">
          <i class="fa-regular fa-circle-check"></i>
          <span>{{ t.msg }}</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.portal-muke-page {
  animation: fadeUp 0.7s ease both;
}

.muke-layout {
  display: flex;
  min-height: calc(100vh - 56px);
}

/* ===== 左侧筛选面板 ===== */
.muke-sidebar {
  width: 48px;
  background: #FFFFFF;
  border-right: 1px solid #ECECEC;
  padding: 12px 8px;
  position: sticky;
  top: 56px;
  height: calc(100vh - 56px);
  overflow-y: auto;
  flex-shrink: 0;
  transition: width 0.25s ease, padding 0.25s ease;
  cursor: pointer;
}

.muke-sidebar::-webkit-scrollbar { width: 4px; }
.muke-sidebar::-webkit-scrollbar-thumb { background: #ECECEC; border-radius: 2px; }

.muke-sidebar.expanded {
  width: 220px;
  padding: 24px 18px;
  cursor: default;
}

.muke-sidebar:not(.expanded) .sidebar-header-text { display: none; }
.muke-sidebar:not(.expanded) .filter-group { display: none; }
.muke-sidebar:not(.expanded) .filter-reset { display: none; }

.sidebar-header {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-header i {
  font-size: 14px;
  color: #A0A0A0;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: 0.25s;
}

.muke-sidebar:hover .sidebar-header i { background: #ECECEC; color: #1A1A1A; }
.muke-sidebar.expanded .sidebar-header i { background: #1A1A1A; color: #fff; }

.sidebar-header-text { flex: 1; }

.filter-active-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  background: #2D8B55;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  border-radius: 4px;
  margin-left: 6px;
}

.filter-group {
  margin-bottom: 18px;
}

.filter-label {
  font-size: 11px;
  color: #A0A0A0;
  margin-bottom: 8px;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.filter-tag {
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 400;
  color: #6B6B6B;
  background: #F5F5F5;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.25s;
  user-select: none;
}

.filter-tag:hover { background: #ECECEC; }
.filter-tag.active {
  background: #1A1A1A;
  color: #fff;
  font-weight: 500;
}

.filter-select {
  width: 100%;
  height: 32px;
  border: 1px solid #ECECEC;
  border-radius: 6px;
  padding: 0 10px;
  font-size: 12px;
  font-family: inherit;
  color: #1A1A1A;
  background: #FAFAFA;
  cursor: pointer;
  transition: 0.25s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A0A0A0' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  padding-right: 26px;
}

.filter-select:hover { border-color: #A0A0A0; }
.filter-select:focus { border-color: #1A1A1A; outline: none; }

.filter-reset {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #A0A0A0;
  cursor: pointer;
  transition: 0.25s;
  padding: 8px 0;
  margin-top: 8px;
}

.filter-reset:hover { color: #1A1A1A; }
.filter-reset i { font-size: 10px; }

/* ===== 右侧主内容 ===== */
.muke-main {
  flex: 1;
  padding: 28px 32px 48px;
  min-width: 0;
}

.main-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.main-title-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.main-title {
  font-size: 42px;
  font-weight: 900;
  letter-spacing: -1px;
  color: #1A1A1A;
  display: flex;
  align-items: center;
  gap: 10px;
}

.main-title span {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  font-style: italic;
  opacity: 0.12;
  font-size: 26px;
}

.main-desc {
  font-size: 14px;
  color: #A0A0A0;
  font-weight: 300;
  margin-bottom: 12px;
  letter-spacing: 0.3px;
}

.main-search {
  position: relative;
  width: 100%;
  max-width: 760px;
}

.main-search input {
  width: 100%;
  height: 44px;
  border: 2px solid #ECECEC;
  border-radius: 12px;
  padding: 0 16px 0 40px;
  font-size: 14px;
  font-family: inherit;
  color: #1A1A1A;
  background: #FFFFFF;
  transition: 0.25s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.main-search input:hover { border-color: #D5D5D5; }
.main-search input:focus { border-color: #1A1A1A; outline: none; box-shadow: 0 0 0 4px rgba(26, 26, 26, 0.08); }
.main-search input::placeholder { color: #A0A0A0; font-weight: 300; }

.main-search i {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
  color: #A0A0A0;
  pointer-events: none;
}

/* 排序栏 */
.sort-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 1px solid #F3F3F3;
}

.sort-left { font-size: 12px; color: #A0A0A0; font-weight: 300; }
.sort-right { display: flex; gap: 4px; }

.sort-btn {
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 400;
  color: #A0A0A0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  transition: 0.25s;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 4px;
}

.sort-btn:hover { color: #6B6B6B; background: #F5F5F5; }
.sort-btn.active {
  color: #1A1A1A;
  border-color: #ECECEC;
  background: #F5F5F5;
  font-weight: 500;
}

.sort-btn i { font-size: 10px; }

/* 加载中 */
.muke-loading {
  padding: 60px 24px;
  text-align: center;
  color: #A0A0A0;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.muke-loading i { font-size: 28px; }

/* 课程网格 */
.course-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.course-card {
  background: #FFFFFF;
  border: 1px solid #ECECEC;
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: 0.25s;
  animation: toastIn 0.35s ease both;
}

.course-card:hover {
  border-color: #D0D0D0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.course-thumb {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  overflow: hidden;
}

.course-thumb img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.thumb-placeholder {
  position: absolute;
  inset: 0;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #A0A0A0;
}

.course-card:hover .course-thumb img { transform: scale(1.05); }

.course-thumb-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(0, 0, 0, 0.5));
}

.course-cat-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.92);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.5px;
  backdrop-filter: blur(4px);
  color: #6B6B6B;
}

.course-views {
  position: absolute;
  bottom: 10px;
  left: 10px;
  padding: 3px 8px;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 10px;
  font-weight: 500;
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  gap: 4px;
  font-variant-numeric: tabular-nums;
}

.course-views i { font-size: 9px; }

.course-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(0.9);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1A1A1A;
  font-size: 15px;
  opacity: 0;
  transition: 0.25s;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.course-card:hover .course-play { opacity: 1; transform: translate(-50%, -50%) scale(1); }

.course-body { padding: 10px 16px 6px; }

.course-title-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.course-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  line-height: 1.35;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.course-attach-badge-inline {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 6px;
  background: #F5F5F5;
  border-radius: 4px;
  font-size: 10px;
  color: #6B6B6B;
  flex-shrink: 0;
  margin-top: 2px;
}

.course-attach-badge-inline i { font-size: 9px; }

.course-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: #A0A0A0;
}

.meta-author { display: flex; align-items: center; gap: 5px; }

.meta-avatar {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 7px;
  color: #6B6B6B;
  font-weight: 600;
}

.meta-date { display: flex; align-items: center; gap: 3px; }
.meta-date i { font-size: 9px; }

.course-footer {
  padding: 10px 16px 12px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.course-like {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: 0.25s;
}

.like-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid #ECECEC;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #A0A0A0;
  transition: 0.25s;
}

.like-btn:hover { border-color: #E0E0E0; background: #F5F5F5; }
.like-btn.active { border-color: #C44536; background: #FCEEEC; color: #C44536; }
.like-btn i { font-size: 11px; }

.like-count { font-size: 11px; color: #A0A0A0; font-weight: 400; }
.course-like:hover .like-count { color: #6B6B6B; }

/* 空状态 */
.empty-state {
  padding: 48px 24px;
  text-align: center;
}

.empty-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
  font-size: 18px;
  color: #A0A0A0;
}

.empty-title { font-size: 14px; font-weight: 600; color: #6B6B6B; margin-bottom: 4px; }
.empty-desc { font-size: 13px; color: #A0A0A0; font-weight: 300; }

/* 分页 */
.muke-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 32px;
}

.page-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #ECECEC;
  border-radius: 8px;
  background: #FFFFFF;
  color: #6B6B6B;
  font-size: 13px;
  cursor: pointer;
  transition: 0.2s;
}

.page-btn:hover:not(:disabled):not(.active) {
  border-color: #C0C0C0;
  background: #F5F5F5;
  color: #1A1A1A;
}

.page-btn.active {
  background: #1A1A1A;
  color: #fff;
  border-color: #1A1A1A;
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-ellipsis {
  color: #A0A0A0;
  font-size: 13px;
  padding: 0 4px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  padding: 24px;
}

.modal-overlay.open { opacity: 1; pointer-events: auto; }

.modal {
  background: #FFFFFF;
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  transform: scale(0.96) translateY(12px);
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-overlay.open .modal { transform: scale(1) translateY(0); }

.modal-header {
  padding: 20px 22px 14px;
  border-bottom: 1px solid #F3F3F3;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.modal-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #1A1A1A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: #fff;
}

.modal-info { flex: 1; min-width: 0; }

.modal-title {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal-sub { font-size: 11px; color: #A0A0A0; font-weight: 300; margin-top: 2px; }

.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #ECECEC;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 0.25s;
  color: #A0A0A0;
  font-size: 13px;
}

.modal-close:hover { border-color: #1A1A1A; color: #1A1A1A; background: #F5F5F5; }

.modal-loading {
  padding: 40px 24px;
  text-align: center;
  color: #A0A0A0;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.modal-loading i { font-size: 28px; }

.detail-actions {
  padding: 16px 22px;
  display: flex;
  gap: 12px;
  border-bottom: 1px solid #F3F3F3;
}

.detail-action-btn {
  height: 38px;
  padding: 0 18px;
  border-radius: 10px;
  border: 1px solid #ECECEC;
  background: #FFFFFF;
  font-size: 13px;
  color: #6B6B6B;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: 0.25s;
}

.detail-action-btn:hover { border-color: #1A1A1A; color: #1A1A1A; }

.detail-action-btn.play-btn {
  background: #C44536;
  color: #fff;
  border-color: #C44536;
}

.detail-action-btn.play-btn:hover { background: #A33A2B; border-color: #A33A2B; }

.detail-action-btn.like-btn.liked {
  color: #C44536;
  border-color: #FCEEEC;
  background: #FCEEEC;
}

.detail-desc {
  padding: 16px 22px;
  font-size: 13px;
  color: #6B6B6B;
  line-height: 1.6;
  border-bottom: 1px solid #F3F3F3;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
  max-height: 300px;
}

.modal-body::-webkit-scrollbar { width: 4px; }
.modal-body::-webkit-scrollbar-thumb { background: #ECECEC; border-radius: 2px; }

.attach-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 22px;
  transition: 0.25s;
  cursor: default;
}

.attach-item:hover { background: #F5F5F5; }

.attach-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

.ai-xlsx { background: #EFF7F2; color: #2D8B55; }
.ai-docx { background: #EEF3F9; color: #3B6FB5; }
.ai-pdf { background: #FCEEEC; color: #C44536; }
.ai-pptx { background: #FDF3E7; color: #D4841C; }
.ai-zip { background: #F0EDE8; color: #8B7355; }

.attach-info { flex: 1; min-width: 0; }

.attach-name {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attach-meta { font-size: 11px; color: #A0A0A0; font-weight: 300; margin-top: 1px; }

.attach-dl {
  height: 28px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid #ECECEC;
  background: #FFFFFF;
  font-size: 11px;
  font-weight: 500;
  color: #6B6B6B;
  cursor: pointer;
  transition: 0.25s;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 4px;
}

.attach-dl:hover { border-color: #1A1A1A; color: #1A1A1A; }
.attach-dl i { font-size: 9px; }

.attach-empty {
  padding: 24px;
  text-align: center;
  color: #A0A0A0;
  font-size: 13px;
}

.modal-footer {
  padding: 10px 22px;
  border-top: 1px solid #F3F3F3;
  flex-shrink: 0;
}

.modal-footer-info { font-size: 11px; color: #A0A0A0; font-weight: 300; }

/* Toast */
.toast-container {
  position: fixed;
  top: 64px;
  right: 32px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.toast {
  background: #FFFFFF;
  border: 1px solid #ECECEC;
  border-radius: 8px;
  padding: 10px 14px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #1A1A1A;
  animation: toastIn 0.35s ease both;
}

.toast i { color: #2D8B55; font-size: 13px; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes toastIn {
  from { opacity: 0; transform: translateX(24px); }
  to { opacity: 1; transform: translateX(0); }
}

/* 响应式 */
@media (max-width: 1200px) {
  .course-grid { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 900px) {
  .course-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .muke-sidebar {
    width: 100%;
    height: auto;
    position: relative;
    top: 0;
    border-right: none;
    border-bottom: 1px solid #ECECEC;
    padding: 16px 20px;
    cursor: default;
  }
  .muke-sidebar .sidebar-header-text { display: block !important; }
  .muke-sidebar .filter-group { display: block !important; }
  .muke-sidebar .filter-reset { display: flex !important; }
  .filter-tags { gap: 4px; }

  .muke-main { padding: 20px 16px 32px; }
  .course-grid { grid-template-columns: 1fr; }
  .main-search { width: 100%; }
  .toast-container { right: 16px; }
}

/* 播放弹窗 */
.player-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  z-index: 999999;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
  padding: 24px;
}

.player-overlay.open { opacity: 1; pointer-events: auto; }

.player-modal {
  background: #000;
  border-radius: 16px;
  overflow: hidden;
  width: 100%;
  max-width: 860px;
  display: flex;
  flex-direction: column;
  transform: scale(0.96);
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.player-overlay.open .player-modal { transform: scale(1); }

.player-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: #1A1A1A;
}

.player-title {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  margin-right: 12px;
}

.player-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #A0A0A0;
  font-size: 14px;
  transition: 0.25s;
  flex-shrink: 0;
}

.player-close:hover { background: rgba(255, 255, 255, 0.2); color: #fff; }

.player-body {
  width: 100%;
  background: #000;
}

.player-video {
  width: 100%;
  display: block;
  max-height: 70vh;
  outline: none;
}

.player-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 120px 24px;
  color: #A0A0A0;
  font-size: 14px;
}

.player-loading i { font-size: 28px; }
</style>