import type { RouteRecordRaw } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';

import { $t } from '#/locales';

const BasicLayout = () => import('#/layouts/basic.vue');
const AuthPageLayout = () => import('#/layouts/auth.vue');
const PortalLayout = () => import('#/layouts/portal.vue');

/** 全局404页面 */
const fallbackNotFoundRoute: RouteRecordRaw = {
  component: () => import('#/views/_core/fallback/not-found.vue'),
  meta: {
    hideInBreadcrumb: true,
    hideInMenu: true,
    hideInTab: true,
    title: '404',
  },
  name: 'FallbackNotFound',
  path: '/:path(.*)*',
};

/** 基本路由，这些路由是必须存在的 */
const coreRoutes: RouteRecordRaw[] = [
  /**
   * 根路由
   * 使用基础布局，作为所有页面的父级容器，子级就不必配置BasicLayout。
   * 此路由必须存在，且不应修改
   */
  {
    component: BasicLayout,
    meta: {
      hideInBreadcrumb: true,
      title: 'Root',
    },
    name: 'Root',
    path: '/',
    redirect: preferences.app.defaultHomePath,
    children: [],
  },
  {
    component: () => import('#/views/_core/social-callback/index.vue'),
    meta: {
      title: $t('page.auth.oauthLogin'),
    },
    name: 'OAuthRedirect',
    path: '/social-callback',
  },
  {
    component: AuthPageLayout,
    meta: {
      hideInTab: true,
      title: 'Authentication',
    },
    name: 'Authentication',
    path: '/auth',
    redirect: LOGIN_PATH,
    children: [
      {
        name: 'Login',
        path: 'login',
        component: () => import('#/views/_core/authentication/login.vue'),
        meta: {
          title: $t('page.auth.login'),
        },
      },
      {
        name: 'CodeLogin',
        path: 'code-login',
        component: () => import('#/views/_core/authentication/code-login.vue'),
        meta: {
          title: $t('page.auth.codeLogin'),
        },
      },
      {
        name: 'QrCodeLogin',
        path: 'qrcode-login',
        component: () =>
          import('#/views/_core/authentication/qrcode-login.vue'),
        meta: {
          title: $t('page.auth.qrcodeLogin'),
        },
      },
      {
        name: 'ForgetPassword',
        path: 'forget-password',
        component: () =>
          import('#/views/_core/authentication/forget-password.vue'),
        meta: {
          title: $t('page.auth.forgetPassword'),
        },
      },
      {
        name: 'Register',
        path: 'register',
        component: () => import('#/views/_core/authentication/register.vue'),
        meta: {
          title: $t('page.auth.register'),
        },
      },
    ],
  },
  /**
   * 前台门户路由 - 不需要登录即可访问
   */
  {
    path: '/portal',
    name: 'PortalRoot',
    component: PortalLayout,
    meta: {
      title: '藏经阁',
      hideInMenu: true,
      hideInTab: true,
      hideInBreadcrumb: true,
      ignoreAccess: true,
    },
    children: [
      {
        path: '',
        name: 'PortalIndex',
        component: () => import('#/views/portal/index.vue'),
        meta: {
          title: '藏经阁 - 文档检索',
          ignoreAccess: true,
        },
      },
      {
        path: 'docs',
        name: 'PortalDocs',
        component: () => import('#/views/portal/index.vue'),
        meta: {
          title: '藏经阁 - 文档检索',
          ignoreAccess: true,
        },
      },
      {
        path: 'muke',
        name: 'PortalMuke',
        component: () => import('#/views/portal/index.vue'),
        meta: {
          title: '藏经阁 - 企业慕课',
          ignoreAccess: true,
        },
      },
      {
        path: 'search',
        name: 'PortalSearch',
        component: () => import('#/views/portal/search.vue'),
        meta: {
          title: '藏经阁 - 搜索结果',
          ignoreAccess: true,
        },
      },
      {
        path: 'share',
        name: 'PortalShare',
        component: () => import('#/views/portal/share.vue'),
        meta: {
          title: '藏经阁 - 文档分享',
          ignoreAccess: true,
        },
      },
    ],
  },
];

export { coreRoutes, fallbackNotFoundRoute };
