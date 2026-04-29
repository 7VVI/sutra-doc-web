/**
 * KB文档视图对象
 */
export interface KbDocVo {
  /** 文档ID */
  docId: number;
  /** 所属目录ID */
  folderId: number;
  /** 关联文件ID */
  fileId: number;
  /** 预览文件ID */
  previewFileId: number;
  /** 文档名称 */
  docName: string;
  /** 文档标题 */
  docTitle: string;
  /** 文档编号 */
  serialNumber: string;
  /** 文件类型 */
  fileType: string;
  /** 文件大小(字节) */
  fileSize: number;
  /** 文档分类 */
  category: string;
  /** 关键词 */
  keywords: string;
  /** 状态: 0-待处理, 1-已发布, 2-已撤回, 3-已归档, 4-处理失败 */
  status: number;
  /** 全文检索标志 */
  ftiFlag: number;
  /** 转换标志: 0-未转换, 1-转换成功, 2-转换失败, 3-转换中 */
  convertFlag: number;
  /** 发布标志: 0-未发布, 1-已发布 */
  releaseFlag: number;
  /** 公开备注标志 */
  publicRemark: number;
  /** 当前版本号 */
  currentVersion: number;
  /** 下载次数 */
  downloadCount: number;
  /** 评论次数 */
  commentCount: number;
  /** 浏览次数 */
  viewCount: number;
  /** 收藏次数 */
  favouriteCount: number;
  /** 处理消息 */
  processMsg: string;
  /** 备注 */
  remark: string;
  /** 创建时间 */
  createTime: string;
}

/**
 * KB文档查询对象
 */
export interface KbDocQuery {
  docName?: string;
  docTitle?: string;
  category?: string;
  status?: number;
  releaseFlag?: number;
  fileType?: string;
  folderId?: number;
  pageNum?: number;
  pageSize?: number;
}

/**
 * KB文档编辑对象
 */
export interface KbDocBo {
  docId?: number;
  folderId?: number;
  docName?: string;
  docTitle?: string;
  category?: string;
  keywords?: string;
  publicRemark?: number;
  remark?: string;
}
