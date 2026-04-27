<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue';

// 慕课数据
const courses = [
  {title:'AI+金融产品经理实战营',cat:'product',direction:'business',author:'张明远',year:'2026',duration:'45:20',views:3842,date:'2026-04-03',progress:0,seed:'ai-finance',attachments:[
    {name:'AI金融产品思维导图.pdf',ext:'pdf',size:'1.2 MB'},{name:'课程案例数据集.xlsx',ext:'xlsx',size:'3.8 MB'},{name:'实战作业模板.docx',ext:'docx',size:'560 KB'}
  ]},
  {title:'飞书团队高效协作打造指南',cat:'tools',direction:'business',author:'李思涵',year:'2026',duration:'32:15',views:5210,date:'2026-04-01',progress:65,seed:'feishu-team',attachments:[
    {name:'飞书使用手册.pdf',ext:'pdf',size:'4.5 MB'},{name:'团队协作SOP模板.docx',ext:'docx',size:'890 KB'},{name:'自动化工作流配置指南.pdf',ext:'pdf',size:'2.1 MB'}
  ]},
  {title:'数据分析思维与Python实战',cat:'tech',direction:'tech',author:'王博文',year:'2026',duration:'58:40',views:2967,date:'2026-03-30',progress:30,seed:'data-python',attachments:[
    {name:'Python基础代码包.zip',ext:'zip',size:'12.6 MB'},{name:'数据分析案例数据.xlsx',ext:'xlsx',size:'5.2 MB'},{name:'课程讲义.pdf',ext:'pdf',size:'8.9 MB'}
  ]},
  {title:'高效能人士的七个习惯',cat:'soft',direction:'manage',author:'陈雅琪',year:'2025',duration:'28:50',views:6124,date:'2025-12-28',progress:100,seed:'seven-habits',attachments:[
    {name:'七个习惯践行手册.pdf',ext:'pdf',size:'1.8 MB'},{name:'个人效能评估表.xlsx',ext:'xlsx',size:'340 KB'}
  ]},
  {title:'ISO质量管理体系内审员培训',cat:'compliance',direction:'quality',author:'刘国强',year:'2025',duration:'1:12:30',views:1856,date:'2025-11-25',progress:0,seed:'iso-quality',attachments:[
    {name:'ISO9001标准条文解读.pdf',ext:'pdf',size:'3.4 MB'},{name:'内审检查表模板.xlsx',ext:'xlsx',size:'1.1 MB'},{name:'不符合项报告模板.docx',ext:'docx',size:'280 KB'},{name:'体系文件编写指南.pdf',ext:'pdf',size:'2.6 MB'}
  ]},
  {title:'OKR目标管理落地工作坊',cat:'manage',direction:'manage',author:'赵瑞芳',year:'2025',duration:'41:10',views:4380,date:'2025-10-22',progress:45,seed:'okr-workshop',attachments:[
    {name:'OKR制定模板.xlsx',ext:'xlsx',size:'680 KB'},{name:'目标拆解方法论.pdf',ext:'pdf',size:'1.5 MB'}
  ]},
  {title:'大模型应用开发入门到精通',cat:'tech',direction:'tech',author:'孙浩然',year:'2026',duration:'1:05:20',views:7821,date:'2026-04-04',progress:10,seed:'llm-develop',attachments:[
    {name:'大模型开发环境搭建指南.pdf',ext:'pdf',size:'2.3 MB'},{name:'Prompt工程模板库.docx',ext:'docx',size:'1.8 MB'},{name:'示例代码仓库.zip',ext:'zip',size:'8.5 MB'},{name:'API调用速查表.pdf',ext:'pdf',size:'420 KB'}
  ]},
  {title:'企业信息安全意识培训',cat:'compliance',direction:'quality',author:'周婉清',year:'2024',duration:'22:35',views:9032,date:'2024-09-18',progress:100,seed:'info-security',attachments:[
    {name:'安全意识培训手册.pdf',ext:'pdf',size:'6.7 MB'},{name:'常见钓鱼邮件识别.pdf',ext:'pdf',size:'1.2 MB'},{name:'密码安全管理规范.docx',ext:'docx',size:'350 KB'}
  ]},
  {title:'项目管理PMP核心方法论',cat:'manage',direction:'manage',author:'吴启航',year:'2024',duration:'52:45',views:3156,date:'2024-08-15',progress:0,seed:'pmp-method',attachments:[
    {name:'PMP知识体系导图.pdf',ext:'pdf',size:'2.8 MB'},{name:'项目计划模板.xlsx',ext:'xlsx',size:'1.4 MB'},{name:'风险管理登记表.xlsx',ext:'xlsx',size:'760 KB'},{name:'敏捷实践指南.pdf',ext:'pdf',size:'3.1 MB'},{name:'项目收尾清单.docx',ext:'docx',size:'290 KB'}
  ]}
];

