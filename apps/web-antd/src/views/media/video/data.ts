import type { FormSchemaGetter } from '#/adapter/form';
import type { VxeGridProps } from '#/adapter/vxe-table';

/** 授权类型选项 */
export const authTypeOptions = [
  { label: '公开', value: 0 },
  { label: '指定用户/角色', value: 1 },
];

/** 搜索表单配置 */
export const querySchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    fieldName: 'keyword',
    label: '关键词',
    componentProps: {
      placeholder: '请输入视频标题或描述',
    },
  },
  {
    component: 'Select',
    fieldName: 'authType',
    label: '授权类型',
    componentProps: {
      options: authTypeOptions,
      placeholder: '请选择授权类型',
      allowClear: true,
    },
  },
  {
    component: 'ApiSelect',
    fieldName: 'categoryIds',
    label: '分类',
    componentProps: {
      placeholder: '请选择分类',
      mode: 'multiple',
      allowClear: true,
      api: async () => {
        const { categoryList } = await import('#/api/media/direction');
        const data = await categoryList();
        return (data || [])
          .filter((item: any) => item.status === 0)
          .map((item: any) => ({ label: item.tagName, value: item.tagId }));
      },
    },
  },
  {
    component: 'ApiSelect',
    fieldName: 'directionIds',
    label: '方向',
    componentProps: {
      placeholder: '请选择方向',
      mode: 'multiple',
      allowClear: true,
      api: async () => {
        const { directionList } = await import('#/api/media/direction');
        const data = await directionList();
        return (data || [])
          .filter((item: any) => item.status === 0)
          .map((item: any) => ({ label: item.tagName, value: item.tagId }));
      },
    },
  },
];

/** 表格列配置 */
export const columns: VxeGridProps['columns'] = [
  { type: 'seq', title: '序号', width: 60 },
  {
    title: '缩略图',
    field: 'thumbnail',
    width: 100,
    slots: { default: 'thumbnail' },
  },
  {
    title: '标题',
    field: 'title',
    minWidth: 200,
  },
  {
    title: '作者',
    field: 'authorName',
    width: 100,
  },
  {
    title: '文件类型',
    field: 'fileType',
    width: 80,
  },
  {
    title: '文件大小',
    field: 'fileSize',
    width: 100,
    slots: {
      default: ({ row }) => {
        const size = row.fileSize || 0;
        if (size < 1024) return `${size}B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
        if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)}MB`;
        return `${(size / (1024 * 1024 * 1024)).toFixed(1)}GB`;
      },
    },
  },
  {
    title: '播放次数',
    field: 'viewCount',
    width: 100,
    sortable: true,
  },
  {
    title: '点赞次数',
    field: 'likeCount',
    width: 100,
    sortable: true,
  },
  {
    title: '授权类型',
    field: 'authType',
    width: 120,
    slots: {
      default: ({ row }) => {
        return row.authType === 0 ? '公开' : '指定用户/角色';
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

/** 弹窗表单配置 - 编辑视频信息 */
export const editModalSchema: FormSchemaGetter = () => [
  {
    component: 'Input',
    dependencies: {
      show: () => false,
      triggerFields: [''],
    },
    fieldName: 'videoId',
    label: 'videoId',
  },
  {
    component: 'Input',
    fieldName: 'title',
    label: '标题',
    rules: 'required',
    componentProps: {
      placeholder: '请输入视频标题',
    },
  },
  {
    component: 'Textarea',
    fieldName: 'description',
    label: '描述',
    componentProps: {
      placeholder: '请输入视频描述',
      rows: 3,
    },
  },
  {
    component: 'Select',
    fieldName: 'authType',
    label: '授权类型',
    defaultValue: 0,
    componentProps: {
      options: authTypeOptions,
    },
  },
];