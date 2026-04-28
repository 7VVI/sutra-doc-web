import { alovaInstance } from '#/utils/http';

// ===== 标签接口 =====

export interface MediaTagVo {
  tagId: number;
  tagName: string;
  tagType: number;
  parentId: number;
  sortOrder: number;
  status: number;
  createTime: string;
  children?: MediaTagVo[];
}

/** 查询标签列表 */
export function getMediaTagList(type?: number) {
  const url = type ? `/media/tag/list?type=${type}` : '/media/tag/list';
  return alovaInstance.get<MediaTagVo[]>(url);
}

/** 查询标签树 */
export function getMediaTagTree(type?: number) {
  const url = type ? `/media/tag/tree?type=${type}` : '/media/tag/tree';
  return alovaInstance.get<MediaTagVo[]>(url);
}

// ===== 视频接口 =====

export interface MediaVideoQuery {
  keyword?: string;
  authorIds?: number[];
  categoryIds?: number[];
  directionIds?: number[];
  sort?: string;
  pageNum?: number;
  pageSize?: number;
}

export interface MediaVideoVo {
  videoId: number;
  title: string;
  description: string;
  authorId: number;
  authorName: string;
  thumbnail: string;
  fileType: string;
  fileSize: number;
  viewCount: number;
  likeCount: number;
  authType: number;
  authDeptNames: string;
  hasLiked: boolean;
  attachmentCount: number;
  createTime: string;
  updateTime: string;
}

export interface MediaVideoDetailVo {
  videoId: number;
  title: string;
  description: string;
  authorId: number;
  authorName: string;
  thumbnail: string;
  fileType: string;
  fileSize: number;
  duration: number;
  viewCount: number;
  likeCount: number;
  authType: number;
  hasLiked: boolean;
  isAuthor: boolean;
  createTime: string;
  updateTime: string;
  likedUsers?: MediaWatcherVo[];
  attachments?: MediaVideoAttachmentVo[];
}

export interface MediaWatcherVo {
  userId: number;
  userName: string;
  avatar: string;
}

export interface MediaVideoAttachmentVo {
  attachmentId: number;
  videoId: number;
  fileName: string;
  fileSize: number;
  fileFormat: string;
  createTime: string;
}

/** 分页查询视频列表 */
export function getMediaVideoPage(query: MediaVideoQuery) {
  const params = new URLSearchParams();
  if (query.keyword) params.append('keyword', query.keyword);
  if (query.sort) params.append('sort', query.sort);
  if (query.pageNum) params.append('pageNum', String(query.pageNum));
  if (query.pageSize) params.append('pageSize', String(query.pageSize));
  if (query.authorIds?.length) query.authorIds.forEach(id => params.append('authorIds', String(id)));
  if (query.categoryIds?.length) query.categoryIds.forEach(id => params.append('categoryIds', String(id)));
  if (query.directionIds?.length) query.directionIds.forEach(id => params.append('directionIds', String(id)));
  return alovaInstance.get<{ rows: MediaVideoVo[]; total: number }>(`/media/video/page?${params.toString()}`);
}

/** 查询视频详情 */
export function getMediaVideoDetail(videoId: number) {
  return alovaInstance.get<MediaVideoDetailVo>(`/media/video/${videoId}`);
}

/** 查询附件列表 */
export function getMediaVideoAttachments(videoId: number) {
  return alovaInstance.get<MediaVideoAttachmentVo[]>(`/media/video/${videoId}/attachments`);
}

/** 下载附件 */
export async function downloadMediaAttachment(attachmentId: number, fileName?: string) {
  const { useAccessStore } = await import('@vben/stores');
  const { useAppConfig } = await import('@vben/hooks');
  const token = useAccessStore().accessToken;
  const { clientId } = useAppConfig(import.meta.env, import.meta.env.PROD);
  const res = await fetch(`/api/media/video/attachment/${attachmentId}/download`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ClientID: clientId,
    },
  });
  if (!res.ok) throw new Error(`下载失败: ${res.status}`);
  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition');
  let name = fileName || '附件';
  if (disposition) {
    const match = disposition.match(/filename\*?=(?:UTF-8''|"?)([^";]+)/i);
    if (match) name = decodeURIComponent(match[1].replace(/"/g, ''));
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 点赞视频 */
export function likeMediaVideo(videoId: number) {
  return alovaInstance.post<boolean>('/media/video/like', { videoId });
}

/** 取消点赞 */
export function unlikeMediaVideo(videoId: number) {
  return alovaInstance.post<boolean>('/media/video/unlike', { videoId });
}

/** 获取播放URL */
export function getMediaPlayUrl(videoId: number) {
  return `/api/media/video/play/${videoId}`;
}