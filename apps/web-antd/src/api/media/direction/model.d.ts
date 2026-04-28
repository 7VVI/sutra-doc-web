/** 标签视图对象 */
export interface MediaTagVo {
  /** 标签ID */
  tagId: number;
  /** 标签名称 */
  tagName: string;
  /** 标签类型(1-分类, 2-方向) */
  tagType: number;
  /** 父级标签ID */
  parentId: number;
  /** 排序号 */
  sortOrder: number;
  /** 状态: 0-正常, 1-禁用 */
  status: number;
  /** 创建时间 */
  createTime: string;
  /** 子标签列表 */
  children?: MediaTagVo[];
}

/** 标签业务对象 */
export interface MediaTagBo {
  /** 标签ID */
  tagId?: number;
  /** 标签名称 */
  tagName: string;
  /** 标签类型 */
  tagType: number;
  /** 父级标签ID */
  parentId?: number;
  /** 排序号 */
  sortOrder?: number;
  /** 状态: 0-正常, 1-禁用 */
  status?: number;
}