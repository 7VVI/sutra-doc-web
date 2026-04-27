<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { searchDoc, getDeptList, previewDoc, downloadDoc as apiDownloadDoc } from '#/api/kb';
import type { SearchRequest, SearchResult, DocPreviewVo } from '#/api/kb';

import iconExcel from '#/assets/icon-excel.png';
import iconWord from '#/assets/icon-word.png';
import iconPdf from '#/assets/icon-pdf.png';
import iconPpt from '#/assets/icon-ppt.png';

const router = useRouter();
const route = useRoute();

// 搜索参数
const keyword = ref('');
const fileType = ref('');
const currentPage = ref(1);
const pageSize = 10;

// 部门选择
interface SysDept { deptId: number; deptName: string }
const allDepts = ref<SysDept[]>([]);
const selectedDepts = ref(new Set<string>());
const deptPickerOpen = ref(false);
const deptPickerRef = ref<HTMLElement | null>(null);

function onDocumentClick(e: MouseEvent) {
  if (deptPickerOpen.value && deptPickerRef.value && !deptPickerRef.value.contains(e.target as Node)) {
    deptPickerOpen.value = false;
  }
}
onMounted(() => {
  document.addEventListener('click', onDocumentClick);
  loadDepts();
});
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
});

async function loadDepts() {
  try {
    const res = await getDeptList();
    const data = (res as any)?.data || res || [];
    allDepts.value = Array.isArray(data) ? data.map((d: any) => ({ deptId: d.deptId, deptName: d.deptName })) : [];
    selectedDepts.value = new Set(allDepts.value.map(d => d.deptName));
  } catch (e) {
    console.error('加载部门失败:', e);
  }
}

const deptPickerValue = computed(() => {
  const n = selectedDepts.value.size;
  const total = allDepts.value.length;
  if (n === total || total === 0) return '全部部门';
  if (n === 1) return [...selectedDepts.value][0];
  return `已选 ${n} 个部门`;
});

function toggleDept(name: string) {
  if (selectedDepts.value.has(name)) {
    if (selectedDepts.value.size > 1) selectedDepts.value.delete(name);
  } else {
    selectedDepts.value.add(name);
  }
}

function selectAllDepts() {
  selectedDepts.value = new Set(allDepts.value.map(d => d.deptName));
}

function clearAllDepts() {
  if (selectedDepts.value.size <= 1) return;
  selectedDepts.value = new Set([allDepts.value[0]?.deptName]);
}

// 搜索结果
const results = ref<SearchResult[]>([]);
const total = ref(0);
const loading = ref(false);
const searchTime = ref(0);

async function doSearch() {
  if (!keyword.value.trim()) return;
  loading.value = true;
  const startTime = performance.now();
  try {
    const kw = keyword.value.trim();
    const req: SearchRequest = {
      keywords: kw,
      title: kw,
      content: kw,
      pageNum: currentPage.value,
      pageSize,
    };
    if (fileType.value) req.fileType = fileType.value;
    const res = await searchDoc(req);
    const data = res as any;
    results.value = data?.rows || data?.data?.rows || [];
    total.value = data?.total || data?.data?.total || 0;
    searchTime.value = Math.round((performance.now() - startTime) / 1000 * 100) / 100;
  } catch (e) {
    console.error('搜索失败:', e);
    results.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

// 文件类型工具
function getExt(title: string) {
  const idx = title?.lastIndexOf('.');
  return idx > 0 ? title.substring(idx + 1).toLowerCase() : '';
}

function fileIcon(type: string) {
  const ext = type?.toLowerCase();
  if (['xls', 'xlsx', 'xlsm'].includes(ext)) return iconExcel;
  if (['doc', 'docx'].includes(ext)) return iconWord;
  if (ext === 'pdf') return iconPdf;
  if (['ppt', 'pptx'].includes(ext)) return iconPpt;
  return iconExcel;
}

function formatSize(bytes: number) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return dateStr.substring(0, 10);
}

const totalPages = computed(() => Math.ceil(total.value / pageSize));

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  currentPage.value = page;
  doSearch();
}

