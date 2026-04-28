/** 文档日志类型定义 */
export interface DocLogVo {
  /** 日志ID */
  visitId: number;
  /** 序号 */
  rowNum: number;
  /** 操作类型: 1-上传, 2-预览, 3-下载, 4-删除, 5-编辑, 6-分享 */
  visitType: number;
  /** 操作类型名称 */
  visitTypeText: string;
  /** 操作人ID */
  userId: number;
  /** 操作人名称 */
  userName: string;
  /** 关键字 */
  keywords: string;
  /** IP地址 */
  sourceIp: string;
  /** 创建日期 */
  createTime: string;
}

/** 文档日志查询参数 */
export interface DocLogQuery {
  pageNum?: number;
  pageSize?: number;
  /** 创建时间起始 */
  createTimeStart?: string;
  /** 创建时间截止 */
  createTimeEnd?: string;
  /** 操作类型 */
  visitType?: number;
  /** 操作人名称 */
  userName?: string;
}