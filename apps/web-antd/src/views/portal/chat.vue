<script lang="ts" setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

// ===== 对话数据 =====
interface RefFile {
  type: 'excel' | 'word' | 'pdf' | 'ppt';
  name: string;
  meta: string;
}
interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  searchCount?: number;
  refFiles?: RefFile[];
  time?: string;
}
interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

const STORAGE_KEY = 'kb_chat_conversations';
const conversations = ref<Conversation[]>([]);
const activeConvId = ref<string>('');
const fileInputRef = ref<HTMLInputElement | null>(null);
const attachedFiles = ref<{ name: string; size: string }[]>([]);
const inputText = ref('');
const typing = ref(false);
const chatBodyRef = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const sidebarOpen = ref(true);

// ===== 文件选择 =====
function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files) return;
  for (const file of input.files) {
    attachedFiles.value.push({
      name: file.name,
      size: formatFileSize(file.size),
    });
  }
  input.value = '';
}

// 当前对话
const activeConv = computed(() =>
  conversations.value.find((c) => c.id === activeConvId.value),
);

// 按时间倒序
const sortedConversations = computed(() =>
  [...conversations.value].sort((a, b) => b.createdAt - a.createdAt),
);

// 输入框是否有内容
const hasInput = computed(() => inputText.value.trim().length > 0);

// ===== localStorage =====
function loadConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) conversations.value = JSON.parse(raw);
  } catch {
    /* ignore */
  }
}

function saveConversations() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.value));
  } catch {
    /* ignore */
  }
}

watch(conversations, saveConversations, { deep: true });