// 生成页码数组
const pageNumbers = computed(() => {
  const pages: (number | string)[] = [];
  const tp = totalPages.value;
  const cp = currentPage.value;
  if (tp <= 7) {
    for (let i = 1; i <= tp; i++) pages.push(i);
  } else {
    pages.push(1);
    if (cp > 3) pages.push('...');
    for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) {
      pages.push(i);
    }
    if (cp < tp - 2) pages.push('...');
    pages.push(tp);
  }
  return pages;
});

// 高亮关键词
function highlightHtml(text: string) {
  if (!text || !keyword.value.trim()) return text;
  const kw = keyword.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(kw, 'gi'), (match) => `<span class="hl">${match}</span>`);
}

// 分享链接
const shareTip = ref('');

async function handleShare(docId: number) {
  const url = `${window.location.origin}/portal/share?docId=${docId}`;
  try {
    await navigator.clipboard.writeText(url);
    shareTip.value = '链接已复制到剪贴板';
  } catch {
    shareTip.value = url;
  }
  setTimeout(() => { shareTip.value = ''; }, 2000);
}

// 回到首页
function goHome() {
  router.push('/portal');
}

// 下载文档
const downloadingDocId = ref<number | null>(null);

async function handleDownload(docId: number) {
  downloadingDocId.value = docId;
  try {
    await apiDownloadDoc(docId);
  } catch (e) {
    console.error('下载失败:', e);
  } finally {
    downloadingDocId.value = null;
  }
}

// 预览文档
const previewVisible = ref(false);
const previewLoading = ref(false);
const previewData = ref<DocPreviewVo | null>(null);

async function openPreview(docId: number) {
  previewVisible.value = true;
  previewLoading.value = true;
  previewData.value = null;
  try {
    const res = await previewDoc(docId);
    const data = (res as any)?.data || res;
    previewData.value = data;
  } catch (e) {
    console.error('预览失败:', e);
  } finally {
    previewLoading.value = false;
  }
}

function closePreview() {
  previewVisible.value = false;
  previewData.value = null;
}

// Enter键搜索
function onKeyup(e: KeyboardEvent) {
  if (e.key === 'Enter') doSearch();
}

// 初始化：从URL参数读取关键词，优先使用 history.state 中的预加载结果
onMounted(() => {
  const q = (route.query.q as string) || '';
  const t = (route.query.type as string) || '';
  if (q) {
    keyword.value = q;
    fileType.value = t;
    // 优先使用从首页传来的预加载结果
    const state = history.state as any;
    if (state?.rows && state?.keyword === q) {
      results.value = state.rows;
      total.value = state.total || 0;
      searchTime.value = 0.03;
    } else {
      doSearch();
    }
  }
});

// 监听路由变化
watch(() => route.query, (newQuery) => {
  const q = (newQuery.q as string) || '';
  if (q && q !== keyword.value) {
    keyword.value = q;
    currentPage.value = 1;
    doSearch();
  }
});
</script>

