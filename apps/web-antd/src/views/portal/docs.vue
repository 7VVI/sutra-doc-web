<script lang="ts" setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getDashboardStat, getDeptStatList, getDeptList, searchDoc, getDeptDocTree, downloadDoc as apiDownloadDoc } from '#/api/kb';
import type { DeptDocTreeNode } from '#/api/kb';

const router = useRouter();
const route = useRoute();

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

  // 从聊天页返回时保持智能问答模式
  if (route.query.mode === 'chat') {
    currentMode.value = 'chat';
  }
});

// ===== 部门文档弹窗 =====
const modalVisible = ref(false);
const modalLoading = ref(false);
const modalDept = ref<DeptStat | null>(null);
// 左侧根文件夹列表
const modalRootFolders = ref<DeptDocTreeNode[]>([]);
// 右侧文件列表
const modalFiles = ref<DeptDocTreeNode[]>([]);
// 当前选中的文件夹ID
const selectedFolderId = ref<number | null>(null);
// 展开的文件夹ID集合
const expandedFolderIds = ref(new Set<number>());
// 文件夹子节点缓存
const folderChildrenCache = ref<Map<number, DeptDocTreeNode[]>>(new Map());
// 加载中的文件夹ID
const loadingFolderId = ref<number | null>(null);

// 格式化文件大小
const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
const formatDateStr = (d: string) => d?.substring(0, 10) || '';
const fileIconFA = (e: string) => ({xlsx:'fa-solid fa-file-excel',docx:'fa-solid fa-file-word',pdf:'fa-solid fa-file-pdf',pptx:'fa-solid fa-file-powerpoint'})[e]||'fa-solid fa-file';

// 文档总数
const modalDocCount = computed(() => {
  let count = 0;
  const countDocs = (nodes: DeptDocTreeNode[]) => {
    for (const n of nodes) {
      if (n.type === 'doc') count++;
      const children = folderChildrenCache.value.get(n.id);
      if (children) countDocs(children);
    }
  };
  countDocs(modalRootFolders.value);
  // 根节点直接下的文档
  const rootChildren = folderChildrenCache.value.get(0) || [];
  for (const n of rootChildren) {
    if (n.type === 'doc') count++;
  }
  return count;
});

async function openDeptModal(dept: DeptStat) {
  modalDept.value = dept;
  modalRootFolders.value = [];
  modalFiles.value = [];
  selectedFolderId.value = null;
  expandedFolderIds.value = new Set();
  folderChildrenCache.value = new Map();
  loadingFolderId.value = null;
  modalVisible.value = true;
  modalLoading.value = true;
  try {
    const res = await getDeptDocTree(dept.deptId, 0);
    const data = (res as any)?.data || res || [];
    const nodes = Array.isArray(data) ? data : [];
    // 缓存根节点
    folderChildrenCache.value.set(0, nodes);
    // 根文件夹列表
    modalRootFolders.value = nodes.filter(n => n.type === 'folder');
    // 默认选中第一个文件夹并展开
    if (modalRootFolders.value.length > 0) {
      await selectAndExpand(modalRootFolders.value[0]);
    }
  } catch (e) {
    console.error('加载部门目录失败:', e);
  } finally {
    modalLoading.value = false;
  }
}

function closeDeptModal() {
  modalVisible.value = false;
  modalDept.value = null;
  modalRootFolders.value = [];
  modalFiles.value = [];
  selectedFolderId.value = null;
  expandedFolderIds.value = new Set();
  folderChildrenCache.value = new Map();
}

// 判断文件夹是否有子文件夹
function hasSubFolders(folderId: number): boolean {
  const children = folderChildrenCache.value.get(folderId) || [];
  return children.some(n => n.type === 'folder');
}

// 获取文件夹的子文件夹
function getSubFolders(folderId: number): DeptDocTreeNode[] {
  const children = folderChildrenCache.value.get(folderId) || [];
  return children.filter(n => n.type === 'folder');
}

