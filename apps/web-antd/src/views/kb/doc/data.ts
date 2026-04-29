import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

/** 状态选项 */
const statusOptions = [
  { label: '待处理', value: 0 },
  { label: '已发布', value: 1 },
  { label: '已撤回', value: 2 },
  { label: '已归档', value: 3 },
  { label: '处理失败', value: 4 },
];

/** 发布标志选项 */
const releaseOptions = [
  { label: '未发布', value: 0 },
  { label: '已发布', value: 1 },
];

/** 搜索表单配置 */
export const querySchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    fieldName: 'docTitle',
    label: '文档标题',
    componentProps: {
      placeholder: '请输入文档标题',
    },
  },
  {
    component: 'Input',
    fieldName: 'docName',
    label: '文件名',
    componentProps: {
      placeholder: '请输入文件名',
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
  {
    component: 'Select',
    fieldName: 'releaseFlag',
    label: '发布',
    componentProps: {
      options: releaseOptions,
      placeholder: '请选择',
      allowClear: true,
    },
  },
];

/** 文件大小格式化 */
function formatFileSize(size: number) {
  if (!size) return '-';
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)}MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

/** 状态映射 */
const statusMap: Record<number, { text: string; color: string }> = {
  0: { text: '待处理', color: '#D4841C' },
  1: { text: '已发布', color: '#2D8B55' },
  2: { text: '已撤回', color: '#C44536' },
  3: { text: '已归档', color: '#86868b' },
  4: { text: '处理失败', color: '#FF4D4F' },
};

/** 表格列配置 */
export const columns: VxeGridProps['columns'] = [
  { type: 'seq', title: '序号', width: 60 },
  {
    title: '文档标题',
    field: 'docTitle',
    minWidth: 200,
  },
  {
    title: '文件名',
    field: 'docName',
    minWidth: 180,
  },
  {
    title: '文件类型',
    field: 'fileType',
    width: 90,
  },
  {
    title: '文件大小',
    field: 'fileSize',
    width: 100,
    slots: {
      default: ({ row }) => formatFileSize(row.fileSize),
    },
  },
  {
    title: '分类',
    field: 'category',
    width: 100,
  },
  {
    title: '状态',
    field: 'status',
    width: 90,
    slots: {
      default: ({ row }) => {
        const s = statusMap[row.status] || { text: '未知', color: '#86868b' };
        return s.text;
      },
    },
  },
  {
    title: '下载',
    field: 'downloadCount',
    width: 80,
    sortable: true,
  },
  {
    title: '浏览',
    field: 'viewCount',
    width: 80,
    sortable: true,
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

/** 编辑弹窗表单配置 */
export const editModalSchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    dependencies: {
      show: () => false,
      triggerFields: [''],
    },
    fieldName: 'docId',
    label: 'docId',
  },
  {
    component: 'Input',
    fieldName: 'docTitle',
    label: '文档标题',
    rules: 'required',
    componentProps: {
      placeholder: '请输入文档标题',
    },
  },
  {
    component: 'Input',
    fieldName: 'category',
    label: '文档分类',
    componentProps: {
      placeholder: '请输入文档分类',
    },
  },
  {
    component: 'Input',
    fieldName: 'keywords',
    label: '关键词',
    componentProps: {
      placeholder: '多个关键词用逗号分隔',
    },
  },
  {
    component: 'Input',
    fieldName: 'remark',
    label: '备注',
    componentProps: {
      placeholder: '请输入备注',
    },
  },
];
