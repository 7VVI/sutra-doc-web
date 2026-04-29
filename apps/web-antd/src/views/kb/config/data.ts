import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

/** 状态选项 */
const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

/** 值类型选项 */
const valueTypeOptions = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔', value: 'boolean' },
  { label: 'JSON', value: 'json' },
  { label: '数组', value: 'array' },
];

/** 搜索表单配置 */
export const querySchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    fieldName: 'itemName',
    label: '配置名称',
    componentProps: {
      placeholder: '请输入配置名称',
    },
  },
  {
    component: 'Input',
    fieldName: 'itemCode',
    label: '配置编码',
    componentProps: {
      placeholder: '请输入配置编码',
    },
  },
  {
    component: 'Select',
    fieldName: 'status',
    label: '状态',
    componentProps: {
      options: statusOptions,
      placeholder: '请选择状态',
      allowClear: true,
    },
  },
];

/** 表格列配置 */
export const columns: VxeGridProps['columns'] = [
  { type: 'seq', title: '序号', width: 60 },
  {
    title: '配置项名称',
    field: 'itemName',
    minWidth: 150,
  },
  {
    title: '配置项编码',
    field: 'itemCode',
    width: 150,
  },
  {
    title: '配置项值',
    field: 'itemValue',
    minWidth: 150,
  },
  {
    title: '值类型',
    field: 'valueType',
    width: 90,
  },
  {
    title: '分组',
    field: 'itemGroup',
    width: 100,
  },
  {
    title: '排序',
    field: 'sortOrder',
    width: 70,
    sortable: true,
  },
  {
    title: '状态',
    field: 'status',
    width: 80,
    slots: {
      default: ({ row }) => {
        return row.status === 1 ? '启用' : '禁用';
      },
    },
  },
  {
    title: '创建时间',
    field: 'createTime',
    width: 160,
    sortable: true,
  },
  {
    field: 'action',
    fixed: 'right',
    slots: { default: 'action' },
    title: '操作',
    resizable: false,
    width: 'auto',
  },
];

/** 弹窗表单配置 */
export const modalSchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    dependencies: {
      show: () => false,
      triggerFields: [''],
    },
    fieldName: 'configId',
    label: 'configId',
  },
  {
    component: 'Input',
    fieldName: 'itemCode',
    label: '配置编码',
    rules: 'required',
    componentProps: {
      placeholder: '请输入配置项编码',
    },
  },
  {
    component: 'Input',
    fieldName: 'itemName',
    label: '配置名称',
    rules: 'required',
    componentProps: {
      placeholder: '请输入配置项名称',
    },
  },
  {
    component: 'Input',
    fieldName: 'itemValue',
    label: '配置值',
    componentProps: {
      placeholder: '请输入配置项值',
    },
  },
  {
    component: 'Select',
    fieldName: 'valueType',
    label: '值类型',
    defaultValue: 'string',
    componentProps: {
      options: valueTypeOptions,
    },
  },
  {
    component: 'Input',
    fieldName: 'itemGroup',
    label: '配置分组',
    componentProps: {
      placeholder: '请输入配置分组',
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'sortOrder',
    label: '排序号',
    defaultValue: 0,
    rules: 'required',
    componentProps: {
      min: 0,
      max: 999,
      placeholder: '请输入排序号',
    },
  },
  {
    component: 'Select',
    fieldName: 'status',
    label: '状态',
    defaultValue: 1,
    componentProps: {
      options: statusOptions,
    },
  },
  {
    component: 'Textarea',
    fieldName: 'remark',
    label: '备注',
    componentProps: {
      placeholder: '请输入备注说明',
      rows: 3,
    },
  },
];
