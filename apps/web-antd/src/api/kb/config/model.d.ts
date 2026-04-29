/**
 * KB系统配置视图对象
 */
export interface KbSysConfigVo {
  /** 配置ID */
  configId: number;
  /** 配置项编码 */
  itemCode: string;
  /** 配置项名称 */
  itemName: string;
  /** 配置项值 */
  itemValue: string;
  /** 值类型: string/number/boolean/json/array */
  valueType: string;
  /** 可选值列表(JSON格式) */
  valueOptions: string;
  /** 配置分组 */
  itemGroup: string;
  /** 排序号 */
  sortOrder: number;
  /** 备注说明 */
  remark: string;
  /** 状态: 1-启用, 0-禁用 */
  status: number;
  /** 创建时间 */
  createTime: string;
}

/**
 * KB系统配置编辑对象
 */
export interface KbSysConfigBo {
  configId?: number;
  itemCode?: string;
  itemName?: string;
  itemValue?: string;
  valueType?: string;
  valueOptions?: string;
  itemGroup?: string;
  sortOrder?: number;
  remark?: string;
  status?: number;
}