const catLabel: Record<string, string> = {product:'产品',tech:'技术',manage:'管理',compliance:'合规',tools:'工具',soft:'软技能'};
const catColor: Record<string, string> = {product:'#D4841C',tech:'#3B6FB5',manage:'#6B5CE7',compliance:'#C44536',tools:'#2D8B55',soft:'#B8860B'};
const dirLabel: Record<string, string> = {business:'业务方向',tech:'技术方向',manage:'管理方向',quality:'质量方向'};
const aiCls = (e: string) => ({xlsx:'ai-xlsx',docx:'ai-docx',pdf:'ai-pdf',pptx:'ai-pptx',zip:'ai-zip'})[e]||'ai-pdf';
const aiFA = (e: string) => ({xlsx:'fa-solid fa-file-excel',docx:'fa-solid fa-file-word',pdf:'fa-solid fa-file-pdf',pptx:'fa-solid fa-file-powerpoint',zip:'fa-solid fa-file-zipper'})[e]||'fa-solid fa-file';

// 状态
const mukeSearch = ref('');
const mukeSort = ref('new');
const filterOpen = ref(false);
const fDirection = ref('all');
const fCategory = ref('all');
const fAuthor = ref('all');
const fYear = ref('all');

// 作者列表
const authors = [...new Set(courses.map(c => c.author))].sort((a, b) => a.localeCompare(b, 'zh'));

// 筛选数量
const filterBadge = computed(() => {
  let n = 0;
  if (fDirection.value !== 'all') n++;
  if (fCategory.value !== 'all') n++;
  if (fAuthor.value !== 'all') n++;
  if (fYear.value !== 'all') n++;
  return n;
});

// 筛选后的列表
const filteredList = computed(() => {
  let list = [...courses];
  if (fDirection.value !== 'all') list = list.filter(c => c.direction === fDirection.value);
  if (fCategory.value !== 'all') list = list.filter(c => c.cat === fCategory.value);
  if (fAuthor.value !== 'all') list = list.filter(c => c.author === fAuthor.value);
  if (fYear.value !== 'all') list = list.filter(c => c.year === fYear.value);
  if (mukeSearch.value) {
    const t = mukeSearch.value.toLowerCase();
    list = list.filter(c => c.title.toLowerCase().includes(t) || c.author.toLowerCase().includes(t));
  }
  if (mukeSort.value === 'new') list.sort((a, b) => b.date.localeCompare(a.date));
  else if (mukeSort.value === 'hot') list.sort((a, b) => b.views - a.views);
  else if (mukeSort.value === 'name') list.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  return list;
});

// 附件弹窗
const attachModalOpen = ref(false);
const selectedCourse = ref<any>(null);

function openAttach(course: any) {
  selectedCourse.value = course;
  attachModalOpen.value = true;
}

function closeAttach() {
  attachModalOpen.value = false;
  selectedCourse.value = null;
}

function resetFilters() {
  fDirection.value = 'all';
  fCategory.value = 'all';
  fAuthor.value = 'all';
  fYear.value = 'all';
}
</script>

