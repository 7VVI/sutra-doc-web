<script lang="ts" setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { previewDoc, downloadDoc } from '#/api/kb';
import type { DocPreviewVo } from '#/api/kb';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref('');
const previewData = ref<DocPreviewVo | null>(null);

onMounted(async () => {
  const docId = Number(route.query.docId);
  if (!docId) {
    error.value = '缺少文档参数';
    loading.value = false;
    return;
  }
  try {
    const res = await previewDoc(docId);
    previewData.value = (res as any)?.data || res;
  } catch (e) {
    error.value = '文档加载失败，可能不存在或无权访问';
  } finally {
    loading.value = false;
  }
});

function goHome() {
  router.push('/portal');
}

const downloading = ref(false);

async function handleDownload() {
  if (!previewData.value) return;
  downloading.value = true;
  try {
    await downloadDoc(previewData.value.docId, previewData.value.docTitle);
  } catch (e) {
    console.error('下载失败:', e);
  } finally {
    downloading.value = false;
  }
}
</script>

<template>
  <div class="share-page">
    <div class="share-container">
      <!-- 加载中 -->
      <div v-if="loading" class="share-loading">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>加载中...</span>
      </div>

      <!-- 错误 -->
      <div v-else-if="error" class="share-error">
        <i class="fa-regular fa-circle-xmark"></i>
        <p>{{ error }}</p>
        <button class="btn-action primary" @click="goHome">返回首页</button>
      </div>

      <!-- 正常显示 -->
      <template v-else-if="previewData">
        <div class="share-header">
          <div class="share-title">{{ previewData.docTitle || '文档分享' }}</div>
          <div class="share-actions">
            <button class="btn-action primary" @click="handleDownload" :disabled="downloading">
              <i v-if="downloading" class="fa-solid fa-spinner fa-spin"></i>
              <i v-else class="fa-solid fa-download"></i>
              下载
            </button>
            <button class="btn-action secondary" @click="goHome">
              <i class="fa-solid fa-house"></i>
              首页
            </button>
          </div>
        </div>
        <div class="share-body">
          <div v-if="!previewData.canPreview" class="share-unsupported">
            <i class="fa-regular fa-file" style="font-size:48px;color:#A0A0A0"></i>
            <p>{{ previewData.previewMessage || '该文件类型暂不支持在线预览' }}</p>
            <button class="btn-action primary" @click="handleDownload" :disabled="downloading">
              <i class="fa-solid fa-download"></i> 下载文件查看
            </button>
          </div>
          <iframe
            v-else-if="previewData.previewType === 'pdf' || previewData.previewType === 'image'"
            :src="previewData.previewUrl"
            class="share-iframe"
          ></iframe>
          <div v-else-if="previewData.previewType === 'text'" class="share-text">
            <pre>{{ previewData.content }}</pre>
          </div>
          <iframe
            v-else-if="previewData.previewType === 'office'"
            :src="previewData.previewUrl"
            class="share-iframe"
          ></iframe>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.share-page {
  min-height: 100vh;
  background: #FAFAFA;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 32px 24px;
}

.share-container {
  width: 100%;
  max-width: 960px;
  background: #FFFFFF;
  border: 1px solid #ECECEC;
  border-radius: 20px;
  overflow: hidden;
  animation: fadeUp 0.5s ease both;
}

.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #F3F3F3;
}

.share-title {
  font-size: 15px;
  font-weight: 600;
  color: #1A1A1A;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 16px;
}

.share-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.share-body {
  min-height: 400px;
}

.share-loading,
.share-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 120px 24px;
  color: #A0A0A0;
  font-size: 14px;
}

.share-error i {
  font-size: 48px;
  color: #C44536;
}

.share-error p {
  color: #6B6B6B;
}

.share-unsupported {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 24px;
  text-align: center;
}

.share-unsupported p {
  color: #6B6B6B;
  font-size: 14px;
}

.share-iframe {
  width: 100%;
  height: 80vh;
  border: none;
}

.share-text {
  padding: 24px;
}

.share-text pre {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #1A1A1A;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.btn-action {
  height: 32px;
  padding: 0 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: inherit;
}

.btn-action.primary {
  background: #1A1A1A;
  color: #fff;
  border: 1px solid #1A1A1A;
}

.btn-action.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.btn-action.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
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

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