<template>
  <div class="search-results-page">
    <!-- 主内容 -->
    <div class="main">
      <!-- 标题 -->
      <div class="page-title">
        <h1>
          <span class="zh clickable" @click="goHome" title="返回首页">藏经阁</span>
        </h1>
        <p>知识沉淀 · 智慧共享 · 高效协同</p>
      </div>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <div class="search-box">
          <svg class="search-icon" viewBox="0 0 20 20" fill="none" style="width:20px;height:20px;flex-shrink:0">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M13 13l4.5 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input type="text" v-model="keyword" placeholder="搜索文件名称、关键词、上传者..." @keyup="onKeyup">
          <!-- 部门选择 -->
          <div class="dept-picker" ref="deptPickerRef" :class="{ open: deptPickerOpen }" @click.stop="deptPickerOpen = !deptPickerOpen">
            <i class="fa-regular fa-building" style="font-size:13px;color:#A0A0A0"></i>
            <span class="dept-picker-value">{{ deptPickerValue }}</span>
            <i class="fa-solid fa-chevron-down dept-picker-arrow"></i>
            <div class="dept-dropdown" :class="{ open: deptPickerOpen }" @click.stop>
              <div class="dept-dropdown-header">
                <span class="dept-dropdown-title">选择部门</span>
                <div class="dept-dropdown-actions">
                  <button @click.stop="selectAllDepts">全选</button>
                  <button @click.stop="clearAllDepts">清空</button>
                </div>
              </div>
              <div class="dept-dropdown-list">
                <div v-for="dept in allDepts" :key="dept.deptId"
                     class="dept-option"
                     :class="{ checked: selectedDepts.has(dept.deptName) }"
                     @click.stop="toggleDept(dept.deptName)">
                  <div class="dept-option-check">
                    <i class="fa-solid fa-check"></i>
                  </div>
                  <div class="dept-option-name">{{ dept.deptName }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button class="btn-search" @click="doSearch" :disabled="loading">
          <template v-if="loading">搜索中...</template>
          <template v-else>搜索</template>
        </button>
      </div>

      <!-- 结果信息 -->
      <div class="results-info" v-if="total > 0">
        找到 <strong>{{ total }}</strong> 个结果
        <span class="results-time">（耗时 {{ searchTime }}s）</span>
      </div>
      <div class="results-info" v-else-if="keyword && !loading">
        未找到相关结果
      </div>

      <!-- 结果列表 -->
      <div class="results-list" v-if="results.length">
        <div v-for="item in results" :key="item.docId" class="result-item">
          <div class="result-head">
            <img class="file-icon-img" :src="fileIcon(item.fileType)" alt="" />
            <div class="result-title">
              <a href="javascript:void(0)" v-html="highlightHtml(item.highlightTitle || item.docTitle)"></a>
              <span class="result-type">.{{ item.fileType }} · {{ formatSize(item.fileSize) }}</span>
            </div>
            <div class="result-head-right">
              <span class="result-downloads"><i class="fa-solid fa-download"></i> {{ item.downloadCount }}</span>
              <button class="btn-share" @click="handleShare(item.docId)" title="分享">
                <i class="fa-solid fa-share-nodes"></i>
              </button>
            </div>
          </div>
          <div class="result-meta">
            <span class="result-dept">{{ item.folderPath || '未知部门' }}</span>
            <span class="result-date">{{ formatDate(item.createTime) }}</span>
          </div>
          <div class="result-snippet" v-if="item.contentSnippet" v-html="highlightHtml(item.contentSnippet)"></div>
          <div class="result-bottom">
            <div class="result-actions">
              <button class="btn-action primary" @click="handleDownload(item.docId)" :disabled="downloadingDocId === item.docId">
                <template v-if="downloadingDocId === item.docId"><i class="fa-solid fa-spinner fa-spin"></i></template>
                下载
              </button>
              <button class="btn-action secondary" @click="openPreview(item.docId)">预览</button>
            </div>
            <div class="share-tip" v-if="shareTip">{{ shareTip }}</div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination" v-if="totalPages > 1">
        <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
          <i class="fa-solid fa-chevron-left" style="font-size:11px"></i>
        </button>
        <template v-for="p in pageNumbers" :key="p">
          <span v-if="p === '...'" class="page-ellipsis">…</span>
          <button v-else class="page-btn" :class="{ active: p === currentPage }" @click="goToPage(p as number)">
            {{ p }}
          </button>
        </template>
        <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
          <i class="fa-solid fa-chevron-right" style="font-size:11px"></i>
        </button>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <Teleport to="body">
      <div class="preview-overlay" v-if="previewVisible" @click.self="closePreview">
        <div class="preview-modal">
          <div class="preview-header">
            <div class="preview-title">{{ previewData?.docTitle || '文档预览' }}</div>
            <button class="preview-close" @click="closePreview">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
          <div class="preview-body">
            <div v-if="previewLoading" class="preview-loading">
              <i class="fa-solid fa-spinner fa-spin"></i>
              <span>加载中...</span>
            </div>
            <div v-else-if="previewData" class="preview-content">
              <!-- 不支持预览 -->
              <div v-if="!previewData.canPreview" class="preview-unsupported">
                <i class="fa-regular fa-file" style="font-size:48px;color:#A0A0A0"></i>
                <p>{{ previewData.previewMessage || '该文件类型暂不支持在线预览' }}</p>
                <button class="btn-action primary" @click="handleDownload(previewData!.docId)">
                  <i class="fa-solid fa-download"></i> 下载文件
                </button>
              </div>
              <!-- PDF / 图片预览 -->
              <iframe
                v-else-if="previewData.previewType === 'pdf' || previewData.previewType === 'image'"
                :src="previewData.previewUrl"
                class="preview-iframe"
              ></iframe>
              <!-- 文本预览 -->
              <div v-else-if="previewData.previewType === 'text'" class="preview-text">
                <pre>{{ previewData.content }}</pre>
              </div>
              <!-- Office预览 -->
              <iframe
                v-else-if="previewData.previewType === 'office'"
                :src="previewData.previewUrl"
                class="preview-iframe"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.search-results-page {
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.main {
  max-width: 1280px;
  margin: 0 auto;
  padding: 32px 48px 80px;
  animation: fadeUp 0.7s ease both;
}

/* 标题 */
.page-title {
  margin-bottom: 32px;
}

.page-title h1 {
  font-size: 42px;
  font-weight: 900;
  color: #1A1A1A;
  letter-spacing: -0.01em;
  line-height: 1.15;
}

.page-title .zh {
  font-family: 'Noto Sans SC', sans-serif;
  font-style: normal;
}

.page-title .zh.clickable {
  cursor: pointer;
  transition: color 0.2s ease;
}

.page-title .zh.clickable:hover {
  color: #6B6B6B;
}

.page-title p {
  font-size: 14px;
  font-weight: 300;
  color: #A0A0A0;
  margin-top: 6px;
}

/* 搜索栏 */
.search-bar {
  display: flex;
  align-items: center;
  margin-bottom: 24px;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  height: 56px;
  background: #FFFFFF;
  border: 2px solid #ECECEC;
  border-radius: 20px;
  padding: 0 8px 0 20px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  color: #A0A0A0;
}

.search-box:focus-within {
  border-color: #1A1A1A;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 0 0 4px rgba(26, 26, 26, 0.08);
}

.search-box input {
  flex: 1;
  height: 100%;
  border: none;
  outline: none;
  font-size: 15px;
  color: #1A1A1A;
  background: transparent;
  margin: 0 12px;
  font-family: inherit;
}

.search-box input::placeholder {
  color: #A0A0A0;
  font-weight: 300;
}

.btn-search {
  height: 56px;
  padding: 0 28px;
  margin-left: 12px;
  background: #1A1A1A;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
  letter-spacing: 0.04em;
  flex-shrink: 0;
}

.btn-search:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.btn-search:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* 部门选择 */
.dept-picker {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px;
  border-left: 1px solid #ECECEC;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;
  height: 36px;
  transition: background 0.2s;
  border-radius: 6px;
}

.dept-picker:hover {
  background: #F5F5F5;
}

.dept-picker-value {
  font-size: 13px;
  color: #6B6B6B;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100px;
}

.dept-picker-arrow {
  font-size: 10px;
  color: #A0A0A0;
  transition: 0.3s;
}

.dept-picker.open .dept-picker-arrow {
  transform: rotate(180deg);
}

.dept-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  width: max-content;
  max-width: 360px;
  background: #FFFFFF;
  border: 1px solid #ECECEC;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
  z-index: 9999;
  opacity: 0;
  transform: translateY(-8px);
  pointer-events: none;
  transition: 0.3s;
}

.dept-dropdown.open {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.dept-dropdown-header {
  padding: 12px 16px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #F3F3F3;
}

.dept-dropdown-title {
  font-size: 12px;
  font-weight: 600;
  color: #1A1A1A;
}

.dept-dropdown-actions button {
  font-size: 11px;
  color: #A0A0A0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: 0.3s;
}

.dept-dropdown-actions button:hover {
  color: #1A1A1A;
  background: #F5F5F5;
}

.dept-dropdown-list {
  padding: 6px;
  max-height: 300px;
  overflow-y: auto;
}

.dept-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  cursor: pointer;
}

.dept-option:hover {
  background: #F5F5F5;
}

.dept-option-check {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid #ECECEC;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: transparent;
}

.dept-option.checked .dept-option-check {
  background: #1A1A1A;
  border-color: #1A1A1A;
  color: #fff;
}

.dept-option-name {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
}

/* 结果信息 */
.results-info {
  font-size: 13px;
  color: #A0A0A0;
  margin-bottom: 20px;
}

.results-info strong {
  color: #1A1A1A;
  font-weight: 700;
}

.results-time {
  margin-left: 4px;
}

/* 结果列表 */
.results-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.result-item {
  background: #FFFFFF;
  border: 1px solid #ECECEC;
  border-bottom: 1px solid #F3F3F3;
  padding: 20px 24px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

.result-item:first-child {
  border-radius: 16px 16px 0 0;
}

.result-item:last-child {
  border-bottom: 1px solid #ECECEC;
  border-radius: 0 0 16px 16px;
}

.result-item:hover {
  background: rgba(0, 0, 0, 0.008);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  z-index: 1;
}

.result-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 10px;
}

.result-head-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  flex-shrink: 0;
}