// 展开/折叠文件夹（点击箭头图标）
async function toggleExpand(folder: DeptDocTreeNode) {
  const s = new Set(expandedFolderIds.value);
  if (s.has(folder.id)) {
    // 已展开则折叠
    s.delete(folder.id);
    expandedFolderIds.value = s;
    // 如果当前选中的是这个文件夹，清空文件列表
    if (selectedFolderId.value === folder.id) {
      modalFiles.value = [];
    }
  } else {
    // 未展开则展开并加载
    s.add(folder.id);
    expandedFolderIds.value = s;
    loadingFolderId.value = folder.id;
    try {
      if (!folderChildrenCache.value.has(folder.id)) {
        const res = await getDeptDocTree(modalDept.value!.deptId, folder.id);
        const data = (res as any)?.data || res || [];
        const children = Array.isArray(data) ? data : [];
        const m = new Map(folderChildrenCache.value);
        m.set(folder.id, children);
        folderChildrenCache.value = m;
      }
    } catch (e) {
      console.error('加载子目录失败:', e);
    } finally {
      loadingFolderId.value = null;
    }
  }
}

// 点击文件夹：选中并展开（不折叠）
async function selectAndExpand(folder: DeptDocTreeNode) {
  selectedFolderId.value = folder.id;

  // 确保展开
  const s = new Set(expandedFolderIds.value);
  if (!s.has(folder.id)) {
    s.add(folder.id);
    expandedFolderIds.value = s;
  }

  loadingFolderId.value = folder.id;
  try {
    // 懒加载子节点
    if (!folderChildrenCache.value.has(folder.id)) {
      const res = await getDeptDocTree(modalDept.value!.deptId, folder.id);
      const data = (res as any)?.data || res || [];
      const children = Array.isArray(data) ? data : [];
      const m = new Map(folderChildrenCache.value);
      m.set(folder.id, children);
      folderChildrenCache.value = m;
    }
    const children = folderChildrenCache.value.get(folder.id) || [];
    modalFiles.value = children.filter(n => n.type === 'doc');
  } catch (e) {
    console.error('加载文件夹内容失败:', e);
  } finally {
    loadingFolderId.value = null;
  }
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

// ===== 模式切换 =====
const currentMode = ref<'search' | 'chat'>('search');
const chatInput = ref('');
const searchBarValue = computed({
  get: () => currentMode.value === 'search' ? searchTerm.value : chatInput.value,
  set: (val: string) => { if (currentMode.value === 'search') searchTerm.value = val; else chatInput.value = val; },
});

function switchToChat() {
  currentMode.value = 'chat';
}

function switchToSearch() {
  currentMode.value = 'search';
  chatInput.value = '';
}

function handleBarSubmit() {
  if (currentMode.value === 'search') {
    doSearch();
  } else {
    const q = chatInput.value.trim();
    if (q) {
      router.push({ path: '/portal/chat', query: { q } });
    }
  }
}

</script>

<template>
  <div class="portal-docs-page">
    <!-- Hero区域 -->
    <section class="hero">
      <h1 class="hero-title">藏经阁</h1>
      <!-- 模式切换 -->
      <button class="mode-link" :class="{ chat: currentMode === 'chat' }" @click="currentMode === 'search' ? switchToChat() : switchToSearch()">
        <i :class="currentMode === 'search' ? 'fa-solid fa-comments' : 'fa-solid fa-folder-open'"></i>
        {{ currentMode === 'search' ? '智能问答' : '文档检索' }}
      </button>
      <p class="hero-desc">{{ currentMode === 'search' ? '让每一份文档，触手可及' : '输入问题后发送，进入智能问答' }}</p>

      <!-- 搜索栏（两种模式共用） -->
      <div class="search-core">
        <div class="search-bar">
          <!-- 部门选择器：仅检索模式 -->
          <div v-if="currentMode === 'search'" class="dept-picker" ref="deptPickerRef" :class="{ open: deptPickerOpen }" @click.stop="deptPickerOpen = !deptPickerOpen">
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
          <div class="search-field" :class="{ 'chat-mode': currentMode === 'chat' }">
            <i :class="currentMode === 'search' ? 'fa-solid fa-magnifying-glass' : 'fa-solid fa-comments'" class="search-field-icon" @click="router.push('/portal/chat')" style="cursor:pointer"></i>
            <input type="text" class="search-input"
                   v-model="searchBarValue"
                   :placeholder="currentMode === 'search' ? '输入文件名、关键词或文件类型...' : '输入您的问题，如「财务中心最近提交了哪些报表？」'"
                   @keyup.enter="handleBarSubmit()">
          </div>
          <button class="search-submit" @click="handleBarSubmit()" :disabled="currentMode === 'search' && searching">
            <template v-if="currentMode === 'chat'">
              <i class="fa-solid fa-paper-plane" style="font-size:12px"></i>发送
            </template>
            <template v-else-if="searching"><i class="fa-solid fa-spinner fa-spin"></i>查询中</template>
            <template v-else><i class="fa-solid fa-magnifying-glass" style="font-size:12px"></i>查询</template>
          </button>
        </div>
      </div>

      <!-- 类型筛选：仅检索模式 -->
      <div v-if="currentMode === 'search'" class="type-bar">
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
              <div class="doc-modal-meta">{{ modalDocCount }} 份文档</div>
            </div>
            <button class="doc-modal-close" @click="closeDeptModal"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="doc-modal-body">
            <div v-if="modalLoading" class="doc-modal-loading">
              <i class="fa-solid fa-spinner fa-spin"></i><span>加载中...</span>
            </div>
            <template v-else>
              <div class="doc-split-view">
                <!-- 左侧文件夹树 -->
                <div class="doc-folder-panel">
                  <div class="doc-folder-header">
                    <i class="fa-regular fa-folder"></i>
                    <span>目录</span>
                  </div>
                  <div class="doc-folder-tree">
                    <!-- 递归渲染文件夹树 -->
                    <template v-for="folder in modalRootFolders" :key="folder.id">
                      <div
                        class="doc-folder-node"
                        :class="{ active: selectedFolderId === folder.id }"
                      >
                        <div class="doc-folder-header-row" @click="selectAndExpand(folder)">
                          <span
                            class="doc-tree-arrow"
                            :class="{ expanded: expandedFolderIds.has(folder.id), hasChildren: folder.hasChildren || hasSubFolders(folder.id) }"
                            @click.stop="toggleExpand(folder)"
                          >
                            <i v-if="folder.hasChildren || hasSubFolders(folder.id)" class="fa-solid fa-chevron-right"></i>
                          </span>
                          <i class="fa-regular fa-folder folder-icon" :class="{ 'fa-folder-open': expandedFolderIds.has(folder.id) }"></i>
                          <span class="folder-name">{{ folder.name }}</span>
                          <i v-if="loadingFolderId === folder.id" class="fa-solid fa-spinner fa-spin loading-spinner"></i>
                        </div>
                        <!-- 子文件夹 -->
                        <div class="doc-folder-children" :class="{ open: expandedFolderIds.has(folder.id) }">
                          <template v-if="expandedFolderIds.has(folder.id) && getSubFolders(folder.id).length">
                            <div
                              v-for="subFolder in getSubFolders(folder.id)"
                              :key="subFolder.id"
                              class="doc-folder-node level-2"
                              :class="{ active: selectedFolderId === subFolder.id }"
                            >
                              <div class="doc-folder-header-row" @click="selectAndExpand(subFolder)">
                                <span
                                  class="doc-tree-arrow"
                                  :class="{ expanded: expandedFolderIds.has(subFolder.id), hasChildren: subFolder.hasChildren || hasSubFolders(subFolder.id) }"
                                  @click.stop="toggleExpand(subFolder)"
                                >
                                  <i v-if="subFolder.hasChildren || hasSubFolders(subFolder.id)" class="fa-solid fa-chevron-right"></i>
                                </span>
                                <i class="fa-regular fa-folder folder-icon" :class="{ 'fa-folder-open': expandedFolderIds.has(subFolder.id) }"></i>
                                <span class="folder-name">{{ subFolder.name }}</span>
                                <i v-if="loadingFolderId === subFolder.id" class="fa-solid fa-spinner fa-spin loading-spinner"></i>
                              </div>
                              <!-- 三级子文件夹 -->
                              <div class="doc-folder-children" :class="{ open: expandedFolderIds.has(subFolder.id) }">
                                <template v-if="expandedFolderIds.has(subFolder.id) && getSubFolders(subFolder.id).length">
                                  <div
                                    v-for="sub3 in getSubFolders(subFolder.id)"
                                    :key="sub3.id"
                                    class="doc-folder-node level-3"
                                    :class="{ active: selectedFolderId === sub3.id }"
                                  >
                                    <div class="doc-folder-header-row" @click="selectAndExpand(sub3)">
                                      <span class="doc-tree-arrow"></span>
                                      <i class="fa-regular fa-folder folder-icon"></i>
                                      <span class="folder-name">{{ sub3.name }}</span>
                                    </div>
                                  </div>
                                </template>
                              </div>
                            </div>
                          </template>
                        </div>
                      </div>
                    </template>
                    <div v-if="modalRootFolders.length === 0" class="doc-folder-empty">
                      <span>暂无目录</span>
                    </div>
                  </div>
                </div>
                <!-- 右侧文件列表 -->
                <div class="doc-file-panel">
                  <div class="doc-file-header">
                    <i class="fa-regular fa-file"></i>
                    <span>文件列表</span>
                    <span class="doc-file-count">{{ modalFiles.length }} 个</span>
                  </div>
                  <div class="doc-file-list" v-if="modalFiles.length">
                    <div
                      v-for="file in modalFiles"
                      :key="file.id"
                      class="doc-file-item"
                      :class="{ downloading: downloadingDocId === file.id }"
                    >
                      <div class="doc-file-icon" :class="ebCls(file.fileType || '')">
                        <i :class="fileIconFA(file.fileType || '')"></i>
                      </div>
                      <div class="doc-file-info">
                        <div class="doc-file-name">{{ file.name }}</div>
                        <div class="doc-file-meta">{{ formatFileSize(file.fileSize || 0) }} · {{ formatDateStr(file.createTime || '') }}</div>
                      </div>
                      <button class="doc-file-dl" @click.stop="handleDownloadDoc(file.id)" :disabled="downloadingDocId === file.id" title="下载">
                        <i :class="downloadingDocId === file.id ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'"></i>
                      </button>
                    </div>
                  </div>
                  <div v-else class="doc-file-empty">
                    <i class="fa-regular fa-file-lines"></i>
                    <p>暂无文件</p>
                  </div>
                </div>
              </div>
            </template>
          </div>
          <div class="doc-modal-footer">
            <span class="doc-modal-footer-info">共 {{ modalDocCount }} 份文档</span>
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
  margin-bottom: 0;
  color: #1A1A1A;
}

