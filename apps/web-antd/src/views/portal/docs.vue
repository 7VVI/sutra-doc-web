<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { getDashboardStat, getDeptStatList, getDeptList, searchDoc, getDeptFiles, downloadDoc as apiDownloadDoc } from '#/api/kb';
import type { DeptFile } from '#/api/kb';

const router = useRouter();

const deptIcons = ['fa-solid fa-building', 'fa-solid fa-flask', 'fa-solid fa-users',
  'fa-solid fa-bullhorn', 'fa-solid fa-truck', 'fa-solid fa-shield-halved',
  'fa-solid fa-server', 'fa-solid fa-landmark', 'fa-solid fa-coins'];
const getDeptIcon = (i: number) => deptIcons[i % deptIcons.length];

// 统计数据
const statTotal = ref(0);
const statWeekly = ref(0);
const statActive = ref(0);
const statSearches = ref(0);
const statTotalGrowth = ref(0);
const statWeeklyGrowth = ref(0);

function animNum(refVal: { value: number }, target: number, dur = 800) {
  const start = performance.now();
  function animate(now: number) {
    const progress = Math.min((now - start) / dur, 1);
    const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    refVal.value = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

// 部门统计列表
interface DeptStat {
  deptId: number;
  deptName: string;
  fileCount: number;
  weeklyNewCount: number;
  latestFileName: string;
  icon: string;
}
const deptList = ref<DeptStat[]>([]);
const currentSort = ref('name');
const currentType = ref('all');

const filteredDeptList = computed(() => {
  let list = [...deptList.value];
  if (currentSort.value === 'name') {
    list.sort((a, b) => a.deptName.localeCompare(b.deptName, 'zh'));
  } else {
    list.sort((a, b) => b.fileCount - a.fileCount);
  }
  return list;
});

// 搜索
const searchTerm = ref('');
const searching = ref(false);

async function doSearch() {
  const kw = searchTerm.value.trim();
  if (!kw) return;
  searching.value = true;
  try {
    const res = await searchDoc({
      keywords: kw,
      title: kw,
      content: kw,
      fileType: currentType.value !== 'all' ? currentType.value : undefined,
      pageNum: 1,
      pageSize: 10,
    });
    const data = res as any;
    const rows = data?.rows || data?.data?.rows || [];
    const total = data?.total || data?.data?.total || 0;
    router.push({
      path: '/portal/search',
      query: {
        q: kw,
        type: currentType.value !== 'all' ? currentType.value : undefined,
      },
      state: { rows, total, keyword: kw },
    });
  } catch (e) {
    console.error('搜索失败:', e);
  } finally {
    searching.value = false;
  }
}

// 部门选择（用于下拉）—— 全部门列表
interface SysDept { deptId: number; deptName: string; }
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
});
onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick);
});

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

// 文件名中提取扩展名
const getExt = (name: string) => {
  const idx = name?.lastIndexOf('.');
  return idx > 0 ? name.substring(idx + 1).toLowerCase() : '';
};
const ebCls = (e: string) => ({xlsx:'eb-xlsx',docx:'eb-docx',pdf:'eb-pdf',pptx:'eb-pptx'})[e]||'eb-xlsx';
const fileIconFA = (e: string) => ({xlsx:'fa-solid fa-file-excel',docx:'fa-solid fa-file-word',pdf:'fa-solid fa-file-pdf',pptx:'fa-solid fa-file-powerpoint'})[e]||'fa-solid fa-file';

// 加载数据
onMounted(async () => {
  try {
    const [dashRes, deptRes, deptListRes] = await Promise.all([
      getDashboardStat(),
      getDeptStatList(),
      getDeptList(),
    ]);

    // 卡片统计
    const dash = (dashRes as any)?.data || dashRes;
    if (dash) {
      animNum(statTotal, dash.fileTotal || 0);
      animNum(statWeekly, dash.weeklyNewFiles || 0);
      animNum(statActive, dash.activeDeptCount || 0);
      animNum(statSearches, dash.todaySearchCount || 0);
      statTotalGrowth.value = dash.fileTotalGrowthRate || 0;
      statWeeklyGrowth.value = dash.weeklyGrowthRate || 0;
    }

    // 部门统计
    const deptData = (deptRes as any)?.data || deptRes || [];
    deptList.value = (Array.isArray(deptData) ? deptData : []).map((d: any, i: number) => ({
      deptId: d.deptId,
      deptName: d.deptName,
      fileCount: d.fileCount || 0,
      weeklyNewCount: d.weeklyNewCount || 0,
      latestFileName: d.latestFileName || '',
      icon: getDeptIcon(i),
    }));

    // 全部门列表（用于下拉选择）
    const deptListData = (deptListRes as any)?.data || deptListRes || [];
    allDepts.value = (Array.isArray(deptListData) ? deptListData : []).map((d: any) => ({
      deptId: d.deptId,
      deptName: d.deptName,
    }));
    selectedDepts.value = new Set(allDepts.value.map(d => d.deptName));
  } catch (e) {
    console.error('加载统计数据失败:', e);
  }
});

