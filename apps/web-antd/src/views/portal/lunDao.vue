<script lang="ts" setup>
import { ref, computed } from 'vue';

// ===== Mock 数据 =====
interface TopicItem {
  type: 'folder' | 'doc';
  id: number;
  name: string;
  fileType?: string;
  fileSize?: number;
}

interface Topic {
  topicId: number;
  title: string;
  description: string;
  coverGradient: string;
  creatorName: string;
  docCount: number;
  viewCount: number;
  likeCount: number;
  tags: string[];
  createTime: string;
  items: TopicItem[];
}

const mockTopics: Topic[] = [
  {
    topicId: 1,
    title: '新员工入职指南',
    description: '涵盖公司制度、IT系统使用、业务流程等核心入职培训文档，帮助新员工快速融入团队。',
    coverGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    creatorName: '人力资源部',
    docCount: 18,
    viewCount: 2340,
    likeCount: 128,
    tags: ['入职', '培训', '制度'],
    createTime: '2026-04-20',
    items: [
      { type: 'folder', id: 101, name: '公司制度' },
      { type: 'folder', id: 102, name: 'IT系统使用手册' },
      { type: 'doc', id: 201, name: '员工手册.pdf', fileType: 'pdf', fileSize: 2048000 },
      { type: 'doc', id: 202, name: '考勤制度.docx', fileType: 'docx', fileSize: 512000 },
    ],
  },
  {
    topicId: 2,
    title: '项目管理实战手册',
    description: '从需求分析到上线交付的全流程项目管理方法论，附PMP备考资料和实际案例。',
    coverGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    creatorName: '项目管理办公室',
    docCount: 24,
    viewCount: 1856,
    likeCount: 96,
    tags: ['项目管理', 'PMP', '流程'],
    createTime: '2026-04-15',
    items: [
      { type: 'folder', id: 103, name: 'PMP备考资料' },
      { type: 'doc', id: 203, name: '项目立项流程.pdf', fileType: 'pdf', fileSize: 1024000 },
      { type: 'doc', id: 204, name: '风险管理模板.xlsx', fileType: 'xlsx', fileSize: 256000 },
    ],
  },
  {
    topicId: 3,
    title: '数据安全合规专题',
    description: '数据安全法规解读、公司数据分级标准、个人信息保护实践指南等核心文档汇编。',
    coverGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    creatorName: '信息安全部',
    docCount: 12,
    viewCount: 3102,
    likeCount: 201,
    tags: ['安全', '合规', '数据保护'],
    createTime: '2026-04-10',
    items: [
      { type: 'doc', id: 205, name: '数据安全法解读.pdf', fileType: 'pdf', fileSize: 3072000 },
      { type: 'doc', id: 206, name: '数据分级标准.docx', fileType: 'docx', fileSize: 768000 },
      { type: 'folder', id: 104, name: '个人信息保护指南' },
    ],
  },
  {
    topicId: 4,
    title: '前端技术栈进阶',
    description: 'Vue3/TypeScript/Vite 现代化前端技术栈学习路径，从基础到实战的完整资料合集。',
    coverGradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    creatorName: '技术部',
    docCount: 32,
    viewCount: 4521,
    likeCount: 287,
    tags: ['前端', 'Vue3', 'TypeScript'],
    createTime: '2026-03-28',
    items: [
      { type: 'folder', id: 105, name: 'Vue3 核心概念' },
      { type: 'folder', id: 106, name: 'TypeScript 实战' },
      { type: 'doc', id: 207, name: 'Vite工程化指南.pdf', fileType: 'pdf', fileSize: 1536000 },
    ],
  },
  {
    topicId: 5,
    title: '客户沟通技巧',
    description: '商务谈判、需求调研、客户关系维护等实战技巧文档，含情景模拟案例。',
    coverGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    creatorName: '销售部',
    docCount: 9,
    viewCount: 1567,
    likeCount: 83,
    tags: ['沟通', '商务', '谈判'],
    createTime: '2026-03-15',
    items: [
      { type: 'doc', id: 208, name: '商务沟通方法论.pdf', fileType: 'pdf', fileSize: 1280000 },
      { type: 'doc', id: 209, name: '需求调研模板.docx', fileType: 'docx', fileSize: 384000 },
      { type: 'folder', id: 107, name: '情景模拟案例' },
    ],
  },
  {
    topicId: 6,
    title: 'DevOps实践指南',
    description: 'CI/CD流水线搭建、容器化部署、监控告警等DevOps全链路实践文档。',
    coverGradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    creatorName: '运维部',
    docCount: 15,
    viewCount: 2089,
    likeCount: 145,
    tags: ['DevOps', 'CI/CD', '容器化'],
    createTime: '2026-03-01',
    items: [
      { type: 'folder', id: 108, name: 'Jenkins流水线配置' },
      { type: 'doc', id: 210, name: 'Docker部署手册.pdf', fileType: 'pdf', fileSize: 2048000 },
      { type: 'doc', id: 211, name: 'K8s运维手册.pdf', fileType: 'pdf', fileSize: 3072000 },
    ],
  },
  {
    topicId: 7,
    title: '财务报表分析入门',
    description: '资产负债表、利润表、现金流量表解读方法，附实际企业案例分析。',
    coverGradient: 'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    creatorName: '财务部',
    docCount: 8,
    viewCount: 987,
    likeCount: 56,
    tags: ['财务', '报表', '分析'],
    createTime: '2026-02-20',
    items: [
      { type: 'doc', id: 212, name: '三大报表解读.pdf', fileType: 'pdf', fileSize: 1536000 },
      { type: 'doc', id: 213, name: '财务分析模板.xlsx', fileType: 'xlsx', fileSize: 512000 },
    ],
  },
  {
    topicId: 8,
    title: '产品设计方法论',
    description: '用户体验设计、交互规范、设计系统搭建等产品设计的系统化方法论。',
    coverGradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
    creatorName: '设计部',
    docCount: 21,
    viewCount: 2765,
    likeCount: 178,
    tags: ['设计', 'UX', '交互'],
    createTime: '2026-02-10',
    items: [
      { type: 'folder', id: 109, name: '设计规范' },
      { type: 'doc', id: 214, name: '用户体验设计指南.pdf', fileType: 'pdf', fileSize: 2560000 },
      { type: 'doc', id: 215, name: '交互设计原则.pptx', fileType: 'pptx', fileSize: 4096000 },
    ],
  },
  {
    topicId: 9,
    title: '人工智能基础教程',
    description: '机器学习、深度学习入门教程，含Python实战代码和常用算法讲解。',
    coverGradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)',
    creatorName: '技术部',
    docCount: 28,
    viewCount: 5123,
    likeCount: 342,
    tags: ['AI', '机器学习', 'Python'],
    createTime: '2026-01-25',
    items: [
      { type: 'folder', id: 110, name: '机器学习基础' },
      { type: 'folder', id: 111, name: '深度学习入门' },
      { type: 'doc', id: 216, name: 'Python实战手册.pdf', fileType: 'pdf', fileSize: 4096000 },
    ],
  },
];

