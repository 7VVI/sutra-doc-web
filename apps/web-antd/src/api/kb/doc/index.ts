import type { KbDocBo, KbDocQuery, KbDocVo } from './model';

import { alovaInstance } from '#/utils/http';
import { ContentTypeEnum } from '#/utils/http/helper';

enum Api {
  list = '/kb/doc/list',
  root = '/kb/doc',
  upload = '/kb/doc/upload',
  export = '/kb/doc/export',
}

/** 分页查询文档列表 */
export function docList(query: KbDocQuery) {
  return alovaInstance.get<{ rows: KbDocVo[]; total: number }>(Api.list, {
    params: query,
  });
}

/** 查询文档详情 */
export function docDetail(docId: number) {
  return alovaInstance.get<KbDocVo>(`${Api.root}/${docId}`);
}

/** 上传文档 */
export function docUpload(
  file: File,
  dto: {
    folderId?: number;
    docTitle?: string;
    category?: string;
    keywords?: string;
    publicRemark?: number;
    remark?: string;
  } = {},
) {
  const formData = new FormData();
  formData.append('file', file);
  if (dto.folderId !== undefined) {
    formData.append('folderId', String(dto.folderId));
  }
  if (dto.docTitle) {
    formData.append('docTitle', dto.docTitle);
  }
  if (dto.category) {
    formData.append('category', dto.category);
  }
  if (dto.keywords) {
    formData.append('keywords', dto.keywords);
  }
  if (dto.publicRemark !== undefined) {
    formData.append('publicRemark', String(dto.publicRemark));
  }
  if (dto.remark) {
    formData.append('remark', dto.remark);
  }

  return alovaInstance.post<KbDocVo>(Api.upload, formData, {
    timeout: 120_000,
    headers: {
      'Content-Type': ContentTypeEnum.FORM_DATA,
    },
  });
}

/** 编辑文档 */
export function docUpdate(data: KbDocBo) {
  return alovaInstance.putWithMsg<void>(Api.root, data);
}

/** 删除文档 */
export function docRemove(docId: number) {
  return alovaInstance.deleteWithMsg<void>(`${Api.root}/${docId}`);
}

/** 发布文档 */
export function docPublish(docId: number) {
  return alovaInstance.post<void>(`${Api.root}/publish/${docId}`);
}

/** 撤回文档 */
export function docWithdraw(docId: number) {
  return alovaInstance.post<void>(`${Api.root}/withdraw/${docId}`);
}