.result-downloads {
  font-size: 12px;
  color: #A0A0A0;
  white-space: nowrap;
}

.result-downloads i {
  font-size: 10px;
}

.btn-share {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid #ECECEC;
  background: #FFFFFF;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #A0A0A0;
  font-size: 13px;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-share:hover {
  border-color: #C0C0C0;
  color: #1A1A1A;
  background: #F5F5F5;
}

.result-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.share-tip {
  font-size: 12px;
  color: #2D8B55;
  background: #EFF7F2;
  padding: 4px 12px;
  border-radius: 6px;
  animation: fadeIn 0.3s ease;
}

.result-title {
  flex: 1;
  min-width: 0;
}

.result-title a {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  text-decoration: none;
  transition: color 0.2s ease;
}

.result-title a:hover {
  color: #333;
}

.result-type {
  font-size: 12px;
  color: #A0A0A0;
  margin-left: 10px;
  font-weight: 400;
}

.result-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.result-meta span {
  font-size: 12px;
  color: #A0A0A0;
}

.result-dept {
  padding: 2px 10px;
  background: #F5F5F5;
  border-radius: 20px;
  font-weight: 400;
  color: #6B6B6B;
}

.result-snippet {
  font-size: 13px;
  color: #6B6B6B;
  line-height: 1.7;
  margin-bottom: 12px;
}

.result-snippet :deep(.hl),
.result-title :deep(.hl) {
  color: #C44536;
  font-weight: 600;
  background: rgba(196, 69, 54, 0.06);
  padding: 0 2px;
  border-radius: 2px;
}

.result-actions {
  display: flex;
  gap: 8px;
}

/* 文件图标 */
.file-icon-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  flex-shrink: 0;
}

