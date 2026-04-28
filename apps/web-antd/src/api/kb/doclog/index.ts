import type { DocLogQuery } from './model';

import type { IDS, PageQuery, PageResult } from '#/api/common';

import { commonExport } from '#/api/helper';
import { alovaInstance } from '#/utils/http';
import type { DocLogVo } from './model';

enum Api {
  docLogList = '/kb/doclog/list',
  docLogExport = '/kb/doclog/export',
  docLogExportSelected = '/kb/doclog/exportSelected',
  root = '/kb/doclog',
}

/**
 * 文档日志分页查询
 * @param params 查询参数
 * @returns 分页结果
 */
export function docLogList(params?: PageQuery & DocLogQuery) {
  return alovaInstance.get<PageResult<DocLogVo>>(Api.docLogList, {
    params,
  });
}

/**
 * 删除文档日志
 * @param visitIds 日志ID列表
 */
export function docLogDelete(visitIds: IDS) {
  return alovaInstance.deleteWithMsg<void>(`${Api.root}/${visitIds}`);
}

/**
 * 导出文档日志（全部）
 * @param data 查询参数
 */
export function docLogExport(data: Partial<DocLogQuery>) {
  return commonExport(Api.docLogExport, data);
}

/**
 * 导出文档日志（选中）
 * @param data 包含 ids 的对象
 */
export function docLogExportSelected(data: { ids: string }) {
  return commonExport(Api.docLogExportSelected, data);
}