/**
 * KB目录视图对象
 */
export interface KbFolderVo {
  /** 目录ID */
  folderId: number;
  /** 目录名称 */
  folderName: string;
  /** 父目录ID(0表示根目录) */
  parentId: number;
  /** 目录层级 */
  folderLevel: number;
  /** 目录完整路径 */
  folderPath: string;
  /** 目录编码 */
  folderCode: string;
  /** 排序号 */
  sortOrder: number;
  /** 目录描述 */
  description: string;
  /** 目录图标 */
  icon: string;
  /** 文档数量 */
  docCount: number;
  /** 状态: 1-启用, 0-禁用 */
  status: number;
  /** 创建时间 */
  createTime: string;
  /** 子目录列表 */
  children?: KbFolderVo[];
  /** 是否有子节点（懒加载用） */
  hasChildren?: boolean;
}

/**
 * KB目录查询对象
 */
export interface KbFolderQuery {
  folderName?: string;
  status?: number;
  pageNum?: number;
  pageSize?: number;
}

/**
 * KB目录编辑对象
 */
export interface KbFolderBo {
  folderId?: number;
  folderName?: string;
  parentId?: number;
  folderCode?: string;
  sortOrder?: number;
  description?: string;
  icon?: string;
  status?: number;
}
