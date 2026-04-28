import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

/** 状态选项 */
const statusOptions = [
  { label: '正常', value: 0 },
  { label: '停用', value: 1 },
];

/** 搜索表单配置 */
export const querySchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    fieldName: 'tagName',
    label: '名称',
    componentProps: {
      placeholder: '请输入方向名称',
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
    title: '名称',
    field: 'tagName',
    minWidth: 150,
  },
  {
    title: '排序',
    field: 'sortOrder',
    width: 80,
    sortable: true,
  },
  {
    title: '是否启用',
    field: 'status',
    width: 100,
    slots: {
      default: ({ row }) => {
        const isEnable = row.status === 0;
        return isEnable ? '正常' : '停用';
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
    width: 120,
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
    fieldName: 'tagId',
    label: 'tagId',
  },
  {
    component: 'Input',
    fieldName: 'tagName',
    label: '名称',
    rules: 'required',
    componentProps: {
      placeholder: '请输入方向名称',
    },
  },
  {
    component: 'InputNumber',
    fieldName: 'sortOrder',
    label: '排序',
    defaultValue: 0,
    componentProps: {
      min: 0,
      max: 999,
      placeholder: '请输入排序号',
    },
  },
  {
    component: 'Select',
    fieldName: 'status',
    label: '是否启用',
    defaultValue: 0,
    componentProps: {
      options: statusOptions,
    },
  },
];