import type { KbFolderBo, KbFolderQuery, KbFolderVo } from './model';

import { alovaInstance } from '#/utils/http';

enum Api {
  list = '/kb/folder/list',
  tree = '/kb/folder/tree',
  lazyTree = '/kb/folder/lazyTree',
  root = '/kb/folder',
}

/** 分页查询目录列表 */
export function folderList(query: KbFolderQuery) {
  return alovaInstance.get<{ rows: KbFolderVo[]; total: number }>(Api.list, {
    params: query,
  });
}

/** 查询目录树（全量） */
export function folderTree(query?: KbFolderQuery) {
  return alovaInstance.get<KbFolderVo[]>(Api.tree, {
    params: query || {},
  });
}

/** 懒加载目录树（按层级加载） */
export function folderLazyTree(parentId: number) {
  return alovaInstance.get<KbFolderVo[]>(Api.lazyTree, {
    params: { parentId },
  });
}

/** 查询目录详情 */
export function folderDetail(folderId: number) {
  return alovaInstance.get<KbFolderVo>(`${Api.root}/${folderId}`);
}

/** 新增目录 */
export function folderAdd(data: KbFolderBo) {
  return alovaInstance.postWithMsg<void>(Api.root, data);
}

/** 修改目录 */
export function folderUpdate(data: KbFolderBo) {
  return alovaInstance.putWithMsg<void>(Api.root, data);
}

/** 删除目录 */
export function folderRemove(folderId: number) {
  return alovaInstance.deleteWithMsg<void>(`${Api.root}/${folderId}`);
}
