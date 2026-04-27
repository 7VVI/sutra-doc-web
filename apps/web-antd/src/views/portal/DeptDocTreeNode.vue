<script lang="ts">
import type { DeptDocTreeNode } from '#/api/kb';

export default { name: 'DeptDocTreeNode' };
</script>

<script lang="ts" setup>
const ebCls = (e: string) => ({xlsx:'eb-xlsx',docx:'eb-docx',pdf:'eb-pdf',pptx:'eb-pptx'})[e]||'eb-xlsx';
const fileIconFA = (e: string) => ({xlsx:'fa-solid fa-file-excel',docx:'fa-solid fa-file-word',pdf:'fa-solid fa-file-pdf',pptx:'fa-solid fa-file-powerpoint'})[e]||'fa-solid fa-file';
const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 KB';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
const formatDateStr = (d: string) => {
  if (!d) return '';
  return d.substring(0, 10);
};

defineProps<{
  node: DeptDocTreeNode;
  expanded: Set<number>;
  childrenMap: Map<number, DeptDocTreeNode[]>;
  downloading: number | null;
  depth?: number;
}>();

const emit = defineEmits<{
  toggle: [node: DeptDocTreeNode];
  download: [docId: number];
}>();
</script>

<template>
  <div class="doc-tree-node">
    <!-- 目录节点 -->
    <template v-if="node.type === 'folder'">
      <div class="doc-tree-folder-header" :style="{ paddingLeft: (16 + (depth || 0) * 20) + 'px' }" @click="emit('toggle', node)">
        <span class="doc-tree-arrow" :class="{ open: expanded.has(node.id) }">
          <i class="fa-solid fa-chevron-right"></i>
        </span>
        <i class="fa-regular fa-folder doc-tree-folder-icon" :class="{ 'fa-folder-open': expanded.has(node.id) }"></i>
        <span class="doc-tree-folder-name">{{ node.name }}</span>
      </div>
      <div class="doc-tree-children" :class="{ open: expanded.has(node.id) }">
        <template v-if="expanded.has(node.id) && childrenMap.get(node.id)?.length">
          <DeptDocTreeNode
            v-for="child in childrenMap.get(node.id)"
            :key="child.id"
            :node="child"
            :expanded="expanded"
            :children-map="childrenMap"
            :downloading="downloading"
            :depth="(depth || 0) + 1"
            @toggle="emit('toggle', $event)"
            @download="emit('download', $event)"
          />
        </template>
        <div v-else-if="expanded.has(node.id) && node.hasChildren" class="doc-tree-loading">
          <i class="fa-solid fa-spinner fa-spin"></i>
        </div>
      </div>
    </template>
    <!-- 文档节点 -->
    <div v-else class="doc-tree-file" :style="{ paddingLeft: (16 + (depth || 0) * 20) + 'px' }">
      <div class="doc-tree-file-icon" :class="ebCls(node.fileType || '')">
        <i :class="fileIconFA(node.fileType || '')"></i>
      </div>
      <div class="doc-tree-file-info">
        <div class="doc-tree-file-name">{{ node.name }}</div>
        <div class="doc-tree-file-meta">{{ formatFileSize(node.fileSize || 0) }} · {{ formatDateStr(node.createTime || '') }}</div>
      </div>
      <button class="doc-tree-file-dl" @click.stop="emit('download', node.id)" :disabled="downloading === node.id" title="下载">
        <i :class="downloading === node.id ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-download'"></i>
      </button>
    </div>
  </div>
</template>

<style scoped>
.doc-tree-node {}

.doc-tree-folder-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
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

.doc-tree-children {
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.doc-tree-children.open { max-height: 5000px; }

.doc-tree-file {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
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

.eb-xlsx { background: #EFF7F2; color: #2D8B55; }
.eb-docx { background: #EEF3F9; color: #3B6FB5; }
.eb-pdf { background: #FCEEEC; color: #C44536; }
.eb-pptx { background: #FDF3E7; color: #D4841C; }

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

.doc-tree-loading {
  padding: 12px 14px 12px 50px;
  color: #A0A0A0;
  font-size: 12px;
}
</style>
