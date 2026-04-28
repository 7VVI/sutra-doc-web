<script setup lang="ts">
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';
import { useAccessStore } from '@vben/stores';

import { message, Upload, Select } from 'antdv-next';

import { videoUpload } from '#/api/media/video';
import { categoryList, directionList } from '#/api/media/direction';
import type { MediaTagVo } from '#/api/media/direction/model';

const emit = defineEmits<{ reload: [] }>();

const accessStore = useAccessStore();
const title = computed(() => '新增视频');

// 分类和方向列表
const categoryOptions = ref<{ label: string; value: number }[]>([]);
const directionOptions = ref<{ label: string; value: number }[]>([]);
const loadingTags = ref(false);

// 上传状态
const videoFile = ref<File | null>(null);
const thumbnailFile = ref<File | null>(null);
const thumbnailPreview = ref<string>('');
const uploading = ref(false);

// 视频信息
const videoTitle = ref('');
const videoDescription = ref('');
const selectedCategories = ref<number[]>([]);
const selectedDirections = ref<number[]>([]);

// 加载分类和方向列表
async function loadTagOptions() {
  loadingTags.value = true;
  try {
    const categories = await categoryList();
    const directions = await directionList();

    // 处理数据 - 后端返回的是 { code, msg, data } 结构
    const categoryListData = (categories as any)?.data || categories || [];
    const directionListData = (directions as any)?.data || directions || [];

    // status: 0-正常/启用, 1-禁用
    // 注意：如果后端返回的 status=1 表示启用，需要调整过滤条件
    categoryOptions.value = (categoryListData || [])
      .map((item: any) => ({
        label: item.tagName,
        value: item.tagId
      }));

    directionOptions.value = (directionListData || [])
      .map((item: any) => ({
        label: item.tagName,
        value: item.tagId
      }));
  } catch (e) {
    console.error('加载标签失败:', e);
  } finally {
    loadingTags.value = false;
  }
}

// 视频上传前的验证
function beforeVideoUpload(file: File) {
  // 检查文件类型
  const isVideo = file.type.startsWith('video/');
  if (!isVideo) {
    message.error('只能上传视频文件！');
    return false;
  }
  // 检查文件大小 (最大500MB)
  const isLt500M = file.size / 1024 / 1024 < 500;
  if (!isLt500M) {
    message.error('视频文件大小不能超过500MB！');
    return false;
  }
  videoFile.value = file;
  return false; // 阻止自动上传
}

// 缩略图上传前的验证
function beforeThumbnailUpload(file: File) {
  const isImage = file.type.startsWith('image/');
  if (!isImage) {
    message.error('只能上传图片文件！');
    return false;
  }
  const isLt10M = file.size / 1024 / 1024 < 10;
  if (!isLt10M) {
    message.error('缩略图大小不能超过10MB！');
    return false;
  }
  thumbnailFile.value = file;
  // 生成预览URL
  thumbnailPreview.value = URL.createObjectURL(file);
  return false; // 阻止自动上传
}

// 清除视频
function handleRemoveVideo() {
  videoFile.value = null;
}

// 清除缩略图
function handleRemoveThumbnail() {
  if (thumbnailPreview.value) {
    URL.revokeObjectURL(thumbnailPreview.value);
  }
  thumbnailFile.value = null;
  thumbnailPreview.value = '';
}

const [BasicModal, modalApi] = useVbenModal({
  fullscreenButton: false,
  onClosed: handleClosed,
  onConfirm: handleConfirm,
  onOpenChange: async (isOpen) => {
    if (!isOpen) {
      return null;
    }
    // 加载分类和方向数据
    await loadTagOptions();
    // 清理旧的预览URL
    if (thumbnailPreview.value) {
      URL.revokeObjectURL(thumbnailPreview.value);
    }
    // 重置状态
    videoFile.value = null;
    thumbnailFile.value = null;
    thumbnailPreview.value = '';
    videoTitle.value = '';
    videoDescription.value = '';
    selectedCategories.value = [];
    selectedDirections.value = [];
  },
});