// ===== 部门文档弹窗 =====
const modalVisible = ref(false);
const modalLoading = ref(false);
const modalDept = ref<DeptStat | null>(null);
const modalSearch = ref('');
const modalFiles = ref<DeptFile[]>([]);
const openFolders = ref(new Set<string>());

const modalFolderTree = computed(() => {
  let files = [...modalFiles.value];
  if (modalSearch.value.trim()) {
    const kw = modalSearch.value.trim().toLowerCase();
    files = files.filter(f =>
      f.docTitle.toLowerCase().includes(kw) ||
      f.fileType.toLowerCase().includes(kw)
    );
  }
  const map = new Map<string, DeptFile[]>();
  files.forEach(f => {
    const key = f.folderName || f.folderPath || '根目录';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(f);
  });
  return Array.from(map.entries()).map(([name, items]) => ({ name, files: items }));
});

const modalTotalFiles = computed(() => modalFiles.value.length);

async function openDeptModal(dept: DeptStat) {
  modalDept.value = dept;
  modalSearch.value = '';
  modalFiles.value = [];
  openFolders.value = new Set();
  modalVisible.value = true;
  modalLoading.value = true;
  try {
    const res = await getDeptFiles(dept.deptId);
    const data = (res as any)?.data || res || [];
    modalFiles.value = Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('加载部门文件失败:', e);
  } finally {
    modalLoading.value = false;
  }
}

function closeDeptModal() {
  modalVisible.value = false;
  modalDept.value = null;
  modalFiles.value = [];
}

function toggleFolder(name: string) {
  const s = new Set(openFolders.value);
  if (s.has(name)) s.delete(name);
  else s.add(name);
  openFolders.value = s;
}

const downloadingDocId = ref<number | null>(null);

