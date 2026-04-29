import type { KbSysConfigBo, KbSysConfigVo } from './model';

import { alovaInstance } from '#/utils/http';

enum Api {
  list = '/kb/config/list',
  root = '/kb/config',
}

/** 查询配置列表 */
export function configList() {
  return alovaInstance.get<KbSysConfigVo[]>(Api.list);
}

/** 查询配置详情 */
export function configDetail(configId: number) {
  return alovaInstance.get<KbSysConfigVo>(`${Api.root}/${configId}`);
}

/** 新增配置 */
export function configAdd(data: KbSysConfigBo) {
  return alovaInstance.postWithMsg<void>(Api.root, data);
}

/** 修改配置 */
export function configUpdate(data: KbSysConfigBo) {
  return alovaInstance.putWithMsg<void>(Api.root, data);
}

/** 删除配置 */
export function configRemove(configId: number) {
  return alovaInstance.deleteWithMsg<void>(`${Api.root}/${configId}`);
}
