import type { MediaTagBo, MediaTagVo } from './model';

import { alovaInstance } from '#/utils/http';

enum Api {
  list = '/media/tag/list',
  root = '/media/tag',
}

/** 标签类型常量 */
export const TagType = {
  /** 分类 */
  CATEGORY: 1,
  /** 方向 */
  DIRECTION: 2,
};

/**
 * 查询方向标签列表
 * @returns 方向列表
 */
export function directionList() {
  return alovaInstance.get<MediaTagVo[]>(Api.list, {
    params: { type: TagType.DIRECTION },
  });
}

/**
 * 查询分类标签列表
 * @returns 分类列表
 */
export function categoryList() {
  return alovaInstance.get<MediaTagVo[]>(Api.list, {
    params: { type: TagType.CATEGORY },
  });
}

/**
 * 新增方向标签
 * @param data 标签数据
 */
export function directionAdd(data: Partial<MediaTagBo>) {
  return alovaInstance.postWithMsg<void>(Api.root, {
    ...data,
    tagType: TagType.DIRECTION,
  });
}

/**
 * 新增分类标签
 * @param data 标签数据
 */
export function categoryAdd(data: Partial<MediaTagBo>) {
  return alovaInstance.postWithMsg<void>(Api.root, {
    ...data,
    tagType: TagType.CATEGORY,
  });
}

/**
 * 修改方向标签
 * @param data 标签数据
 */
export function directionUpdate(data: Partial<MediaTagBo>) {
  return alovaInstance.putWithMsg<void>(`${Api.root}/${data.tagId}`, {
    ...data,
    tagType: TagType.DIRECTION,
  });
}

/**
 * 修改分类标签
 * @param data 标签数据
 */
export function categoryUpdate(data: Partial<MediaTagBo>) {
  return alovaInstance.putWithMsg<void>(`${Api.root}/${data.tagId}`, {
    ...data,
    tagType: TagType.CATEGORY,
  });
}

/**
 * 删除方向标签
 * @param tagId 标签ID
 */
export function directionRemove(tagId: number) {
  return alovaInstance.deleteWithMsg<void>(`${Api.root}/${tagId}`);
}

/**
 * 删除分类标签（与方向删除共用同一个接口）
 * @param tagId 标签ID
 */
export function categoryRemove(tagId: number) {
  return alovaInstance.deleteWithMsg<void>(`${Api.root}/${tagId}`);
}