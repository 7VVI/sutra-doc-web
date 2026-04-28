import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

/** 文档操作类型选项（对应后端 visitType） */
const visitTypeOptions = [
  { label: '上传', value: 1 },
  { label: '预览', value: 2 },
  { label: '下载', value: 3 },
  { label: '删除', value: 4 },
  { label: '编辑', value: 5 },
  { label: '分享', value: 6 },
];

/** 搜索表单配置 */
export const querySchema: FormSchemaGetter = () => [
  {
    component: 'RangePicker',
    fieldName: 'createTime',
    label: '创建日期',
    componentProps: {
      valueFormat: 'YYYY-MM-DD HH:mm:ss',
      placeholder: ['开始日期', '结束日期'],
    },
  },
  {
    component: 'Select',
    fieldName: 'visitType',
    label: '操作类型',
    componentProps: {
      options: visitTypeOptions,
      placeholder: '请选择操作类型',
      allowClear: true,
    },
  },
  {
    component: 'Input',
    fieldName: 'userName',
    label: '操作人',
    componentProps: {
      placeholder: '请输入操作人姓名',
    },
  },
];

/** 表格列配置 */
export const columns: VxeGridProps['columns'] = [
  { type: 'seq', title: '序号', width: 60 },
  { type: 'checkbox', width: 50 },
  {
    title: '操作类型',
    field: 'visitTypeText',
    width: 100,
  },
  {
    title: '操作人',
    field: 'userName',
    width: 120,
  },
  {
    title: '关键字',
    field: 'keywords',
    minWidth: 200,
    showOverflow: 'tooltip',
  },
  {
    title: '创建日期',
    field: 'createTime',
    width: 160,
    sortable: true,
  },
  {
    title: 'IP地址',
    field: 'sourceIp',
    width: 140,
  },
];