// ===== 工具函数 =====
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;

  if (d.toDateString() === now.toDateString()) return `今天 ${timeStr}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `昨天 ${timeStr}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${timeStr}`;
}

// ===== 对话操作 =====
function createConversation() {
  const conv: Conversation = {
    id: genId(),
    title: '新对话',
    messages: [],
    createdAt: Date.now(),
  };
  conversations.value.push(conv);
  activeConvId.value = conv.id;
  inputText.value = '';
  nextTick(() => {
    textareaRef.value?.focus();
  });
}

function selectConversation(id: string) {
  activeConvId.value = id;
  nextTick(() => scrollChatBottom());
}

function deleteConversation(id: string, e: MouseEvent) {
  e.stopPropagation();
  conversations.value = conversations.value.filter((c) => c.id !== id);
  if (activeConvId.value === id) {
    activeConvId.value =
      conversations.value.length > 0 ? sortedConversations.value[0]!.id : '';
  }
}

// ===== 滚动 =====
function scrollChatBottom() {
  if (chatBodyRef.value) {
    chatBodyRef.value.scrollTo({
      top: chatBodyRef.value.scrollHeight,
      behavior: 'smooth',
    });
  }
}

// ===== 自动调整 textarea 高度 =====
function autoResize() {
  const ta = textareaRef.value;
  if (!ta) return;
  ta.style.height = 'auto';
  ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
}

// ===== Mock AI 回复 =====
function getMockResponse(
  question: string,
): { text: string; refFiles: RefFile[] } {
  const q = question.toLowerCase();

  if (q.includes('财务') || q.includes('报表') || q.includes('营收')) {
    return {
      text: `根据对知识库中相关文档的检索与分析，以下是关键发现：\n\n<strong>营收表现：</strong>Q4实现总营收 <strong>8,642万元</strong>，环比Q3增长 <strong>12.3%</strong>，同比增长 <strong>18.7%</strong>。其中主营业务收入占比 87.2%，其他业务收入占比 12.8%。\n\n<strong>利润表现：</strong>Q4实现净利润 <strong>1,536万元</strong>，环比Q3增长 <strong>8.6%</strong>。毛利率为 <strong>42.8%</strong>，较Q3提升 1.2 个百分点。\n\n<strong>关键变化：</strong>\n• 新业务线贡献营收增量约 680 万元，成为最大增长驱动力\n• 管理费用率从 Q3 的 11.4% 降至 10.2%，降本效果显著\n• 研发投入环比增加 15.2%，但占营收比保持在合理区间\n• 应收账款周转天数从 45 天缩短至 38 天，回款效率提升`,
      refFiles: [
        { type: 'excel', name: 'Q4财务报表汇总.xlsx', meta: '财务部 · 2.4MB' },
        { type: 'pdf', name: 'Q4季度分析报告.pdf', meta: '财务部 · 5.1MB' },
        { type: 'ppt', name: '季度经营汇报.pptx', meta: '总经办 · 8.7MB' },
      ],
    };
  }

  if (q.includes('研发') || q.includes('研究院') || q.includes('技术')) {
    return {
      text: `根据文档库中的信息，关于研发院相关文档的检索结果如下：\n\n<strong>在研项目：</strong>当前共有 <strong>5个</strong> 在研项目，涵盖新材料、传感器模组、智能控制系统等关键技术领域。\n\n<strong>近期进展：</strong>\n• 新材料试验数据已汇总完成，第三方检测报告已入库\n• 2026年度研发项目立项报告已通过评审\n• 传感器模组项目进入中试阶段\n\n<strong>文档概况：</strong>研发院共提交技术文档 <strong>47份</strong>，其中试验报告 18 份、设计文档 15 份、检测报告 14 份。`,
      refFiles: [
        { type: 'word', name: '2026年度研发项目立项报告.docx', meta: '中央研究院 · 3.2MB' },
        { type: 'excel', name: '新材料试验数据汇总.xlsx', meta: '中央研究院 · 1.8MB' },
        { type: 'pdf', name: '第三方检测报告.pdf', meta: '中央研究院 · 6.5MB' },
      ],
    };
  }

  if (q.includes('人力') || q.includes('招聘') || q.includes('培训')) {
    return {
      text: `人力资源部近期更新文档如下：\n\n<strong>绩效管理：</strong>2026年Q2绩效考核方案已发布，新增项目制考核维度，覆盖全部技术岗位。\n\n<strong>培训体系：</strong>新员工入职培训手册2026版已更新，包含企业文化、制度规范、岗位技能三大模块共 <strong>28个课时</strong>。\n\n<strong>招聘计划：</strong>\n• 校园招聘宣讲PPT已制作完成\n• 春季校招计划覆盖 <strong>12所</strong> 高校\n• 社招开放岗位 <strong>23个</strong>，重点方向为研发和产品`,
      refFiles: [
        { type: 'pdf', name: '2026年Q2绩效考核方案.pdf', meta: '人力资源部 · 2.1MB' },
        { type: 'pdf', name: '新员工入职培训手册2026版.pdf', meta: '人力资源部 · 4.8MB' },
        { type: 'ppt', name: '校园招聘宣讲PPT.pptx', meta: '人力资源部 · 12.3MB' },
      ],
    };
  }

  return {
    text: `感谢您的提问。我已检索文档库中的相关内容。\n\n根据对知识库的检索，我找到了一些可能与您问题相关的信息。为了给出更精确的回答，您可以尝试以下方式：\n\n• 提供更具体的关键词或部门名称\n• 明确需要查询的文档类型（如财务报表、技术文档等）\n• 指定时间范围（如某季度、某年度）\n\n我会持续优化检索能力，为您提供更准确的解答。`,
    refFiles: [
      { type: 'pdf', name: '相关参考文档.pdf', meta: '综合部 · 2.1MB' },
    ],
  };
}

// ===== 发送消息 =====
function sendMessage(overrideText?: string) {
  const text = (overrideText || inputText.value).trim();
  if (!text || typing.value || !activeConv.value) return;

  activeConv.value.messages.push({
    role: 'user',
    content: text,
    time: formatTime(Date.now()),
  });

  // 自动取标题
  if (activeConv.value.title === '新对话') {
    activeConv.value.title =
      text.length > 20 ? text.substring(0, 20) + '...' : text;
  }

  inputText.value = '';
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
  }
  typing.value = true;
  nextTick(() => scrollChatBottom());

  const mock = getMockResponse(text);
  const searchCount = Math.floor(Math.random() * 5) + 2;

  setTimeout(() => {
    typing.value = false;
    activeConv.value?.messages.push({
      role: 'ai',
      content: mock.text,
      searchCount,
      refFiles: mock.refFiles,
      time: formatTime(Date.now()),
    });
    nextTick(() => scrollChatBottom());
  }, 1800 + Math.random() * 600);
}

// ===== 快捷入口 =====
const shortcuts = [
  { text: '查询Q4财务数据', query: '查询财务部Q4季度的营收和利润情况' },
  { text: '文档库统计概览', query: '了解当前文档库的整体统计数据' },
  { text: '搜索PDF类型文件', query: '搜索所有PDF类型的文件有哪些' },
  { text: '各部门预算对比', query: '对比各部门的预算执行情况' },
];

// ===== 操作 =====
function goHome() {
  router.push('/portal/docs?mode=chat');
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (hasInput.value) sendMessage();
  }
}

function copyMessage(text: string) {
  const plain = text.replace(/<[^>]*>/g, '');
  navigator.clipboard.writeText(plain).catch(() => {});
}

// ===== 初始化 =====
onMounted(() => {
  loadConversations();
  if (conversations.value.length === 0) {
    createConversation();
  } else {
    activeConvId.value = sortedConversations.value[0]!.id;
  }
  // 如果带了问题参数，自动发送
  const q = (route.query.q as string)?.trim();
  if (q && activeConv.value) {
    nextTick(() => sendMessage(q));
  }
});
</script>

<template>
  <div class="chat-page">
    <!-- 左侧边栏 -->
    <aside class="sidebar" :class="{ collapsed: !sidebarOpen }">
      <div class="sidebar-header">
        <span class="sidebar-title">对话记录</span>
        <button class="sidebar-new" @click="createConversation" title="新建对话">
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
      <div class="sidebar-list">
        <div
          v-for="conv in sortedConversations"
          :key="conv.id"
          class="sidebar-item"
          :class="{ active: conv.id === activeConvId }"
          @click="selectConversation(conv.id)"
        >
          <div class="sidebar-item-title">{{ conv.title }}</div>
          <div class="sidebar-item-meta">
            {{ formatTime(conv.createdAt) }} · {{ conv.messages.length }}条消息
          </div>
          <button
            class="sidebar-item-del"
            @click="deleteConversation(conv.id, $event)"
            title="删除"
          >
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
        <div v-if="conversations.length === 0" class="sidebar-empty">暂无对话</div>
      </div>
    </aside>

    <!-- 右侧主区 -->
    <main class="main" :class="{ expanded: !sidebarOpen }">
      <!-- 顶栏 -->
      <div class="chat-topbar">
        <button class="topbar-toggle" @click="sidebarOpen = !sidebarOpen">
          <i class="fa-solid fa-bars"></i>
        </button>
        <div class="topbar-center" @click="goHome" role="button" tabindex="0" @keydown.enter="goHome">
          <div class="topbar-icon">
            <i class="fa-solid fa-comments"></i>
          </div>
          <span class="topbar-title">智能问答</span>
        </div>
        <div class="topbar-spacer"></div>
      </div>

      <!-- 对话内容 -->
      <div class="chat-body" ref="chatBodyRef">
        <!-- 欢迎区 -->
        <div v-if="activeConv && activeConv.messages.length === 0 && !typing" class="welcome">
          <div class="welcome-icon">
            <i class="fa-solid fa-comments"></i>
          </div>
          <h1 class="welcome-title">有什么可以帮你的?</h1>
          <p class="welcome-desc">
            我已经索引了知识库中的全部文档，直接向我提问，我会基于文档内容给出精确回答。
          </p>
          <div class="welcome-divider"></div>
          <div class="welcome-shortcuts">
            <div
              v-for="(s, i) in shortcuts"
              :key="i"
              class="welcome-shortcut"
              @click="sendMessage(s.query)"
            >
              {{ s.text }}
            </div>
          </div>
        </div>

        <!-- 消息列表 -->
        <template v-if="activeConv">
          <template v-for="(msg, idx) in activeConv.messages" :key="idx">
            <!-- 用户消息 -->
            <div v-if="msg.role === 'user'" class="message message-user">
              <div class="message-user-bubble">{{ msg.content }}</div>
            </div>

            <!-- AI 消息 -->
            <div v-else class="message message-ai">
              <div class="message-ai-body">
                <!-- 回答文本 -->
                <div class="message-ai-text" v-html="msg.content"></div>

                <!-- 引用文件 -->
                <div v-if="msg.refFiles && msg.refFiles.length" class="ref-files">
                  <div class="ref-files-label">
                    <i class="fa-solid fa-link"></i> 相关文档
                  </div>
                  <div v-for="(f, fi) in msg.refFiles" :key="fi" class="ref-file">
                    <div class="ref-file-icon" :class="f.type">
                      <i :class="f.type === 'excel' ? 'fa-solid fa-file-excel' : f.type === 'word' ? 'fa-solid fa-file-word' : f.type === 'pdf' ? 'fa-solid fa-file-pdf' : 'fa-solid fa-file-powerpoint'"></i>
                    </div>
                    <span class="ref-file-name">{{ f.name }}</span>
                  </div>
                </div>
              </div>

              <!-- 消息操作 + 时间 -->
              <div class="message-footer">
                <div class="message-actions">
                  <button class="msg-action" @click="copyMessage(msg.content)">
                    <i class="fa-regular fa-copy"></i>
                  </button>
                  <button class="msg-action">
                    <i class="fa-regular fa-thumbs-up"></i>
                  </button>
                  <button class="msg-action">
                    <i class="fa-regular fa-thumbs-down"></i>
                  </button>
                  <button class="msg-action" @click="sendMessage(msg.content)">
                    <i class="fa-solid fa-rotate-right"></i>
                  </button>
                </div>
                <span class="message-time">{{ msg.time || '刚刚' }}</span>
              </div>
            </div>
          </template>
        </template>

        <!-- 打字指示器 -->
        <div v-if="typing" class="message message-ai">
          <div class="message-ai-body">
            <div class="typing-indicator">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 输入区 -->
      <div class="chat-input-area">
        <div class="input-wrapper">
          <!-- 已选文件预览 -->
          <div v-if="attachedFiles.length" class="attached-files">
            <div v-for="(f, i) in attachedFiles" :key="i" class="attached-file">
              <i class="fa-solid fa-file attached-file-icon"></i>
              <span class="attached-file-name">{{ f.name }}</span>
              <span class="attached-file-size">{{ f.size }}</span>
              <button class="attached-file-remove" @click="attachedFiles.splice(i, 1)">
                <i class="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
          <div class="input-bar" :class="{ 'has-files': attachedFiles.length }">
            <button class="input-attach" title="添加附件" @click="fileInputRef?.click()">
              <i class="fa-solid fa-paperclip"></i>
            </button>
            <input
              ref="fileInputRef"
              type="file"
              multiple
              accept=".xlsx,.xls,.docx,.doc,.pdf,.pptx,.ppt,.txt,.csv"
              style="display: none"
              @change="handleFileSelect"
            />
            <textarea
              ref="textareaRef"
              class="input-textarea"
              rows="1"
              v-model="inputText"
              placeholder="给「藏经阁」发送消息..."
              @input="autoResize"
              @keydown="handleKeydown"
              :disabled="typing"
            ></textarea>
            <button class="input-icon-btn" title="语音输入">
              <i class="fa-solid fa-microphone"></i>
            </button>
            <button
              class="input-icon-btn input-send"
              :class="{ active: hasInput && !typing }"
              @click="sendMessage()"
              :disabled="!hasInput || typing"
              title="发送"
            >
              <i class="fa-solid fa-arrow-up"></i>
            </button>
          </div>
        </div>
      </div>
    </main>

  </div>
</template>

<style scoped>
/* ===== 页面容器：position: fixed 覆盖 portal-main ===== */
.chat-page {
  position: fixed;
  top: 58px;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  background: #FAFAFA;
  z-index: 10;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ===== 左侧边栏 ===== */
.sidebar {
  width: 260px;
  flex-shrink: 0;
  background: #FFFFFF;
  border-right: 1px solid #ECECEC;
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 0;
  border-right: none;
  opacity: 0;
  pointer-events: none;
}

.sidebar-header {
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.sidebar-title {
  font-size: 13px;
  font-weight: 600;
  color: #1A1A1A;
}

.sidebar-new {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px dashed #D5D5D5;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #A0A0A0;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.25s;
}

.sidebar-new:hover {
  border-color: #6366F1;
  color: #6366F1;
  border-style: solid;
}

.sidebar-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.sidebar-list:hover {
  scrollbar-color: #ECECEC transparent;
}

.sidebar-item {
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 2px;
  position: relative;
}

.sidebar-item:hover {
  background: #F5F5F5;
}

.sidebar-item:hover .sidebar-item-del {
  opacity: 1;
}

.sidebar-item.active {
  background: #F0F0FF;
}

.sidebar-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  border-radius: 0 3px 3px 0;
  background: #6366F1;
}

.sidebar-item-title {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
  padding-right: 20px;
}

.sidebar-item.active .sidebar-item-title {
  font-weight: 600;
  color: #6366F1;
}

.sidebar-item-meta {
  font-size: 11px;
  color: #A0A0A0;
  font-weight: 300;
}

.sidebar-item-del {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #A0A0A0;
  font-size: 10px;
  opacity: 0;
  transition: all 0.2s;
  border-radius: 4px;
}

.sidebar-item-del:hover {
  color: #C44536;
  background: #FCEEEC;
}

.sidebar-empty {
  padding: 32px 16px;
  text-align: center;
  color: #A0A0A0;
  font-size: 13px;
  font-weight: 300;
}

/* ===== 右侧主区 ===== */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
  background: #FAFAFA;
}

.main.expanded {
  /* sidebar collapsed 时 main 自动填满 */
}

/* ===== 顶栏 ===== */
.chat-topbar {
  height: 52px;
  padding: 0 20px;
  border-bottom: 1px solid #ECECEC;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  background: #FFFFFF;
  position: relative;
}

.topbar-toggle {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid #ECECEC;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #A0A0A0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.topbar-toggle:hover {
  border-color: #D5D5D5;
  color: #1A1A1A;
  background: #F5F5F5;
}

.topbar-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 16px;
  border-radius: 100px;
  transition: all 0.25s;
  user-select: none;
}

.topbar-center:hover {
  background: #F5F5F5;
}

.topbar-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, #6366F1, #7C7FF7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
}

.topbar-title {
  font-size: 15px;
  font-weight: 700;
  color: #1A1A1A;
}

.topbar-spacer {
  width: 32px;
  flex-shrink: 0;
}

/* ===== 对话区域 ===== */
.chat-body {
  flex: 1;
  overflow-y: auto;
  padding: 28px 80px 24px;
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}

.chat-body:hover {
  scrollbar-color: #ECECEC transparent;
}

/* ===== 欢迎区 ===== */
.welcome {
  max-width: 560px;
  margin: 80px auto 0;
  text-align: center;
  animation: fadeUp 0.5s ease both;
}

.welcome-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(124, 127, 247, 0.08));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  color: #6366F1;
  margin: 0 auto 20px;
}

.welcome-title {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 8px;
}

.welcome-desc {
  font-size: 14px;
  font-weight: 300;
  color: #A0A0A0;
  line-height: 1.7;
}

.welcome-divider {
  width: 32px;
  height: 2px;
  background: #ECECEC;
  margin: 24px auto;
  border-radius: 2px;
}

.welcome-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.welcome-shortcut {
  padding: 9px 16px;
  border-radius: 10px;
  border: 1px solid #ECECEC;
  background: #FFFFFF;
  cursor: pointer;
  transition: all 0.25s;
  font-size: 13px;
  color: #6B6B6B;
  font-weight: 400;
}

.welcome-shortcut:hover {
  border-color: #6366F1;
  color: #6366F1;
  background: #F0F0FF;
}

/* ===== 消息 ===== */
.message {
  max-width: 780px;
  margin: 0 auto 20px;
  animation: fadeUp 0.4s ease both;
}

/* 用户消息 */
.message-user {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
}

.message-user-bubble {
  background: #6366F1;
  color: #fff;
  padding: 11px 18px;
  border-radius: 16px 16px 4px 16px;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.7;
  max-width: 480px;
}

/* AI 消息 */
.message-ai {
  margin-bottom: 4px;
}

.message-ai-body {
  padding-left: 0;
}

.message-ai-text {
  font-size: 14px;
  font-weight: 400;
  color: #1A1A1A;
  line-height: 1.85;
  margin-bottom: 14px;
}

.message-ai-text :deep(strong) {
  font-weight: 600;
}

/* 文件引用 */
.ref-files {
  margin-bottom: 14px;
  border-top: 1px solid #F3F3F3;
  padding-top: 10px;
}

.ref-files-label {
  font-size: 11px;
  color: #A0A0A0;
  font-weight: 400;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.ref-files-label i {
  font-size: 10px;
}

.ref-file {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  transition: background 0.2s;
  cursor: pointer;
}

.ref-file:hover {
  background: #F5F5F5;
}

.ref-file-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
}

.ref-file-icon.excel { background: #EFF7F2; color: #2D8B55; }
.ref-file-icon.word { background: #EEF3F9; color: #3B6FB5; }
.ref-file-icon.pdf { background: #FCEEEC; color: #C44536; }
.ref-file-icon.ppt { background: #FDF3E7; color: #D4841C; }

.ref-file-name {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 消息操作 + 时间 */
.message-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-ai:hover .message-footer {
  opacity: 1;
}

.message-actions {
  display: flex;
  gap: 2px;
}

.msg-action {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  font-size: 12px;
  color: #A0A0A0;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: inherit;
}

.msg-action:hover {
  color: #6366F1;
  background: #F0F0FF;
}

.message-time {
  font-size: 11px;
  color: #A0A0A0;
  font-weight: 300;
  white-space: nowrap;
}

/* 打字指示器 */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 18px;
}

.typing-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #A0A0A0;
  animation: typingBounce 1.2s ease-in-out infinite;
}

.typing-dot:nth-child(2) { animation-delay: 0.15s; }
.typing-dot:nth-child(3) { animation-delay: 0.3s; }

@keyframes typingBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-6px); opacity: 1; }
}

/* ===== 输入区 ===== */
.chat-input-area {
  padding: 0 80px 24px;
  flex-shrink: 0;
}

.input-wrapper {
  max-width: 780px;
  margin: 0 auto;
}

.input-bar {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  background: #FFFFFF;
  border: 2px solid #ECECEC;
  border-radius: 24px;
  padding: 10px 12px 10px 14px;
  transition: all 0.25s;
}

.input-bar:focus-within {
  border-color: #6366F1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08);
}

.input-attach {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #A0A0A0;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.input-attach:hover {
  color: #6366F1;
}

.input-textarea {
  flex: 1;
  border: none;
  outline: none;
  resize: none;
  font-family: inherit;
  font-size: 15px;
  font-weight: 400;
  color: #1A1A1A;
  line-height: 1.5;
  min-height: 24px;
  max-height: 120px;
  background: transparent;
  padding: 4px 0;
}

.input-textarea::placeholder {
  color: #A0A0A0;
  font-weight: 300;
}

.input-icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #A0A0A0;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.input-icon-btn:hover {
  color: #6366F1;
  background: #F0F0FF;
}

.input-send {
  background: #D5D5D5;
  color: #fff;
}

.input-send.active {
  background: #6366F1;
}

.input-send.active:hover {
  background: #7C7FF7;
  box-shadow: 0 2px 10px rgba(99, 102, 241, 0.3);
}

/* ===== 已选文件预览 ===== */
.attached-files {
  padding: 10px 14px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.attached-file {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 8px;
  background: #F5F5F5;
  font-size: 12px;
  color: #1A1A1A;
  max-width: 220px;
}

.attached-file-icon {
  color: #6366F1;
  font-size: 11px;
  flex-shrink: 0;
}

.attached-file-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.attached-file-size {
  color: #A0A0A0;
  font-size: 11px;
  flex-shrink: 0;
}

.attached-file-remove {
  width: 18px;
  height: 18px;
  border: none;
  background: none;
  color: #A0A0A0;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  flex-shrink: 0;
  transition: all 0.2s;
}

.attached-file-remove:hover {
  color: #C44536;
  background: #FCEEEC;
}

.input-bar.has-files {
  border-radius: 0 0 24px 24px;
  border-top: none;
}

/* ===== 动画 ===== */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ===== 滚动条 ===== */
.chat-body::-webkit-scrollbar { width: 4px; }
.chat-body::-webkit-scrollbar-track { background: transparent; }
.chat-body::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
.chat-body:hover::-webkit-scrollbar-thumb { background: #ECECEC; }

.sidebar-list::-webkit-scrollbar { width: 4px; }
.sidebar-list::-webkit-scrollbar-track { background: transparent; }
.sidebar-list::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
.sidebar-list:hover::-webkit-scrollbar-thumb { background: #ECECEC; }

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .sidebar {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    z-index: 100;
    box-shadow: 4px 0 16px rgba(0, 0, 0, 0.06);
  }

  .sidebar.collapsed {
    box-shadow: none;
  }

  .chat-body {
    padding: 20px 24px;
  }

  .chat-input-area {
    padding: 0 24px 16px;
  }

  .message-ai-body {
    padding-left: 0;
  }

  .typing-indicator {
    padding-left: 0;
  }

  .suggestions {
    grid-template-columns: 1fr;
  }

  .welcome-title {
    font-size: 20px;
  }
}
</style>
