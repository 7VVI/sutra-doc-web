import type { MediaVideoBo, MediaVideoDetailVo, MediaVideoQuery, MediaVideoVo } from './model';

import { alovaInstance } from '#/utils/http';
import { ContentTypeEnum } from '#/utils/http/helper';

enum Api {
  page = '/media/video/page',
  root = '/media/video',
  upload = '/media/video/upload',
  play = '/media/video/play',
}

/**
 * 分页查询视频列表
 * @param query 查询参数
 */
export function videoPage(query: MediaVideoQuery) {
  return alovaInstance.get<{ rows: MediaVideoVo[]; total: number }>(Api.page, {
    params: query,
  });
}

/**
 * 查询视频详情
 * @param videoId 视频ID
 */
export function videoDetail(videoId: number) {
  return alovaInstance.get<MediaVideoDetailVo>(`${Api.root}/${videoId}`);
}

/**
 * 上传视频
 * @param file 视频文件
 * @param thumbnail 缩略图文件
 * @param bo 上传参数
 */
export function videoUpload(
  file: File,
  thumbnail?: File,
  bo: {
    title: string;
    description?: string;
    authorId: number;
    authType?: number;
    categoryIds?: number[];
    directionIds?: number[];
  } = { title: '', authorId: 0 },
) {
  const formData = new FormData();
  formData.append('file', file);
  if (thumbnail) {
    formData.append('thumbnail', thumbnail);
  }
  formData.append('title', bo.title);
  if (bo.description) {
    formData.append('description', bo.description);
  }
  formData.append('authorId', String(bo.authorId));
  if (bo.authType !== undefined) {
    formData.append('authType', String(bo.authType));
  }
  // 添加分类和方向标签
  if (bo.categoryIds && bo.categoryIds.length > 0) {
    bo.categoryIds.forEach((id) => {
      formData.append('categoryIds', String(id));
    });
  }
  if (bo.directionIds && bo.directionIds.length > 0) {
    bo.directionIds.forEach((id) => {
      formData.append('directionIds', String(id));
    });
  }

  return alovaInstance.post<number>(Api.upload, formData, {
    timeout: 120_000, // 视频上传需要更长超时时间
    headers: {
      'Content-Type': ContentTypeEnum.FORM_DATA,
    },
  });
}

/**
 * 编辑视频信息
 * @param data 视频信息
 * @param thumbnail 缩略图文件(可选)
 */
export function videoUpdate(
  data: MediaVideoBo,
  thumbnail?: File,
) {
  if (thumbnail) {
    const formData = new FormData();
    formData.append('title', data.title || '');
    if (data.description) {
      formData.append('description', data.description);
    }
    if (data.authType !== undefined) {
      formData.append('authType', String(data.authType));
    }
    if (data.categoryIds && data.categoryIds.length > 0) {
      data.categoryIds.forEach((id) => {
        formData.append('categoryIds', String(id));
      });
    }
    if (data.directionIds && data.directionIds.length > 0) {
      data.directionIds.forEach((id) => {
        formData.append('directionIds', String(id));
      });
    }
    formData.append('thumbnail', thumbnail);
    return alovaInstance.putWithMsg<void>(`${Api.root}/${data.videoId}`, formData, {
      headers: {
        'Content-Type': ContentTypeEnum.FORM_DATA,
      },
    });
  }
  return alovaInstance.putWithMsg<void>(`${Api.root}/${data.videoId}`, data);
}

/**
 * 删除视频
 * @param videoId 视频ID
 */
export function videoRemove(videoId: number) {
  return alovaInstance.deleteWithMsg<void>(`${Api.root}/${videoId}`);
}

/**
 * 获取视频播放地址
 * @param videoId 视频ID
 */
export function videoPlayUrl(videoId: number) {
  return `${Api.play}/${videoId}`;
}