<template>
  <div class="portal-muke-page">
    <!-- Hero区域 -->
    <section class="muke-hero">
      <h1>讲武堂 <span>M</span></h1>
      <p>精选内部培训课程，涵盖产品、技术、管理、合规等多领域</p>
      <div class="muke-search">
        <input type="text" v-model="mukeSearch" placeholder="搜索课程名称、讲师...">
        <i class="fa-solid fa-magnifying-glass"></i>
      </div>
    </section>

    <!-- 筛选面板 -->
    <div class="filter-panel">
      <div class="filter-toggle" :class="{ open: filterOpen }" @click="filterOpen = !filterOpen">
        <i class="fa-solid fa-chevron-down"></i>
        <span>筛选条件</span>
        <span v-if="filterBadge > 0" class="filter-badge">{{ filterBadge }}</span>
      </div>
      <div class="filter-body" :class="{ open: filterOpen }">
        <div class="filter-grid">
          <div class="filter-group">
            <label class="filter-group-label">方向</label>
            <select class="filter-select" v-model="fDirection">
              <option value="all">全部方向</option>
              <option value="business">业务方向</option>
              <option value="tech">技术方向</option>
              <option value="manage">管理方向</option>
              <option value="quality">质量方向</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-group-label">分类</label>
            <select class="filter-select" v-model="fCategory">
              <option value="all">全部分类</option>
              <option value="product">产品</option>
              <option value="tech">技术</option>
              <option value="manage">管理</option>
              <option value="compliance">合规</option>
              <option value="tools">工具</option>
              <option value="soft">软技能</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-group-label">作者</label>
            <select class="filter-select" v-model="fAuthor">
              <option value="all">全部作者</option>
              <option v-for="a in authors" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-group-label">年份</label>
            <select class="filter-select" v-model="fYear">
              <option value="all">全部年份</option>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
            </select>
          </div>
        </div>
        <div class="filter-actions">
          <button class="filter-btn-reset" @click="resetFilters">
            <i class="fa-solid fa-rotate-left"></i>重置筛选
          </button>
        </div>
      </div>
    </div>

    <!-- 课程网格 -->
    <section class="muke-grid-area">
      <div class="muke-grid-bar">
        <div class="muke-grid-left">
          <span class="muke-grid-title">课程列表</span>
          <span class="muke-grid-count">共 {{ filteredList.length }} 门课程</span>
        </div>
        <div class="muke-grid-sort">
          <button class="muke-sort-btn" :class="{ active: mukeSort === 'new' }" @click="mukeSort = 'new'">
            <i class="fa-regular fa-clock"></i>最新
          </button>
          <button class="muke-sort-btn" :class="{ active: mukeSort === 'hot' }" @click="mukeSort = 'hot'">
            <i class="fa-solid fa-fire"></i>热门
          </button>
          <button class="muke-sort-btn" :class="{ active: mukeSort === 'name' }" @click="mukeSort = 'name'">
            <i class="fa-solid fa-arrow-down-a-z"></i>名称
          </button>
        </div>
      </div>
      <div class="muke-grid">
        <div v-for="(c, idx) in filteredList" :key="c.seed" class="muke-card" @click="openAttach(c)">
          <div class="muke-thumb">
            <img :src="`https://picsum.photos/seed/${c.seed}/640/360.jpg`" :alt="c.title" loading="lazy">
            <div class="muke-thumb-overlay"></div>
            <div class="muke-cat-badge" :style="{ color: catColor[c.cat] || '#1A1A1A' }">{{ catLabel[c.cat] || c.cat }}</div>
            <div v-if="c.attachments.length" class="muke-attach-badge">
              <i class="fa-solid fa-paperclip"></i>{{ c.attachments.length }} 附件
            </div>
            <div class="muke-duration">{{ c.duration }}</div>
            <div class="muke-play"><i class="fa-solid fa-play"></i></div>
          </div>
          <div class="muke-card-body">
            <div class="muke-card-title">{{ c.title }}</div>
            <div class="muke-card-meta">
              <span><i class="fa-regular fa-eye"></i>{{ c.views.toLocaleString() }}</span>
              <span><i class="fa-regular fa-calendar"></i>{{ c.date }}</span>
            </div>
          </div>
          <div class="muke-card-footer">
            <div class="muke-instructor">
              <div class="muke-instructor-avatar">{{ c.author.charAt(0) }}</div>
              <span class="muke-instructor-name">{{ c.author }}</span>
            </div>
            <div v-if="c.progress > 0 && c.progress < 100" class="muke-progress">
              <div class="muke-progress-bar"><div class="muke-progress-fill" :style="{ width: c.progress + '%' }"></div></div>
              <span class="muke-progress-text">{{ c.progress }}%</span>
            </div>
            <div v-else-if="c.progress === 100" class="muke-progress">
              <span class="muke-progress-text" style="color:#2D8B55;font-weight:500">已完成</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="filteredList.length === 0" class="muke-empty">
        <div class="muke-empty-icon"><i class="fa-regular fa-circle-play"></i></div>
        <div class="muke-empty-title">未找到匹配课程</div>
        <div class="muke-empty-desc">请尝试调整筛选条件或关键词</div>
      </div>
    </section>

    <!-- 附件弹窗 -->
    <div v-if="attachModalOpen" class="attach-overlay open" @click.self="closeAttach">
      <div class="attach-modal">
        <div class="attach-header">
          <div class="attach-header-icon"><i class="fa-solid fa-paperclip"></i></div>
          <div class="attach-header-info">
            <div class="attach-header-title">{{ selectedCourse?.title }}</div>
            <div class="attach-header-sub">{{ selectedCourse?.author }} · {{ selectedCourse?.duration }} · {{ selectedCourse?.attachments.length }} 份附件</div>
          </div>
          <button class="attach-close" @click="closeAttach"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="attach-body">
          <div v-for="a in selectedCourse?.attachments" :key="a.name" class="attach-item">
            <div class="attach-item-icon" :class="aiCls(a.ext)"><i :class="aiFA(a.ext)"></i></div>
            <div class="attach-item-info">
              <div class="attach-item-name">{{ a.name }}</div>
              <div class="attach-item-meta">{{ a.size }}</div>
            </div>
            <button class="attach-dl-btn"><i class="fa-solid fa-download"></i>下载</button>
          </div>
        </div>
        <div class="attach-footer">
          <div class="attach-footer-info">共 {{ selectedCourse?.attachments.length }} 份附件</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.portal-muke-page {
  animation: fadeUp 0.7s ease both;
}

