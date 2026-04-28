import type { Router } from 'vue-router';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { startProgress, stopProgress } from '@vben/utils';

import { accessRoutes, coreRouteNames } from '#/router/routes';
import { useAuthStore } from '#/store';

import { generateAccess } from './access';

/**
 * 递归查找第一个叶子菜单（实际页面）
 */
function findFirstLeafMenu(menus: any[]): any {
  for (const menu of menus) {
    if (menu.children && menu.children.length > 0) {
      const found = findFirstLeafMenu(menu.children);
      if (found) return found;
    }
    if (menu.path && !menu.meta?.hideInMenu && !menu.meta?.hideChildrenInMenu) {
      return menu;
    }
  }
  return null;
}

/**
 * 通用守卫配置
 * @param router
 */
function setupCommonGuard(router: Router) {
  // 记录已经加载的页面
  const loadedPaths = new Set<string>();

  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);

    // 页面加载进度条
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to) => {
    // 记录页面是否加载,如果已经加载，后续的页面切换动画等效果不在重复执行

    loadedPaths.add(to.path);

    // 关闭页面加载进度条
    if (preferences.transition.progress) {
      stopProgress();
    }
  });
}

/**
 * 权限访问守卫配置
 * @param router
 */
function setupAccessGuard(router: Router) {
  router.beforeEach(async (to, from) => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();

    // 基本路由，这些路由不需要进入权限拦截
    if (coreRouteNames.includes(to.name as string)) {
      if (to.path === LOGIN_PATH && accessStore.accessToken) {
        return decodeURIComponent(
          (to.query?.redirect as string) ||
            userStore.userInfo?.homePath ||
            preferences.app.defaultHomePath,
        );
      }
      return true;
    }

    // accessToken 检查
    if (!accessStore.accessToken) {
      // 明确声明忽略权限访问权限，则可以访问
      if (to.meta.ignoreAccess) {
        return true;
      }

      // 没有访问权限，跳转登录页面
      if (to.fullPath !== LOGIN_PATH) {
        return {
          path: LOGIN_PATH,
          // 如不需要，直接删除 query
          query:
            to.fullPath === preferences.app.defaultHomePath
              ? {}
              : { redirect: encodeURIComponent(to.fullPath) },
          // 携带当前跳转的页面，登录后重新跳转该页面
          replace: true,
        };
      }
      return to;
    }

    // 是否已经生成过动态路由
    if (accessStore.isAccessChecked) {
      // 如果用户已登录且访问根路径或portal，跳转到后台管理页面
      if (to.path === '/' || to.path === '/portal') {
        const accessMenus = accessStore.accessMenus;
        const firstLeafMenu = findFirstLeafMenu(accessMenus || []);
        if (firstLeafMenu?.path) {
          return { path: firstLeafMenu.path, replace: true };
        }
        // 如果没有菜单，使用 userInfo.homePath 或保持当前路径
        if (userInfo.homePath && userInfo.homePath !== '/portal') {
          return { path: userInfo.homePath, replace: true };
        }
      }
      return true;
    }

    // 生成路由表
    // 当前登录用户拥有的角色标识列表
    const [userInfo, routeInfo] = await Promise.all([
      userStore.userInfo || (await authStore.fetchUserInfo()),
      generateAccess({
        // 前端路由模式会需要 后端路由模式不需要
        // roles: userRoles,
        router,
        // 则会在菜单中显示，但是访问会被重定向到403
        routes: accessRoutes,
      }),
    ]);

    // 生成菜单和路由
    const { accessibleMenus, accessibleRoutes } = routeInfo;

    // 保存菜单信息和路由信息
    accessStore.setAccessMenus(accessibleMenus);
    accessStore.setAccessRoutes(accessibleRoutes);
    accessStore.setIsAccessChecked(true);

    // 计算跳转目标
    let redirectPath: string;
    if (from.query.redirect) {
      redirectPath = decodeURIComponent(from.query.redirect as string);
    } else if (to.path === '/' || to.path === '/portal') {
      // 登录后访问根路径或portal，跳转到后台管理页面
      const firstLeafMenu = findFirstLeafMenu(accessibleMenus || []);
      if (firstLeafMenu?.path) {
        redirectPath = firstLeafMenu.path;
      } else if (userInfo.homePath && userInfo.homePath !== '/portal') {
        redirectPath = userInfo.homePath;
      } else {
        redirectPath = to.fullPath;
      }
    } else if (to.path === preferences.app.defaultHomePath) {
      redirectPath = userInfo.homePath || preferences.app.defaultHomePath;
    } else {
      redirectPath = to.fullPath;
    }

    return {
      ...router.resolve(redirectPath),
      replace: true,
    };
  });
}

/**
 * 项目守卫配置
 * @param router
 */
function createRouterGuard(router: Router) {
  /** 通用 */
  setupCommonGuard(router);
  /** 权限访问 */
  setupAccessGuard(router);
}

export { createRouterGuard };
