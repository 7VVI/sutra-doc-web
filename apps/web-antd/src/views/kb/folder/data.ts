import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

/** 状态选项 */
const statusOptions = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

/** 搜索表单配置 */
export const querySchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    fieldName: 'folderName',
    label: '目录名称',
    componentProps: {
      placeholder: '请输入目录名称',
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
    title: '目录名称',
    field: 'folderName',
    minWidth: 180,
    treeNode: true,
  },
  {
    title: '目录编码',
    field: 'folderCode',
    width: 130,
  },
  {
    title: '层级',
    field: 'folderLevel',
    width: 70,
  },
  {
    title: '排序',
    field: 'sortOrder',
    width: 70,
    sortable: true,
  },
  {
    title: '文档数',
    field: 'docCount',
    width: 80,
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
    width: 150,
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
    fieldName: 'folderId',
    label: 'folderId',
  },
  {
    component: 'Input',
    fieldName: 'parentId',
    label: 'parentId',
    dependencies: {
      show: () => false,
      triggerFields: [''],
    },
  },
  {
    component: 'Input',
    fieldName: 'folderName',
    label: '目录名称',
    rules: 'required',
    componentProps: {
      placeholder: '请输入目录名称',
    },
  },
  {
    component: 'Input',
    fieldName: 'folderCode',
    label: '目录编码',
    componentProps: {
      placeholder: '请输入目录编码',
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
    component: 'Input',
    fieldName: 'description',
    label: '描述',
    componentProps: {
      placeholder: '请输入目录描述',
    },
  },
];
