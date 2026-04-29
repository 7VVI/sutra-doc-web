/**
 * 视频信息视图对象
 */
export interface MediaVideoVo {
  /** 视频ID */
  videoId: number;
  /** 视频标题 */
  title: string;
  /** 视频描述 */
  description?: string;
  /** 作者ID */
  authorId: number;
  /** 作者名称 */
  authorName?: string;
  /** 缩略图URL */
  thumbnail?: string;
  /** 文件类型 */
  fileType?: string;
  /** 文件大小(字节) */
  fileSize?: number;
  /** 播放次数 */
  viewCount?: number;
  /** 点赞次数 */
  likeCount?: number;
  /** 授权类型: 0-公开, 1-指定用户/角色 */
  authType?: number;
  /** 授权部门名称(逗号分隔) */
  authDeptNames?: string;
  /** 当前用户是否已点赞 */
  hasLiked?: boolean;
  /** 附件数量 */
  attachmentCount?: number;
  /** 创建时间 */
  createTime?: string;
  /** 更新时间 */
  updateTime?: string;
}

/**
 * 视频详情视图对象
 */
export interface MediaVideoDetailVo {
  videoId: number;
  title: string;
  description?: string;
  authorId: number;
  authorName?: string;
  thumbnail?: string;
  fileType?: string;
  fileSize?: number;
  /** 视频时长(秒) */
  duration?: number;
  viewCount?: number;
  likeCount?: number;
  authType?: number;
  hasLiked?: boolean;
  isAuthor?: boolean;
  /** 分类标签ID列表 */
  categoryIds?: number[];
  /** 方向标签ID列表 */
  directionIds?: number[];
  createTime?: string;
  updateTime?: string;
}

/**
 * 视频上传参数对象
 */
export interface MediaVideoUploadBo {
  /** 视频标题 */
  title: string;
  /** 视频描述 */
  description?: string;
  /** 作者ID */
  authorId: number;
  /** 授权类型: 0-公开, 1-指定用户/角色 */
  authType?: number;
  /** 分类标签ID列表 */
  categoryIds?: number[];
  /** 方向标签ID列表 */
  directionIds?: number[];
}

/**
 * 视频分页查询对象
 */
export interface MediaVideoQuery {
  /** 搜索关键词 */
  keyword?: string;
  /** 作者ID列表 */
  authorIds?: number[];
  /** 分类标签ID列表 */
  categoryIds?: number[];
  /** 方向标签ID列表 */
  directionIds?: number[];
  /** 排序字段 */
  sort?: string;
  /** 页码 */
  pageNum?: number;
  /** 每页数量 */
  pageSize?: number;
}

/**
 * 视频编辑业务对象
 */
export interface MediaVideoBo {
  videoId?: number;
  title?: string;
  description?: string;
  /** 作者名称 */
  authorName?: string;
  authType?: number;
  /** 状态: 0-待审核, 1-已发布, 2-已下架 */
  status?: number;
  /** 缩略图URL */
  thumbnail?: string;
  /** 分类标签ID列表 */
  categoryIds?: number[];
  /** 方向标签ID列表 */
  directionIds?: number[];
}