async function handleConfirm() {
  // 验证
  if (!videoFile.value) {
    message.error('请选择视频文件');
    return;
  }
  if (!videoTitle.value.trim()) {
    message.error('请输入视频标题');
    return;
  }

  try {
    uploading.value = true;
    modalApi.lock(true);

    // 获取当前用户ID作为作者ID
    const userId = accessStore.userInfo?.userId || 1;

    await videoUpload(videoFile.value, thumbnailFile.value, {
      title: videoTitle.value,
      description: videoDescription.value,
      authorId: userId,
      authType: 0,
      categoryIds: selectedCategories.value,
      directionIds: selectedDirections.value,
    });

    message.success('视频上传成功');
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
  if (thumbnailPreview.value) {
    URL.revokeObjectURL(thumbnailPreview.value);
  }
  videoFile.value = null;
  thumbnailFile.value = null;
  thumbnailPreview.value = '';
  videoTitle.value = '';
  videoDescription.value = '';
  selectedCategories.value = [];
  selectedDirections.value = [];
}
</script>

<template>
  <BasicModal :title="title" :confirm-loading="uploading">
    <div class="upload-video-form">
      <!-- 视频标题 -->
      <div class="form-item">
        <label class="form-label">视频标题<span class="required">*</span></label>
        <input
          type="text"
          class="form-input"
          v-model="videoTitle"
          placeholder="请输入视频标题"
        />
      </div>

      <!-- 视频描述 -->
      <div class="form-item">
        <label class="form-label">视频描述</label>
        <textarea
          class="form-textarea"
          v-model="videoDescription"
          placeholder="请输入视频描述"
          rows="3"
        ></textarea>
      </div>

      <!-- 分类选择 -->
      <div class="form-item">
        <label class="form-label">分类标签</label>
        <Select
          v-model:value="selectedCategories"
          mode="multiple"
          placeholder="请选择分类标签"
          :options="categoryOptions"
          :loading="loadingTags"
          style="width: 100%"
          allow-clear
        />
      </div>

      <!-- 方向选择 -->
      <div class="form-item">
        <label class="form-label">方向标签</label>
        <Select
          v-model:value="selectedDirections"
          mode="multiple"
          placeholder="请选择方向标签"
          :options="directionOptions"
          :loading="loadingTags"
          style="width: 100%"
          allow-clear
        />
      </div>

      <!-- 封面上传 -->
      <div class="form-item upload-item">
        <label class="form-label">视频封面</label>
        <div class="upload-right">
          <div class="upload-area">
            <div v-if="!thumbnailFile" class="upload-box">
              <Upload
                :before-upload="beforeThumbnailUpload"
                :file-list="[]"
                :show-upload-list="false"
                accept="image/*"
              >
                <div class="upload-placeholder">
                  <i class="fa-solid fa-plus upload-icon"></i>
                  <span>上传</span>
                </div>
              </Upload>
            </div>
            <div v-else class="upload-preview">
              <img :src="thumbnailPreview" alt="封面预览" />
              <div class="upload-preview-overlay">
                <a-button type="link" size="small" @click="handleRemoveThumbnail">移除</a-button>
              </div>
            </div>
          </div>
          <div class="upload-tip">请上传不超过 10MB 的 jpg, jpeg, png, gif, webp 格式文件</div>
        </div>
      </div>

      <!-- 视频上传 -->
      <div class="form-item upload-item">
        <label class="form-label">视频文件<span class="required">*</span></label>
        <div class="upload-right">
          <div class="upload-area">
            <div v-if="!videoFile" class="upload-btn-wrapper">
              <Upload
                :before-upload="beforeVideoUpload"
                :file-list="[]"
                :show-upload-list="false"
                accept="video/*"
              >
                <a-button class="upload-btn">
                  <i class="fa-solid fa-upload"></i> 上传
                </a-button>
              </Upload>
            </div>
            <div v-else class="upload-file-info">
              <i class="fa-solid fa-file-video file-icon"></i>
              <div class="file-detail">
                <span class="file-name">{{ videoFile.name }}</span>
                <span class="file-size">{{ (videoFile.size / 1024 / 1024).toFixed(2) }}MB</span>
              </div>
              <a-button type="link" size="small" @click="handleRemoveVideo">移除</a-button>
            </div>
          </div>
          <div class="upload-tip">请上传不超过 500MB 的 mp4 格式文件</div>
        </div>
      </div>
    </div>
  </BasicModal>
</template>

<style scoped>
.upload-video-form {
  padding: 16px 0;
}

.form-item {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #1A1A1A;
}

.form-label .required {
  color: #FF4D4F;
  margin-left: 2px;
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

.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ECECEC;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  resize: vertical;
  transition: border-color 0.3s;
}

.form-textarea:focus {
  border-color: #1A1A1A;
}

/* 上传区域样式 */
.upload-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.upload-item .form-label {
  margin-top: 8px;
  white-space: nowrap;
  min-width: 70px;
}

.upload-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-area {
  display: flex;
  align-items: center;
}

/* 封面上传方块 */
.upload-box {
  width: 100px;
  height: 100px;
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
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #6B6B6B;
  font-size: 13px;
}

.upload-icon {
  font-size: 20px;
  color: #A0A0A0;
}

/* 封面预览 */
.upload-preview {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.upload-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-preview-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.upload-preview:hover .upload-preview-overlay {
  opacity: 1;
}

/* 视频上传按钮 */
.upload-btn-wrapper {
  display: flex;
  align-items: center;
}

.upload-btn {
  background: #FFFFFF;
  border: 1px solid #D9D9D9;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 14px;
  color: #1A1A1A;
  cursor: pointer;
  transition: border-color 0.3s;
}

.upload-btn:hover {
  border-color: #1A1A1A;
  color: #1A1A1A;
}

/* 视频文件信息 */
.upload-file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  font-size: 24px;
  color: #667eea;
}

.file-detail {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.file-name {
  font-size: 14px;
  color: #1A1A1A;
}

.file-size {
  font-size: 12px;
  color: #A0A0A0;
}

/* 上传提示 */
.upload-tip {
  font-size: 12px;
  color: #A0A0A0;
  line-height: 1.5;
}
</style>