async function handleDownloadDoc(docId: number) {
  downloadingDocId.value = docId;
  try {
    await apiDownloadDoc(docId);
  } catch (e) {
    console.error('下载失败:', e);
  } finally {
    downloadingDocId.value = null;
  }
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function formatDateStr(d: string) {
  if (!d) return '';
  return d.substring(0, 10);
}
</script>

<template>
  <div class="portal-docs-page">
    <!-- Hero区域 -->
    <section class="hero">
      <h1 class="hero-title">藏经阁</h1>
      <p class="hero-desc">让每一份文档，触手可及</p>

      <!-- 搜索栏 -->
      <div class="search-core">
        <div class="search-bar">
          <div class="dept-picker" ref="deptPickerRef" :class="{ open: deptPickerOpen }" @click.stop="deptPickerOpen = !deptPickerOpen">
            <div class="dept-picker-icon">
              <i class="fa-regular fa-building"></i>
            </div>
            <span class="dept-picker-value">{{ deptPickerValue }}</span>
            <i class="fa-solid fa-chevron-down dept-picker-arrow"></i>
            <div class="dept-dropdown" :class="{ open: deptPickerOpen }" @click.stop>
              <div class="dept-dropdown-header">
                <button class="dept-dropdown-btn" @click.stop="selectAllDepts">全选</button>
                <button class="dept-dropdown-btn" @click.stop="clearAllDepts">清空</button>
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
          <div class="search-field">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" class="search-input" v-model="searchTerm" placeholder="输入文件名、关键词或文件类型..." @keyup.enter="doSearch">
          </div>
          <button class="search-submit" @click="doSearch" :disabled="searching">
            <template v-if="searching"><i class="fa-solid fa-spinner fa-spin"></i>查询中</template>
            <template v-else><i class="fa-solid fa-magnifying-glass"></i>查询</template>
          </button>
        </div>
      </div>

      <!-- 类型筛选 -->
      <div class="type-bar">
        <span class="type-label">类型</span>
        <button class="type-tag" :class="{ active: currentType === 'all' }" @click="currentType = 'all'">
          <span class="dot d-all"></span>全部
        </button>
        <button class="type-tag" :class="{ active: currentType === 'xlsx' }" @click="currentType = 'xlsx'">
          <span class="dot d-xlsx"></span>.xlsx
        </button>
        <button class="type-tag" :class="{ active: currentType === 'docx' }" @click="currentType = 'docx'">
          <span class="dot d-docx"></span>.docx
        </button>
        <button class="type-tag" :class="{ active: currentType === 'pdf' }" @click="currentType = 'pdf'">
          <span class="dot d-pdf"></span>.pdf
        </button>
        <button class="type-tag" :class="{ active: currentType === 'pptx' }" @click="currentType = 'pptx'">
          <span class="dot d-pptx"></span>.pptx
        </button>
      </div>
    </section>

    <!-- 分隔线 -->
    <div class="divider"><div class="divider-line"></div></div>

    <!-- 统计卡片 -->
    <section class="stats-area">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">文件总数</span>
            <div class="stat-icon"><i class="fa-regular fa-file"></i></div>
          </div>
          <div class="stat-val">{{ statTotal.toLocaleString() }}</div>
          <div class="stat-change">
            <span v-if="statTotalGrowth" class="up"><i class="fa-solid fa-arrow-up" style="font-size:9px"></i> {{ statTotalGrowth }}%</span>
            <span>较上月</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">本周新增</span>
            <div class="stat-icon"><i class="fa-solid fa-arrow-trend-up"></i></div>
          </div>
          <div class="stat-val">{{ statWeekly.toLocaleString() }}</div>
          <div class="stat-change">
            <span v-if="statWeeklyGrowth" class="up"><i class="fa-solid fa-arrow-up" style="font-size:9px"></i> {{ statWeeklyGrowth }}%</span>
            <span>较上周</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">活跃部门</span>
            <div class="stat-icon"><i class="fa-regular fa-building"></i></div>
          </div>
          <div class="stat-val">{{ statActive }}</div>
          <div class="stat-change"><span class="neutral">覆盖全部业务线</span></div>
        </div>
        <div class="stat-card">
          <div class="stat-top">
            <span class="stat-label">检索次数</span>
            <div class="stat-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
          </div>
          <div class="stat-val">{{ statSearches.toLocaleString() }}</div>
          <div class="stat-change"><span class="neutral">今日累计</span></div>
        </div>
      </div>
    </section>

    <!-- 表格区域 -->
    <section class="table-area">
      <div class="table-bar">
        <div class="table-bar-left">
          <span class="table-title">部门文件明细</span>
          <span class="table-meta">共 {{ filteredDeptList.length }} 个部门</span>
        </div>
        <div class="table-sort">
          <button class="sort-btn" :class="{ active: currentSort === 'name' }" @click="currentSort = 'name'">
            <i class="fa-solid fa-arrow-down-a-z"></i>名称
          </button>
          <button class="sort-btn" :class="{ active: currentSort === 'count' }" @click="currentSort = 'count'">
            <i class="fa-solid fa-arrow-down-9-1"></i>数量
          </button>
        </div>
      </div>
      <div class="table-card">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>部门</th>
              <th>文件总数</th>
              <th>上周新增</th>
              <th>最新文档</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(dept, idx) in filteredDeptList" :key="dept.deptId" @click="openDeptModal(dept)">
              <td><span class="row-idx">{{ String(idx + 1).padStart(2, '0') }}</span></td>
              <td>
                <div class="dept-cell">
                  <div class="dept-avatar"><i :class="dept.icon"></i></div>
                  <div class="dept-info">
                    <span class="dept-name">{{ dept.deptName }}</span>
                    <span class="dept-id">ID: {{ dept.deptId }}</span>
                  </div>
                </div>
              </td>
              <td>{{ dept.fileCount }}</td>
              <td><span class="new-count" :class="dept.weeklyNewCount > 0 ? 'new-pos' : 'new-zero'">{{ dept.weeklyNewCount }}</span></td>
              <td>
                <div class="file-name-cell">
                  <template v-if="dept.latestFileName">
                    <span class="file-name">
                      <span v-if="getExt(dept.latestFileName)" class="ext-badge" :class="ebCls(getExt(dept.latestFileName))">.{{ getExt(dept.latestFileName) }}</span>
                      {{ dept.latestFileName }}
                    </span>
                  </template>
                  <span v-else style="color:#A0A0A0">-</span>
                </div>
              </td>
              <td>
                <button class="row-action" title="查看目录">
                  <i class="fa-solid fa-folder-open"></i>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="table-footer">
        </div>
      </div>
    </section>

    <!-- 部门文档弹窗 -->
    <Teleport to="body">
      <div class="doc-modal-overlay" v-if="modalVisible" @click.self="closeDeptModal">
        <div class="doc-modal">
          <div class="doc-modal-header">
            <div class="doc-modal-icon"><i :class="modalDept?.icon"></i></div>
            <div class="doc-modal-info">
              <div class="doc-modal-name">{{ modalDept?.deptName }}</div>
              <div class="doc-modal-meta">{{ modalTotalFiles }} 份文档</div>
            </div>
            <button class="doc-modal-close" @click="closeDeptModal"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="doc-modal-search">
            <i class="fa-solid fa-magnifying-glass"></i>
            <input type="text" v-model="modalSearch" placeholder="在当前部门内搜索文件...">
          </div>
          <div class="doc-modal-body">
            <div v-if="modalLoading" class="doc-modal-loading">
              <i class="fa-solid fa-spinner fa-spin"></i><span>加载中...</span>
            </div>
            <template v-else>
              <div class="doc-file-tree" v-if="modalFolderTree.length">
                <div v-for="folder in modalFolderTree" :key="folder.name" class="doc-tree-folder">
                  <div class="doc-tree-folder-header" @click="toggleFolder(folder.name)">
                    <span class="doc-tree-arrow" :class="{ open: openFolders.has(folder.name) || !!modalSearch }">
                      <i class="fa-solid fa-chevron-right"></i>
                    </span>
                    <i class="fa-regular fa-folder-open doc-tree-folder-icon"></i>
                    <span class="doc-tree-folder-name">{{ folder.name }}</span>
                    <span class="doc-tree-folder-count">{{ folder.files.length }}</span>
                  </div>
                  <div class="doc-tree-files" :class="{ open: openFolders.has(folder.name) || !!modalSearch }">
                    <div v-for="file in folder.files" :key="file.docId" class="doc-tree-file">
                      <div class="doc-tree-file-icon" :class="ebCls(file.fileType)">
                        <i :class="fileIconFA(file.fileType)"></i>
                      </div>
                      <div class="doc-tree-file-info">
                        <div class="doc-tree-file-name">{{ file.docTitle }}</div>
                        <div class="doc-tree-file-meta">{{ formatFileSize(file.fileSize) }} · {{ formatDateStr(file.createTime) }}</div>
                      </div>
                      <button class="doc-tree-file-dl" @click.stop="handleDownloadDoc(file.docId)" :disabled="downloadingDocId === file.docId" title="下载">
                        <i :class="downloadingDocId === file.docId ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="doc-modal-empty">
                <i class="fa-regular fa-file-lines"></i>
                <p>未找到匹配文件</p>
              </div>
            </template>
          </div>
          <div class="doc-modal-footer">
            <span class="doc-modal-footer-info">共 {{ modalTotalFiles }} 份文档</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.portal-docs-page {
  animation: fadeUp 0.7s ease both;
}

.hero {
  padding: 72px 48px 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-title {
  font-size: 42px;
  font-weight: 900;
  letter-spacing: -1px;
  line-height: 1;
  text-align: center;
  margin-bottom: 10px;
  color: #1A1A1A;
}

.hero-title span {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  font-style: italic;
  opacity: 0.12;
  font-size: 48px;
}

.hero-desc {
  font-size: 14px;
  color: #A0A0A0;
  font-weight: 300;
  text-align: center;
  margin-bottom: 36px;
  letter-spacing: 0.3px;
}

.search-core {
  width: 100%;
  max-width: 760px;
  margin-bottom: 16px;
}

.search-bar {
  display: flex;
  align-items: stretch;
  height: 56px;
  border: 2px solid #ECECEC;
  border-radius: 20px;
  background: #FFFFFF;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.search-bar:hover {
  border-color: #D5D5D5;
}

.search-bar:focus-within {
  border-color: #1A1A1A;
  box-shadow: 0 0 0 4px rgba(26, 26, 26, 0.08);
}

.dept-picker {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 6px 0 18px;
  cursor: pointer;
  border-right: 1px solid #F3F3F3;
  flex-shrink: 0;
  position: relative;
}

.dept-picker:hover {
}

.dept-picker-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #6B6B6B;
}

.dept-picker.open .dept-picker-icon {
  background: #1A1A1A;
  color: #fff;
}

.dept-picker-value {
  font-size: 14px;
  color: #1A1A1A;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dept-picker-arrow {
  font-size: 10px;
  color: #A0A0A0;
  transition: 0.3s;
}

.dept-picker.open .dept-picker-arrow {
  transform: rotate(180deg);
  color: #1A1A1A;
}

.dept-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: -2px;
  min-width: 160px;
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
  gap: 8px;
}