/* 操作按钮 */
.btn-action {
  height: 30px;
  padding: 0 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: inherit;
  letter-spacing: 0.02em;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.btn-action.primary {
  background: #1A1A1A;
  color: #fff;
  border: 1px solid #1A1A1A;
}

.btn-action.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.btn-action.secondary {
  background: #FFFFFF;
  color: #6B6B6B;
  border: 1px solid #ECECEC;
}

.btn-action.secondary:hover {
  border-color: #C0C0C0;
  background: #F5F5F5;
}

/* 分页 */
.pagination {
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
  transition: all 0.2s ease;
  font-family: inherit;
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

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .main {
    padding-left: 20px;
    padding-right: 20px;
  }
  .search-bar {
    flex-direction: column;
  }
  .btn-search {
    margin-left: 0;
    margin-top: 10px;
    width: 100%;
  }
  .page-title h1 {
    font-size: 28px;
  }
  .result-meta {
    flex-wrap: wrap;
    gap: 8px;
  }
}

/* 预览弹窗 */
.preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.preview-modal {
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  background: #FFFFFF;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modalUp {
  from { opacity: 0; transform: translateY(20px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #F3F3F3;
  flex-shrink: 0;
}

.preview-title {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.preview-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #A0A0A0;
  transition: 0.2s;
  flex-shrink: 0;
  margin-left: 12px;
}

.preview-close:hover {
  background: #F5F5F5;
  color: #1A1A1A;
}

.preview-body {
  flex: 1;
  overflow: auto;
  min-height: 400px;
}

.preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px;
  color: #A0A0A0;
  font-size: 14px;
}

.preview-loading i {
  font-size: 24px;
}

.preview-unsupported {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px;
  text-align: center;
}

.preview-unsupported p {
  font-size: 14px;
  color: #6B6B6B;
}

.preview-iframe {
  width: 100%;
  height: 75vh;
  border: none;
}

.preview-text {
  padding: 24px;
}

.preview-text pre {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #1A1A1A;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}
</style>