// ===== 状态 =====
const searchKeyword = ref('');
const currentSort = ref('hot');
const loading = ref(false);

const filteredTopics = computed(() => {
  let list = [...mockTopics];
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim().toLowerCase();
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(kw) ||
        t.description.toLowerCase().includes(kw) ||
        t.tags.some((tag) => tag.toLowerCase().includes(kw)),
    );
  }
  if (currentSort.value === 'hot') {
    list.sort((a, b) => b.viewCount - a.viewCount);
  } else if (currentSort.value === 'new') {
    list.sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime());
  } else if (currentSort.value === 'likes') {
    list.sort((a, b) => b.likeCount - a.likeCount);
  }
  return list;
});

// ===== Toast =====
const toasts = ref<{ id: number; msg: string }[]>([]);
let toastIdCounter = 0;

function showToast(msg: string, dur = 2500) {
  const id = ++toastIdCounter;
  toasts.value.push({ id, msg });
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, dur);
}

// ===== 详情弹窗 =====
const detailOpen = ref(false);
const selectedTopic = ref<Topic | null>(null);

function openDetail(topic: Topic) {
  selectedTopic.value = topic;
  detailOpen.value = true;
}

function closeDetail() {
  detailOpen.value = false;
  selectedTopic.value = null;
}

// 点赞
const likingTopicId = ref<number | null>(null);
function toggleLike(topic: Topic, event: Event) {
  event.stopPropagation();
  if (likingTopicId.value === topic.topicId) return;
  likingTopicId.value = topic.topicId;
  topic.likeCount += topic.topicId % 2 === 0 ? 1 : -1;
  showToast(topic.likeCount > 100 ? '已点赞' : '已取消点赞');
  setTimeout(() => {
    likingTopicId.value = null;
  }, 300);
}

