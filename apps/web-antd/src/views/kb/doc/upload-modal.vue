<script setup lang="ts">
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { message, Upload } from 'antdv-next';

import { docUpload } from '#/api/kb/doc';

const emit = defineEmits<{ reload: [] }>();

const title = computed(() => '上传文档');

const docTitle = ref('');
const category = ref('');
const keywords = ref('');
const remark = ref('');
const docFile = ref<File | null>(null);
const uploading = ref(false);

function beforeUpload(file: File) {
  docFile.value = file;
  if (!docTitle.value) {
    docTitle.value = file.name.replace(/\.[^.]+$/, '');
  }
  return false;
}

function handleRemoveFile() {
  docFile.value = null;
}

const [BasicModal, modalApi] = useVbenModal({
  fullscreenButton: false,
  onClosed: handleClosed,
  onConfirm: handleConfirm,
  onOpenChange: async (isOpen) => {
    if (!isOpen) return null;
    docFile.value = null;
    docTitle.value = '';
    category.value = '';
    keywords.value = '';
    remark.value = '';
  },
});

async function handleConfirm() {
  if (!docFile.value) {
    message.error('请选择文件');
    return;
  }
  if (!docTitle.value.trim()) {
    message.error('请输入文档标题');
    return;
  }
  try {
    uploading.value = true;
    modalApi.lock(true);
    await docUpload(docFile.value, {
      docTitle: docTitle.value,
      category: category.value || undefined,
      keywords: keywords.value || undefined,
      remark: remark.value || undefined,
    });
    message.success('文档上传成功');
    emit('reload');
    modalApi.close();
  } catch (error: any) {
    console.error(error);
    message.error(error?.message || '上传失败');
  } finally {
    uploading.value = false;
    modalApi.lock(false);
  }
}

async function handleClosed() {
  docFile.value = null;
  docTitle.value = '';
  category.value = '';
  keywords.value = '';
  remark.value = '';
}
</script>

<template>
  <BasicModal :title="title" :confirm-loading="uploading">
    <div class="doc-upload-form">
      <div class="form-item">
        <label class="form-label">选择文件<span class="required">*</span></label>
        <div class="form-input-wrap">
          <div v-if="!docFile" class="upload-box">
            <Upload
              :before-upload="beforeUpload"
              :file-list="[]"
              :show-upload-list="false"
            >
              <div class="upload-placeholder">
                <i class="fa-solid fa-plus upload-icon"></i>
                <span>选择文件</span>
              </div>
            </Upload>
          </div>
          <div v-else class="upload-file-info">
            <i class="fa-solid fa-file file-icon"></i>
            <span class="file-name">{{ docFile.name }}</span>
            <span class="file-size">{{ (docFile.size / 1024 / 1024).toFixed(2) }}MB</span>
            <a-button type="link" size="small" @click="handleRemoveFile">移除</a-button>
          </div>
        </div>
      </div>
      <div class="form-item">
        <label class="form-label">文档标题<span class="required">*</span></label>
        <div class="form-input-wrap">
          <input type="text" class="form-input" v-model="docTitle" placeholder="请输入文档标题" />
        </div>
      </div>
      <div class="form-item">
        <label class="form-label">文档分类</label>
        <div class="form-input-wrap">
          <input type="text" class="form-input" v-model="category" placeholder="请输入文档分类" />
        </div>
      </div>
      <div class="form-item">
        <label class="form-label">关键词</label>
        <div class="form-input-wrap">
          <input type="text" class="form-input" v-model="keywords" placeholder="多个关键词用逗号分隔" />
        </div>
      </div>
      <div class="form-item">
        <label class="form-label">备注</label>
        <div class="form-input-wrap">
          <input type="text" class="form-input" v-model="remark" placeholder="请输入备注" />
        </div>
      </div>
    </div>
  </BasicModal>
</template>

<style scoped>
.doc-upload-form {
  padding: 16px 0;
}

.form-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 18px;
}

.form-label {
  flex-shrink: 0;
  width: 80px;
  text-align: right;
  padding-right: 12px;
  line-height: 40px;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.form-label .required {
  color: #FF4D4F;
  margin-left: 2px;
}

.form-input-wrap {
  flex: 1;
  min-width: 0;
}

.form-input {
  width: 100%;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #ECECEC;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.3s;
}

.form-input:focus {
  border-color: #1A1A1A;
}

.upload-box {
  width: 100%;
  height: 40px;
  border: 1px dashed #D9D9D9;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

.upload-box:hover {
  border-color: #1A1A1A;
}

.upload-placeholder {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #6B6B6B;
  font-size: 13px;
}

.upload-icon {
  font-size: 14px;
  color: #A0A0A0;
}

.upload-file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 40px;
  border: 1px solid #ECECEC;
  border-radius: 8px;
}

.file-icon {
  font-size: 18px;
  color: #667eea;
}

.file-name {
  font-size: 13px;
  color: #1A1A1A;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  font-size: 12px;
  color: #A0A0A0;
}
</style>
