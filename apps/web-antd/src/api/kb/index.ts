import { alovaInstance } from '#/utils/http';

// ===== 系统部门接口 =====

/** 获取所有部门列表 */
export function getDeptList() {
  return alovaInstance.get<{
    deptId: number;
    deptName: string;
    orderNum: number;
    status: string;
  }[]>('/system/dept/list');
}

// ===== 统计接口 =====

/** 首页卡片统计 */
export function getDashboardStat() {
  return alovaInstance.get<{
    fileTotal: number;
    fileTotalGrowthRate: number;
    weeklyNewFiles: number;
    weeklyGrowthRate: number;
    activeDeptCount: number;
    todaySearchCount: number;
  }>('/kb/stat/dashboard');
}

/** 部门文件明细统计 */
export function getDeptStatList() {
  return alovaInstance.get<{
    deptId: number;
    deptName: string;
    fileCount: number;
    weeklyNewCount: number;
    latestFileName: string;
  }[]>('/kb/stat/dept');
}

// ===== 搜索接口 =====

export interface SearchRequest {
  keywords?: string;
  title?: string;
  content?: string;
  fileType?: string;
  category?: string[];
  businessTypes?: string[];
  topicCodes?: string[];
  folderIds?: number[];
  pageNum?: number;
  pageSize?: number;
  column?: string;
  order?: string;
}

export interface SearchResult {
  docId: number;
  docTitle: string;
  highlightTitle: string;
  contentSnippet: string;
  fileType: string;
  fileSize: number;
  folderId: number;
  folderPath: string;
  category: string;
  viewCount: number;
  downloadCount: number;
  createTime: string;
  releaseFlag: number;
}

/** 普通检索 */
export function searchDoc(data: SearchRequest) {
  return alovaInstance.post<{
    rows: SearchResult[];
    total: number;
  }>('/kb/search/searchDoc', data);
}

/** 获取热门关键词 */
export function getHotKeywords(limit = 10, days = 7) {
  return alovaInstance.get<string[]>('/kb/search/hotKeywords', {
    params: { limit, days },
  });
}

// ===== 文档接口 =====

export interface DocPreviewVo {
  docId: number;
  docName: string;
  docTitle: string;
  fileType: string;
  fileSize: number;
  previewUrl: string;
  originalUrl: string;
  previewType: string;
  canPreview: boolean;
  needConvert: boolean;
  previewMessage: string;
  content: string;
}

/** 预览文档 */
export function previewDoc(docId: number) {
  return alovaInstance.get<DocPreviewVo>(`/kb/doc/preview/${docId}`);
}

/** 获取部门下的文件列表 */
export interface DeptFile {
  docId: number;
  docTitle: string;
  fileType: string;
  fileSize: number;
  folderId: number;
  folderName: string;
  folderPath: string;
  createTime: string;
  downloadCount: number;
}

export function getDeptFiles(deptId: number) {
  return alovaInstance.get<DeptFile[]>(`/kb/doc/dept/${deptId}`);
}

/** 下载文档（携带鉴权头，当前页触发下载） */
export async function downloadDoc(docId: number, fileName?: string) {
  const { useAccessStore } = await import('@vben/stores');
  const { useAppConfig } = await import('@vben/hooks');
  const token = useAccessStore().accessToken;
  const { clientId } = useAppConfig(import.meta.env, import.meta.env.PROD);
  const res = await fetch(`/api/kb/doc/download/${docId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      ClientID: clientId,
    },
  });
  if (!res.ok) throw new Error(`下载失败: ${res.status}`);
  const blob = await res.blob();
  // 从响应头获取文件名
  const disposition = res.headers.get('content-disposition');
  let name = fileName || '文档';
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