function formatDate(d: string) {
  if (!d) return '';
  return d.substring(0, 10);
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

const extFA = (e: string) =>
  ({
    xlsx: 'fa-solid fa-file-excel',
    docx: 'fa-solid fa-file-word',
    pdf: 'fa-solid fa-file-pdf',
    pptx: 'fa-solid fa-file-powerpoint',
  })[e] || 'fa-solid fa-file';
const extCls = (e: string) =>
  ({
    xlsx: 'ai-xlsx',
    docx: 'ai-docx',
    pdf: 'ai-pdf',
    pptx: 'ai-pptx',
  })[e] || 'ai-pdf';
</script>

<template>
  <div class="apple-lundao">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">论道台</h1>
        <p class="hero-subtitle">精选专题，深度学习</p>
        <div class="hero-search">
          <svg class="hero-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input type="text" v-model="searchKeyword" placeholder="搜索专题名称、标签...">
        </div>
      </div>
    </section>

    <!-- Sort Bar -->
    <section class="filter-bar">
      <div class="filter-bar-inner">
        <div class="filter-bar-left">
          <span class="filter-bar-count">共 {{ filteredTopics.length }} 个专题</span>
        </div>
        <div class="filter-sort">
          <button class="sort-pill" :class="{ active: currentSort === 'hot' }" @click="currentSort = 'hot'">热门</button>
          <button class="sort-pill" :class="{ active: currentSort === 'new' }" @click="currentSort = 'new'">最新</button>
          <button class="sort-pill" :class="{ active: currentSort === 'likes' }" @click="currentSort = 'likes'">推荐</button>
        </div>
      </div>
    </section>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="loading-spinner"></div>
      <span>正在加载</span>
    </div>

    <!-- Topic Grid -->
    <section v-else-if="filteredTopics.length > 0" class="topic-grid">
      <article
        v-for="(t, idx) in filteredTopics" :key="t.topicId"
        class="card"
        :style="{ '--i': idx }"
        @click="openDetail(t)"
      >
        <div class="card-cover" :style="{ background: t.coverGradient }">
          <div class="card-cover-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              <line x1="8" y1="7" x2="16" y2="7"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </div>
          <div class="card-doc-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            {{ t.docCount }} 份
          </div>
        </div>
        <div class="card-body">
          <div class="card-main">
            <h3 class="card-title">{{ t.title }}</h3>
            <p class="card-desc">{{ t.description }}</p>
            <div class="card-tags">
              <span v-for="tag in t.tags" :key="tag" class="card-tag">{{ tag }}</span>
            </div>
          </div>
          <div class="card-footer">
            <div class="card-meta">
              <span class="meta-avatar">{{ t.creatorName.charAt(0) }}</span>
              <span class="meta-name">{{ t.creatorName }}</span>
              <span class="meta-dot">·</span>
              <span class="meta-date">{{ formatDate(t.createTime) }}</span>
            </div>
            <div class="card-actions">
              <span class="card-views">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                {{ t.viewCount.toLocaleString() }}
              </span>
              <span class="card-like" @click.stop="toggleLike(t, $event)">
                <i class="fa-regular fa-heart"></i>
                {{ t.likeCount }}
              </span>
            </div>
          </div>
        </div>
      </article>
    </section>

    <!-- Empty -->
    <div v-else class="empty-state">
      <p class="empty-title">未找到匹配专题</p>
      <p class="empty-desc">请尝试调整搜索关键词</p>
    </div>

    <!-- Detail Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="detailOpen && selectedTopic" class="detail-overlay" @click.self="closeDetail">
          <div class="detail-modal">
            <div class="detail-cover" :style="{ background: selectedTopic.coverGradient }">
              <div class="detail-cover-content">
                <div class="detail-cover-icon">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    <line x1="8" y1="7" x2="16" y2="7"/>
                    <line x1="8" y1="11" x2="14" y2="11"/>
                  </svg>
                </div>
                <div class="detail-cover-docs">{{ selectedTopic.docCount }} 份文档</div>
              </div>
              <button class="detail-close" @click="closeDetail">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div class="detail-body">
              <h2 class="detail-title">{{ selectedTopic.title }}</h2>
              <p class="detail-desc">{{ selectedTopic.description }}</p>

              <div class="detail-tags">
                <span v-for="tag in selectedTopic.tags" :key="tag" class="detail-tag">{{ tag }}</span>
              </div>

              <div class="detail-meta-row">
                <div class="detail-meta">
                  <span class="detail-meta-avatar">{{ selectedTopic.creatorName.charAt(0) }}</span>
                  <span>{{ selectedTopic.creatorName }}</span>
                </div>
                <span class="detail-meta-date">{{ formatDate(selectedTopic.createTime) }}</span>
              </div>

              <div class="detail-divider"></div>

              <div class="detail-section-title">专题文档</div>
              <div class="detail-item-list">
                <div v-for="item in selectedTopic.items" :key="item.id" class="detail-item">
                  <div class="detail-item-icon" :class="item.type === 'folder' ? 'icon-folder' : extCls(item.fileType || 'pdf')">
                    <i :class="item.type === 'folder' ? 'fa-solid fa-folder' : extFA(item.fileType || 'pdf')"></i>
                  </div>
                  <div class="detail-item-info">
                    <div class="detail-item-name">{{ item.name }}</div>
                    <div class="detail-item-meta">
                      {{ item.type === 'folder' ? '文件夹' : (item.fileType || '').toUpperCase() }}
                      <template v-if="item.fileSize"> · {{ formatFileSize(item.fileSize) }}</template>
                    </div>
                  </div>
                  <i class="fa-solid fa-chevron-right detail-item-arrow"></i>
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
.apple-lundao {
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

.hero-search input:hover { border-color: #D5D5D5; }

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

.filter-bar-count {
  font-size: 13px;
  color: #86868b;
  font-weight: 500;
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

/* --- Topic Grid --- */
.topic-grid {
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
  cursor: pointer;
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
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* --- Card Cover --- */
.card-cover {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-cover-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1.5px solid rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.card:hover .card-cover-icon {
  transform: scale(1.1);
}

.card-doc-badge {
  position: absolute;
  bottom: 12px;
  right: 12px;
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
  padding: 16px 18px 18px;
}

.card-main {
  margin-bottom: 14px;
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #1d1d1f;
  line-height: 1.35;
  margin: 0 0 8px;
  letter-spacing: -0.01em;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-desc {
  font-size: 13px;
  font-weight: 400;
  color: #86868b;
  line-height: 1.55;
  margin: 0 0 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.card-tag {
  padding: 3px 10px;
  border-radius: 980px;
  font-size: 11px;
  font-weight: 500;
  color: #86868b;
  background: rgba(0, 0, 0, 0.04);
}

/* --- Card Footer --- */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.04);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.meta-avatar {
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

.meta-name {
  font-size: 12px;
  color: #86868b;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 80px;
}

.meta-dot {
  font-size: 10px;
  color: #d2d2d7;
  flex-shrink: 0;
}

.meta-date {
  font-size: 12px;
  color: #aeaeb2;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-views {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #aeaeb2;
}

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
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-cover {
  position: relative;
  height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.detail-cover-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.detail-cover-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-cover-docs {
  font-size: 12px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
}

.detail-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.detail-close:hover {
  background: rgba(255, 255, 255, 0.35);
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px 28px;
}

.detail-body::-webkit-scrollbar { width: 4px; }
.detail-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.08); border-radius: 2px; }

.detail-title {
  font-size: 20px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 8px;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

.detail-desc {
  font-size: 14px;
  color: #6e6e73;
  line-height: 1.6;
  margin: 0 0 14px;
}

.detail-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.detail-tag {
  padding: 4px 12px;
  border-radius: 980px;
  font-size: 12px;
  font-weight: 500;
  color: #86868b;
  background: rgba(0, 0, 0, 0.04);
}

.detail-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #86868b;
}

.detail-meta-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f5f5f7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #86868b;
}

.detail-meta-date {
  font-size: 12px;
  color: #aeaeb2;
}

.detail-divider {
  height: 1px;
  background: rgba(0, 0, 0, 0.06);
  margin: 18px 0;
}

.detail-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
  margin-bottom: 12px;
}

.detail-item-list {
  display: flex;
  flex-direction: column;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  transition: background 0.2s ease;
}

.detail-item:last-child { border-bottom: none; }

.detail-item:hover {
  background: rgba(0, 0, 0, 0.015);
  margin: 0 -8px;
  padding: 12px 8px;
  border-radius: 8px;
}

.detail-item-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.icon-folder { background: #f5f5f7; color: #86868b; }
.ai-xlsx { background: #e8f5ed; color: #2d8b55; }
.ai-docx { background: #e8eff8; color: #3b6fb5; }
.ai-pdf { background: #fceeed; color: #c44536; }
.ai-pptx { background: #fdf3e7; color: #d4841c; }

.detail-item-info { flex: 1; min-width: 0; }

.detail-item-name {
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-item-meta {
  font-size: 12px;
  color: #aeaeb2;
  margin-top: 2px;
}

.detail-item-arrow {
  font-size: 10px;
  color: #d2d2d7;
  flex-shrink: 0;
}

/* ===== Transitions ===== */
.modal-fade-enter-active { transition: opacity 0.35s ease; }
.modal-fade-leave-active { transition: opacity 0.25s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-active .detail-modal {
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
.modal-fade-enter-from .detail-modal {
  transform: scale(0.95) translateY(16px);
}
.modal-fade-leave-active .detail-modal {
  transition: transform 0.25s ease;
}
.modal-fade-leave-to .detail-modal {
  transform: scale(0.98) translateY(8px);
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
  .topic-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    padding: 32px 24px 20px;
  }
}

@media (max-width: 768px) {
  .hero { padding: 40px 20px 20px; }
  .hero-title { font-size: 28px; }
  .hero-subtitle { font-size: 13px; margin-bottom: 28px; }
  .hero-search input { height: 46px; font-size: 14px; border-radius: 14px; }

  .filter-bar-inner { padding: 10px 16px; }
  .sort-pill { padding: 4px 10px; font-size: 11px; }

  .topic-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 24px 16px 16px;
  }

  .card { border-radius: 16px; }
  .card-cover { border-radius: 16px 16px 0 0; }

  .detail-modal { border-radius: 20px; margin: 16px; }
  .detail-body { padding: 20px; }
  .detail-title { font-size: 18px; }

  .toast-container { right: 16px; top: 64px; }
}
</style>