.dept-dropdown-title {
  font-size: 12px;
  font-weight: 600;
  color: #1A1A1A;
}

.dept-dropdown-btn {
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
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.dept-dropdown-list::-webkit-scrollbar {
  display: none;
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

.dept-option-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #6B6B6B;
}

.dept-option.checked .dept-option-icon {
  background: #1A1A1A;
  color: #fff;
}

.dept-option-name {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
}

.dept-option-count {
  font-size: 11px;
  color: #A0A0A0;
}

.search-field {
  flex: 1;
  display: flex;
  align-items: center;
}

.search-field i {
  font-size: 16px;
  color: #A0A0A0;
  margin-left: 16px;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-bar:focus-within .search-field i {
  color: #1A1A1A;
}

.search-input {
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 16px;
  font-size: 15px;
  color: #1A1A1A;
  outline: none;
}

.search-input::placeholder {
  color: #A0A0A0;
}

.search-submit {
  height: 44px;
  margin: 6px 6px 6px 0;
  padding: 0 24px;
  border-radius: 14px;
  border: none;
  background: #1A1A1A;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-submit:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}

.search-submit:active {
  transform: translateY(0);
}

.type-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.type-label {
  font-size: 12px;
  color: #A0A0A0;
}

.type-tag {
  padding: 5px 13px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid #ECECEC;
  border-radius: 16px;
  background: #FFFFFF;
  color: #6B6B6B;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.type-tag:hover {
  border-color: #C0C0C0;
  background: #F5F5F5;
}

.type-tag.active {
  background: #1A1A1A;
  color: #fff;
  border-color: #1A1A1A;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.d-all { background: #A0A0A0; }
.d-xlsx { background: #2D8B55; }
.d-docx { background: #3B6FB5; }
.d-pdf { background: #C44536; }
.d-pptx { background: #D4841C; }

.divider {
  max-width: 1200px;
  margin: 20px auto 0;
  padding: 0 48px;
  animation: fadeUp 0.7s ease 0.08s both;
}

.divider-line {
  height: 1px;
  background: linear-gradient(90deg, transparent, #ECECEC, transparent);
}

.stats-area {
  max-width: 1200px;
  margin: 24px auto 0;
  padding: 0 48px;
  animation: fadeUp 0.7s ease 0.1s both;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.stat-card {
  background: #FFFFFF;
  border: 1px solid #ECECEC;
  border-radius: 16px;
  padding: 22px 24px;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.stat-card:hover {
  border-color: #D8D8D8;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transform: translateY(-1px);
}

.stat-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.06), transparent);
  opacity: 0;
  transition: 0.3s;
}

.stat-card:hover::after {
  opacity: 1;
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.stat-label {
  font-size: 13px;
  color: #A0A0A0;
}

.stat-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #6B6B6B;
}

.stat-val {
  font-size: 30px;
  font-weight: 900;
  color: #1A1A1A;
  line-height: 1;
  margin-bottom: 8px;
  font-variant-numeric: tabular-nums;
}

.stat-change {
  font-size: 12px;
  color: #A0A0A0;
  font-weight: 300;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-change .up {
  color: #2D8B55;
  font-weight: 500;
}

.stat-change .neutral {
  color: #A0A0A0;
  font-weight: 400;
}

.table-area {
  max-width: 1200px;
  margin: 20px auto 0;
  padding: 0 48px 60px;
  animation: fadeUp 0.7s ease 0.15s both;
}

.table-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.table-meta {
  font-size: 12px;
  color: #A0A0A0;
  margin-left: 12px;
}

.table-sort {
  display: flex;
  gap: 2px;
}

.sort-btn {
  padding: 5px 12px;
  font-size: 11px;
  color: #A0A0A0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.sort-btn:hover {
  color: #6B6B6B;
  background: #F5F5F5;
}

.sort-btn.active {
  color: #1A1A1A;
  border-color: #ECECEC;
  background: #F5F5F5;
  font-weight: 500;
}

.table-card {
  background: #FFFFFF;
  border: 1px solid #ECECEC;
  border-radius: 16px;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

thead th {
  padding: 12px 16px;
  font-size: 11px;
  font-weight: 500;
  color: #A0A0A0;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid #F3F3F3;
  background: #FAFAFA;
}

thead th:nth-child(1) { width: 44px; }
thead th:nth-child(2) { width: 30%; text-align: left; padding-left: 52px; }
thead th:nth-child(3), thead th:nth-child(4) { width: 100px; }
thead th:nth-child(5) { }
thead th:nth-child(6) { width: 56px; }

tbody tr {
  border-bottom: 1px solid #F3F3F3;
  cursor: pointer;
}

tbody tr:last-child { border-bottom: none; }
tbody tr:hover { background: rgba(0,0,0,0.012); }

tbody td {
  padding: 14px 16px;
  font-size: 13px;
  color: #1A1A1A;
  text-align: left;
}

tbody td:nth-child(1) { text-align: center; }
tbody td:nth-child(3),tbody td:nth-child(4) { font-weight: 500; text-align: center; }
tbody td:nth-child(5) { text-align: center; }
tbody td:nth-child(6) { text-align: center; }

.row-idx {
  font-size: 11px;
  color: #A0A0A0;
}

.dept-cell {
  display: flex;
  align-items: center;
  gap: 14px;
}

.dept-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: #6B6B6B;
}

tbody tr:hover .dept-avatar {
  background: #1A1A1A;
  color: #fff;
}

.dept-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dept-name {
  font-size: 14px;
  font-weight: 600;
}

.dept-id {
  font-size: 11px;
  color: #A0A0A0;
}

.new-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 22px;
  padding: 0 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.new-zero { background: #F5F5F5; color: #A0A0A0; }
.new-pos { background: #EFF7F2; color: #2D8B55; }

.file-name-cell {
  max-width: 380px;
}

.file-name {
  font-size: 13px;
  color: #6B6B6B;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
}

.ext-badge {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 600;
  margin-right: 8px;
}

.eb-xlsx { background: #EFF7F2; color: #2D8B55; }
.eb-docx { background: #EEF3F9; color: #3B6FB5; }
.eb-pdf { background: #FCEEEC; color: #C44536; }
.eb-pptx { background: #FDF3E7; color: #D4841C; }

.file-date {
  font-size: 11px;
  color: #A0A0A0;
  margin-top: 3px;
}

.row-action {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #A0A0A0;
}

.row-action:hover {
  background: #F5F5F5;
  color: #1A1A1A;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  border-top: 1px solid #F3F3F3;
}

.footer-info {
  font-size: 12px;
  color: #A0A0A0;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .hero { padding: 40px 20px 20px; }
  .hero-title { font-size: 28px; }
  .stats-area, .table-area { padding-left: 20px; padding-right: 20px; }
  .divider { padding: 0 20px; }
  .stats-grid { gap: 10px; }
  .table-card { overflow-x: auto; }
  table { min-width: 700px; }
  .doc-modal { max-width: calc(100vw - 32px); max-height: 90vh; }
}

/* ===== 部门文档弹窗 ===== */
.doc-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.doc-modal {
  width: 100%;
  max-width: 780px;
  max-height: 85vh;
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

.doc-modal-header {
  padding: 22px 28px 16px;
  border-bottom: 1px solid #F3F3F3;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.doc-modal-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: #1A1A1A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
  flex-shrink: 0;
}

.doc-modal-info {
  flex: 1;
  min-width: 0;
}

.doc-modal-name {
  font-size: 18px;
  font-weight: 700;
  color: #1A1A1A;
  line-height: 1.2;
}

.doc-modal-meta {
  font-size: 12px;
  color: #A0A0A0;
  font-weight: 300;
  margin-top: 3px;
}

.doc-modal-close {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid #ECECEC;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #A0A0A0;
  font-size: 14px;
  flex-shrink: 0;
  transition: 0.3s;
}

.doc-modal-close:hover {
  border-color: #1A1A1A;
  color: #1A1A1A;
  background: #F5F5F5;
}

.doc-modal-search {
  padding: 12px 28px;
  border-bottom: 1px solid #F3F3F3;
  flex-shrink: 0;
  position: relative;
}

.doc-modal-search i {
  position: absolute;
  left: 40px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: #A0A0A0;
  pointer-events: none;
}

.doc-modal-search input {
  width: 100%;
  height: 38px;
  border: 1px solid #ECECEC;
  border-radius: 8px;
  padding: 0 14px 0 36px;
  font-size: 13px;
  color: #1A1A1A;
  background: #FAFAFA;
  outline: none;
  transition: 0.3s;
  font-family: inherit;
}

.doc-modal-search input::placeholder { color: #A0A0A0; font-weight: 300; }
.doc-modal-search input:focus { border-color: #1A1A1A; background: #FFFFFF; box-shadow: 0 0 0 3px rgba(26,26,26,.05); }

.doc-modal-body {
  flex: 1;
  overflow-y: auto;
  min-height: 300px;
  max-height: 55vh;
}

.doc-modal-body::-webkit-scrollbar { width: 5px; }
.doc-modal-body::-webkit-scrollbar-thumb { background: #ECECEC; border-radius: 3px; }

.doc-modal-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px;
  color: #A0A0A0;
  font-size: 14px;
}

.doc-modal-loading i { font-size: 24px; }

.doc-file-tree { padding: 6px 0; }
.doc-tree-folder { margin: 0 12px; }

.doc-tree-folder-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.3s;
  user-select: none;
}

.doc-tree-folder-header:hover { background: #F5F5F5; }

.doc-tree-arrow {
  font-size: 10px;
  color: #A0A0A0;
  transition: 0.3s;
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}

.doc-tree-arrow.open { transform: rotate(90deg); }

.doc-tree-folder-icon { font-size: 14px; color: #D4841C; flex-shrink: 0; }
.doc-tree-folder-name { font-size: 13px; font-weight: 500; color: #1A1A1A; flex: 1; }
.doc-tree-folder-count { font-size: 11px; color: #A0A0A0; font-weight: 300; }

.doc-tree-files {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.doc-tree-files.open { max-height: 2000px; }

.doc-tree-file {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px 9px 38px;
  transition: 0.3s;
}

.doc-tree-file:hover { background: rgba(0, 0, 0, 0.018); }

.doc-tree-file-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  flex-shrink: 0;
}

.doc-tree-file-info { flex: 1; min-width: 0; }

.doc-tree-file-name {
  font-size: 13px;
  color: #1A1A1A;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-tree-file-meta {
  font-size: 11px;
  color: #A0A0A0;
  font-weight: 300;
  margin-top: 1px;
}

.doc-tree-file-dl {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  border: 1px solid #ECECEC;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #A0A0A0;
  font-size: 11px;
  flex-shrink: 0;
  opacity: 0;
  transition: 0.3s;
}

.doc-tree-file:hover .doc-tree-file-dl { opacity: 1; }
.doc-tree-file-dl:hover { border-color: #1A1A1A; color: #1A1A1A; background: #F5F5F5; }
.doc-tree-file-dl:disabled { opacity: 1; cursor: not-allowed; }

.doc-modal-empty {
  padding: 60px 24px;
  text-align: center;
  color: #A0A0A0;
}

.doc-modal-empty i { font-size: 28px; display: block; margin-bottom: 12px; }
.doc-modal-empty p { font-size: 13px; font-weight: 300; }

.doc-modal-footer {
  padding: 12px 28px;
  border-top: 1px solid #F3F3F3;
  flex-shrink: 0;
}

.doc-modal-footer-info {
  font-size: 11px;
  color: #A0A0A0;
  font-weight: 300;
}
</style>