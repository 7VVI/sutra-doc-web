<script setup lang="ts">
import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message, Upload, Select } from 'antdv-next';

import { videoUpdate, videoDetail } from '#/api/media/video';
import { categoryList, directionList } from '#/api/media/direction';
import type { MediaVideoVo } from '#/api/media/video/model';

const emit = defineEmits<{ reload: [] }>();

const title = computed(() => '编辑视频');

// 分类和方向列表
const categoryOptions = ref<{ label: string; value: number }[]>([]);
const directionOptions = ref<{ label: string; value: number }[]>([]);
const loadingTags = ref(false);

// 视频信息
const videoTitle = ref('');
const videoDescription = ref('');
const selectedCategories = ref<number[]>([]);
const selectedDirections = ref<number[]>([]);

// 封面上传
const thumbnailFile = ref<File | null>(null);
const thumbnailPreview = ref<string>('');
const existingThumbnail = ref<string>('');

// 加载分类和方向列表
async function loadTagOptions() {
  loadingTags.value = true;
  try {
    const categories = await categoryList();
    const directions = await directionList();

    const categoryListData = (categories as any)?.data || categories || [];
    const directionListData = (directions as any)?.data || directions || [];

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
  thumbnailPreview.value = URL.createObjectURL(file);
  return false; // 阻止自动上传
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
    modalApi.modalLoading(true);

    // 加载分类和方向数据
    await loadTagOptions();

    // 从传入的数据获取记录
    const data = modalApi.getData() as { record?: MediaVideoVo };
    if (data?.record) {
      videoTitle.value = data.record.title || '';
      videoDescription.value = data.record.description || '';
      existingThumbnail.value = data.record.thumbnail || '';

      // 获取视频详情以获取标签信息
      try {
        const detail = await videoDetail(data.record.videoId);
        const detailData = (detail as any)?.data || detail;
        selectedCategories.value = detailData?.categoryIds || [];
        selectedDirections.value = detailData?.directionIds || [];
      } catch (e) {
        console.error('获取视频详情失败:', e);
        selectedCategories.value = [];
        selectedDirections.value = [];
      }
    }

    // 清理旧的预览URL
    if (thumbnailPreview.value) {
      URL.revokeObjectURL(thumbnailPreview.value);
    }
    thumbnailFile.value = null;
    thumbnailPreview.value = '';

    modalApi.modalLoading(false);
  },
});

async function handleConfirm() {
  // 验证
  if (!videoTitle.value.trim()) {
    message.error('请输入视频标题');
    return;
  }

  try {
    modalApi.lock(true);

    const data = modalApi.getData() as { record?: MediaVideoVo };
    const videoId = data?.record?.videoId;

    await videoUpdate(
      {
        videoId,
        title: videoTitle.value,
        description: videoDescription.value,
        categoryIds: selectedCategories.value,
        directionIds: selectedDirections.value,
      },
      thumbnailFile.value || undefined,
    );

    message.success('视频信息更新成功');
    emit('reload');
    modalApi.close();
  } catch (error: any) {
    console.error(error);
    message.error(error?.message || '更新失败');
  } finally {
    modalApi.lock(false);
  }
}

async function handleClosed() {
  if (thumbnailPreview.value) {
    URL.revokeObjectURL(thumbnailPreview.value);
  }
  videoTitle.value = '';
  videoDescription.value = '';
  selectedCategories.value = [];
  selectedDirections.value = [];
  thumbnailFile.value = null;
  thumbnailPreview.value = '';
  existingThumbnail.value = '';
}
</script>

<template>
  <BasicModal :title="title">
    <div class="edit-video-form">
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
            <div v-if="!thumbnailFile && !existingThumbnail" class="upload-box">
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
            <div v-else-if="thumbnailFile" class="upload-preview">
              <img :src="thumbnailPreview" alt="封面预览" />
              <div class="upload-preview-overlay">
                <a-button type="link" size="small" @click="handleRemoveThumbnail">移除</a-button>
              </div>
            </div>
            <div v-else class="upload-preview">
              <img :src="existingThumbnail" alt="现有封面" />
              <div class="upload-preview-overlay">
                <Upload
                  :before-upload="beforeThumbnailUpload"
                  :file-list="[]"
                  :show-upload-list="false"
                  accept="image/*"
                >
                  <a-button type="link" size="small">更换</a-button>
                </Upload>
              </div>
            </div>
          </div>
          <div class="upload-tip">请上传不超过 10MB 的 jpg, jpeg, png, gif, webp 格式文件</div>
        </div>
      </div>
    </div>
  </BasicModal>
</template>

<style scoped>
.edit-video-form {
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

/* 上传提示 */
.upload-tip {
  font-size: 12px;
  color: #A0A0A0;
  line-height: 1.5;
}
</style>