.hero-title span {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  font-style: italic;
  opacity: 0.12;
  font-size: 48px;
}

/* 模式切换按钮 */
.mode-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 400;
  color: #6366F1;
  cursor: pointer;
  transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
  border: none;
  background: none;
  font-family: inherit;
  padding: 0;
  position: relative;
  letter-spacing: 0;
}

.mode-link::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 1px;
  background: currentColor;
  opacity: 0.3;
  transition: 0.25s;
}

.mode-link i {
  font-size: 12px;
  transition: 0.25s;
}

.mode-link:hover {
  color: #7C7FF7;
}

.mode-link:hover::after {
  opacity: 0.6;
  background: #7C7FF7;
}

.mode-link:hover i {
  color: #7C7FF7;
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

.search-field.chat-mode {
  padding-left: 16px;
}

.search-field i {
  font-size: 16px;
  color: #A0A0A0;
  margin-left: 16px;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.search-field-icon:hover {
  color: #6366F1 !important;
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
  max-width: 900px;
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

.doc-modal-body {
  flex: 1;
  overflow: hidden;
  min-height: 300px;
}

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

.doc-split-view {
  display: flex;
  height: 100%;
}

.doc-folder-panel {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid #F3F3F3;
  display: flex;
  flex-direction: column;
  background: #FAFAFA;
}

.doc-folder-header {
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #6B6B6B;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid #F3F3F3;
}

.doc-folder-header i { font-size: 12px; color: #D4841C; }

.doc-folder-tree {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
}

.doc-folder-node {
  margin-bottom: 2px;
}

.doc-folder-header-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.2s;
}

.doc-folder-header-row:hover { background: #F0F0F0; }

.doc-folder-node.active > .doc-folder-header-row {
  background: #E8E8E8;
}

.doc-tree-arrow {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.doc-tree-arrow.hasChildren { cursor: pointer; }

.doc-tree-arrow i {
  font-size: 10px;
  color: #A0A0A0;
  transition: 0.2s;
}

.doc-tree-arrow.expanded i {
  transform: rotate(90deg);
}

.doc-folder-node .folder-icon {
  font-size: 14px;
  color: #D4841C;
  flex-shrink: 0;
}

.doc-folder-node .folder-name {
  font-size: 13px;
  color: #1A1A1A;
  font-weight: 500;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-folder-node .loading-spinner {
  font-size: 12px;
  color: #A0A0A0;
}

.doc-folder-children {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.3s ease;
}

.doc-folder-children.open {
  max-height: 1000px;
}

.doc-folder-node.level-2 .doc-folder-header-row {
  padding-left: 26px;
}

.doc-folder-node.level-3 .doc-folder-header-row {
  padding-left: 42px;
}

.doc-folder-empty {
  padding: 24px;
  text-align: center;
  color: #A0A0A0;
  font-size: 13px;
}

.doc-file-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.doc-file-header {
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #6B6B6B;
  display: flex;
  align-items: center;
  gap: 6px;
  border-bottom: 1px solid #F3F3F3;
  background: #FAFAFA;
}

.doc-file-header i { font-size: 12px; }

.doc-file-count {
  font-size: 11px;
  color: #A0A0A0;
  font-weight: 400;
  margin-left: 4px;
}

.doc-file-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 12px;
}

.doc-file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  transition: 0.2s;
  background: #FFFFFF;
  margin-bottom: 4px;
}

.doc-file-item:hover {
  background: #F5F5F5;
}

.doc-file-item.downloading {
  opacity: 0.6;
}

.doc-file-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.eb-xlsx { background: #EFF7F2; color: #2D8B55; }
.eb-docx { background: #EEF3F9; color: #3B6FB5; }
.eb-pdf { background: #FCEEEC; color: #C44536; }
.eb-pptx { background: #FDF3E7; color: #D4841C; }

.doc-file-info { flex: 1; min-width: 0; }

.doc-file-name {
  font-size: 14px;
  color: #1A1A1A;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-file-meta {
  font-size: 11px;
  color: #A0A0A0;
  margin-top: 2px;
}

.doc-file-dl {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #ECECEC;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #A0A0A0;
  font-size: 12px;
  flex-shrink: 0;
  opacity: 0;
  transition: 0.2s;
}

.doc-file-item:hover .doc-file-dl { opacity: 1; }
.doc-file-dl:hover { border-color: #1A1A1A; color: #1A1A1A; background: #F5F5F5; }
.doc-file-dl:disabled { opacity: 1; cursor: not-allowed; }

.doc-file-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #A0A0A0;
}

.doc-file-empty i { font-size: 32px; display: block; margin-bottom: 12px; }
.doc-file-empty p { font-size: 13px; font-weight: 300; }

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