.muke-hero {
  padding: 56px 48px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.muke-hero h1 {
  font-size: 36px;
  font-weight: 900;
  letter-spacing: -0.5px;
  text-align: center;
  margin-bottom: 8px;
  color: #1A1A1A;
}

.muke-hero h1 span {
  font-family: 'Playfair Display', serif;
  font-weight: 700;
  font-style: italic;
  opacity: 0.12;
  font-size: 42px;
}

.muke-hero > p {
  font-size: 14px;
  color: #A0A0A0;
  text-align: center;
  margin-bottom: 28px;
}

.muke-search {
  width: 100%;
  max-width: 600px;
  margin-bottom: 20px;
  position: relative;
}

.muke-search input {
  width: 100%;
  height: 48px;
  border: 2px solid #ECECEC;
  border-radius: 16px;
  padding: 0 16px 0 44px;
  font-size: 14px;
  color: #1A1A1A;
  background: #FFFFFF;
  outline: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.muke-search input:hover { border-color: #D5D5D5; }
.muke-search input:focus { border-color: #1A1A1A; }

.muke-search i {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
  color: #A0A0A0;
}

.filter-panel {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 48px;
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  cursor: pointer;
  font-size: 13px;
  color: #6B6B6B;
}

.filter-toggle:hover { color: #1A1A1A; }

.filter-toggle i {
  font-size: 11px;
  width: 20px;
  height: 20px;
  border-radius: 6px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-toggle.open i {
  transform: rotate(180deg);
  background: #1A1A1A;
  color: #fff;
}

.filter-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 5px;
  background: #1A1A1A;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
}

.filter-body {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height 0.4s, opacity 0.3s;
}

.filter-body.open {
  max-height: 300px;
  opacity: 1;
}

.filter-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding-bottom: 20px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.filter-group-label {
  font-size: 11px;
  color: #A0A0A0;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.filter-select {
  width: 100%;
  height: 38px;
  border: 1px solid #ECECEC;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 13px;
  color: #1A1A1A;
  background: #FFFFFF;
  outline: none;
  cursor: pointer;
}

.filter-select:hover { border-color: #C0C0C0; }
.filter-select:focus { border-color: #1A1A1A; }

.filter-actions {
  padding-bottom: 20px;
}

.filter-btn-reset {
  height: 38px;
  padding: 0 18px;
  border-radius: 8px;
  border: 1px solid #ECECEC;
  background: #FFFFFF;
  font-size: 12px;
  color: #6B6B6B;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-btn-reset:hover { border-color: #1A1A1A; color: #1A1A1A; }

.muke-grid-area {
  max-width: 1200px;
  margin: 20px auto 0;
  padding: 0 48px 60px;
}

.muke-grid-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.muke-grid-title {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
}

.muke-grid-count {
  font-size: 12px;
  color: #A0A0A0;
  margin-left: 10px;
}

.muke-grid-sort {
  display: flex;
  gap: 2px;
}

.muke-sort-btn {
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

.muke-sort-btn:hover { color: #6B6B6B; background: #F5F5F5; }
.muke-sort-btn.active { color: #1A1A1A; border-color: #ECECEC; background: #F5F5F5; font-weight: 500; }

.muke-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
}

.muke-card {
  background: #FFFFFF;
  border: 1px solid #ECECEC;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  transition: 0.3s;
}

.muke-card:hover {
  border-color: #D0D0D0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  transform: translateY(-3px);
}

.muke-thumb {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
  overflow: hidden;
}

.muke-thumb img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.6s;
}

.muke-card:hover .muke-thumb img { transform: scale(1.05); }

.muke-thumb-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(0, 0, 0, 0.55));
}

.muke-play {
  position: absolute;
  bottom: 14px;
  right: 14px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1A1A1A;
  font-size: 14px;
  opacity: 0;
  transform: translateY(8px);
  transition: 0.3s;
}

.muke-card:hover .muke-play { opacity: 1; transform: translateY(0); }

.muke-duration {
  position: absolute;
  bottom: 14px;
  left: 14px;
  padding: 3px 8px;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
}

.muke-cat-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.92);
  font-size: 10px;
  font-weight: 600;
}

.muke-attach-badge {
  position: absolute;
  top: 14px;
  right: 14px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.92);
  color: #6B6B6B;
  font-size: 10px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
}

.muke-card-body { padding: 18px 20px; }

.muke-card-title {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.muke-card-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 11px;
  color: #A0A0A0;
}

.muke-card-meta i { font-size: 10px; margin-right: 3px; }

.muke-card-footer {
  padding: 0 20px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.muke-instructor { display: flex; align-items: center; gap: 8px; }

.muke-instructor-avatar {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  color: #6B6B6B;
  font-weight: 600;
}

.muke-instructor-name { font-size: 12px; color: #6B6B6B; }

.muke-progress { display: flex; align-items: center; gap: 8px; }

.muke-progress-bar {
  width: 48px;
  height: 3px;
  background: #ECECEC;
  border-radius: 2px;
  overflow: hidden;
}

.muke-progress-fill { height: 100%; background: #1A1A1A; border-radius: 2px; }

.muke-progress-text { font-size: 10px; color: #A0A0A0; }

.muke-empty {
  padding: 72px 24px;
  text-align: center;
}

.muke-empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 22px;
  color: #A0A0A0;
}

.muke-empty-title { font-size: 14px; font-weight: 600; color: #6B6B6B; margin-bottom: 4px; }
.muke-empty-desc { font-size: 13px; color: #A0A0A0; }

/* 附件弹窗 */
.attach-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(4px);
  z-index: 5000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
  padding: 24px;
}

.attach-overlay.open { opacity: 1; pointer-events: auto; }

.attach-modal {
  background: #FFFFFF;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  transform: scale(0.96) translateY(12px);
  transition: transform 0.35s;
}

.attach-overlay.open .attach-modal { transform: scale(1) translateY(0); }

.attach-header {
  padding: 22px 24px 16px;
  border-bottom: 1px solid #F3F3F3;
  display: flex;
  align-items: center;
  gap: 14px;
}

.attach-header-icon {
  width: 42px;
  height: 42px;
  border-radius: 11px;
  background: #1A1A1A;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #fff;
}

.attach-header-info { flex: 1; min-width: 0; }

.attach-header-title {
  font-size: 16px;
  font-weight: 700;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attach-header-sub { font-size: 12px; color: #A0A0A0; margin-top: 2px; }

.attach-close {
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
}

.attach-close:hover { border-color: #1A1A1A; color: #1A1A1A; background: #F5F5F5; }

.attach-body { flex: 1; overflow-y: auto; padding: 8px 0; }

.attach-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 24px;
}

.attach-item:hover { background: #F5F5F5; }

.attach-item-icon {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.ai-xlsx { background: #EFF7F2; color: #2D8B55; }
.ai-docx { background: #EEF3F9; color: #3B6FB5; }
.ai-pdf { background: #FCEEEC; color: #C44536; }
.ai-pptx { background: #FDF3E7; color: #D4841C; }
.ai-zip { background: #F0EDE8; color: #8B7355; }

.attach-item-info { flex: 1; min-width: 0; }

.attach-item-name {
  font-size: 13px;
  font-weight: 500;
  color: #1A1A1A;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.attach-item-meta { font-size: 11px; color: #A0A0A0; margin-top: 2px; }

.attach-dl-btn {
  height: 32px;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid #ECECEC;
  background: #FFFFFF;
  font-size: 11px;
  color: #6B6B6B;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.attach-dl-btn:hover { border-color: #1A1A1A; color: #1A1A1A; }

.attach-footer {
  padding: 12px 24px;
  border-top: 1px solid #F3F3F3;
}

.attach-footer-info { font-size: 11px; color: #A0A0A0; }

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 900px) {
  .muke-grid { grid-template-columns: repeat(2, 1fr); }
  .filter-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 768px) {
  .muke-hero { padding: 40px 20px 20px; }
  .muke-hero h1 { font-size: 26px; }
  .muke-grid-area { padding: 0 20px 60px; }
  .filter-panel { padding: 0 20px; }
  .muke-grid { grid-template-columns: 1fr; }
  .filter-grid { grid-template-columns: 1fr; }
  .attach-modal { max-width: calc(100vw - 32px); }
}
</style>