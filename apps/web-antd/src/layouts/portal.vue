<script lang="ts" setup>
import { computed, ref, provide, readonly, onMounted, onUnmounted, watch } from 'vue';

import iconDocs from '#/assets/藏经阁.svg';
import iconMuke from '#/assets/讲武堂.svg';

import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { useAuthStore } from '#/store';
import { generateAccess } from '#/router/access';
import { accessRoutes } from '#/router/routes';

import { useRouter, useRoute, RouterView } from 'vue-router';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const accessStore = useAccessStore();
const authStore = useAuthStore();

const appName = computed(() => preferences.app.name);
const logo = computed(() => preferences.logo.source);

const isLoggedIn = computed(() => !!accessStore.accessToken);
const userName = computed(() => userStore.userInfo?.realName || '访客');
const userAvatar = computed(() => userStore.userInfo?.avatar || preferences.app.defaultAvatar);

// Tab切换状态
const activeTab = ref('docs');

function setActiveTab(tab: string) {
  activeTab.value = tab;
  if (tab === 'docs') {
    router.push('/portal');
  } else if (tab === 'muke') {
    router.push('/portal/muke');
  }
}

// 同步路由到tab状态
watch(() => route.path, (path) => {
  if (path.includes('/portal/muke')) {
    activeTab.value = 'muke';
  } else {
    activeTab.value = 'docs';
  }
}, { immediate: true });

// 向子组件提供 activeTab
provide('portalActiveTab', readonly(activeTab));
provide('setPortalActiveTab', setActiveTab);

function goToAdmin() {
  // 获取后端返回的菜单，跳转到第一个可访问的路由
  const accessMenus = accessStore.accessMenus;

  // 递归查找第一个叶子菜单（实际页面）
  function findFirstLeafMenu(menus: any[]): any {
    for (const menu of menus) {
      // 如果有子菜单，递归查找
      if (menu.children && menu.children.length > 0) {
        const found = findFirstLeafMenu(menu.children);
        if (found) return found;
      }
      // 没有子菜单且路径存在且不隐藏，就是叶子菜单
      if (menu.path && !menu.meta?.hideInMenu && !menu.meta?.hideChildrenInMenu) {
        return menu;
      }
    }
    return null;
  }

  const firstLeafMenu = findFirstLeafMenu(accessMenus || []);
  if (firstLeafMenu?.path) {
    router.push(firstLeafMenu.path);
    return;
  }

  // 如果没有菜单，尝试跳转到第一个 accessRoute
  const accessRoutes = accessStore.accessRoutes;
  const firstRoute = accessRoutes?.find((r: any) => r.path && !r.meta?.hideInMenu);
  if (firstRoute?.path) {
    router.push(firstRoute.path);
    return;
  }

  // 兜底：跳转到根路由让路由守卫处理
  router.push('/');
}

function goToLogin() {
  router.push('/auth/login');
}

function goToProfile() {
  router.push('/profile');
}

// 导航栏滚动阴影效果
const navbarShadow = ref(false);

function handleScroll() {
  navbarShadow.value = window.scrollY > 16;
}

onMounted(async () => {
  window.addEventListener('scroll', handleScroll, { passive: true });
  // 如果已登录
  if (isLoggedIn.value) {
    // 获取用户信息
    if (!userStore.userInfo) {
      try {
        await authStore.fetchUserInfo();
      } catch (e) {
        console.error('获取用户信息失败:', e);
      }
    }
    // 如果路由还没生成，主动生成
    if (!accessStore.isAccessChecked) {
      try {
        const { accessibleMenus, accessibleRoutes } = await generateAccess({
          router,
          routes: accessRoutes,
        });
        accessStore.setAccessMenus(accessibleMenus);
        accessStore.setAccessRoutes(accessibleRoutes);
        accessStore.setIsAccessChecked(true);
      } catch (e) {
        console.error('生成路由失败:', e);
      }
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<template>
  <div class="portal-layout min-h-screen bg-[#FAFAFA]">
    <!-- 顶部线条 -->
    <div class="top-line"></div>

    <!-- 导航栏 -->
    <nav class="portal-navbar" :class="{ 'with-shadow': navbarShadow }">
      <!-- 导航tabs -->
      <div class="nav-tabs">
        <button class="nav-tab" :class="{ active: activeTab === 'docs' }" @click="setActiveTab('docs')">
          <img :src="iconDocs" class="nav-tab-icon" />藏经阁
        </button>
        <button class="nav-tab" :class="{ active: activeTab === 'muke' }" @click="setActiveTab('muke')">
          <img :src="iconMuke" class="nav-tab-icon" />讲武堂
        </button>
      </div>
      <!-- 右侧：用户头像 -->
      <div class="nav-user">
          <div class="nav-user-trigger">
            <div class="nav-user-avatar">
              <img v-if="userAvatar && isLoggedIn" :src="userAvatar" alt="avatar" />
              <span v-else>{{ userName.charAt(0) }}</span>
            </div>
            <span class="nav-user-name">{{ userName }}</span>
            <i class="fa-solid fa-chevron-down nav-user-arrow"></i>
          </div>
          <div class="nav-user-dropdown">
            <div class="nav-user-header">
              <div class="nav-user-header-avatar">
                <img v-if="userAvatar && isLoggedIn" :src="userAvatar" alt="avatar" />
                <span v-else>{{ userName.charAt(0) }}</span>
              </div>
              <div class="nav-user-header-info">
                <div class="nav-user-header-name">{{ userName }}</div>
                <div class="nav-user-header-role">{{ isLoggedIn ? '管理员' : '未登录' }}</div>
              </div>
            </div>
            <div class="nav-user-menu">
              <a v-if="isLoggedIn" class="nav-user-item admin" @click="goToAdmin">
                <i class="fa-solid fa-gear"></i>
                <span>进入后台管理</span>
              </a>
              <a v-if="isLoggedIn" class="nav-user-item" @click="goToProfile">
                <i class="fa-regular fa-user"></i>
                <span>个人设置</span>
              </a>
              <template v-if="!isLoggedIn">
                <a class="nav-user-item" @click="goToLogin">
                  <i class="fa-solid fa-right-to-bracket"></i>
                  <span>登录系统</span>
                </a>
              </template>
            </div>
          </div>
        </div>
    </nav>

    <!-- 主内容区域 -->
    <main class="portal-main">
      <RouterView />
    </main>

    <!-- 页脚 -->
    <footer class="portal-footer">
    </footer>
  </div>
</template>

<style scoped>
.portal-layout {
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #FAFAFA;
}

.portal-layout::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.01) 1px, transparent 0);
  background-size: 40px 40px;
  pointer-events: none;
  z-index: 0;
}

.top-line {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #1A1A1A, transparent);
  opacity: 0.1;
  z-index: 1001;
}

.portal-navbar {
  position: fixed;
  top: 2px;
  left: 0;
  right: 0;
  height: 56px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-bottom: 1px solid #ECECEC;
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0 32px;
  z-index: 1000;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.portal-navbar.with-shadow {
  box-shadow: 0 1px 20px rgba(0, 0, 0, 0.05);
}

.nav-tabs {
  display: flex;
  gap: 2px;
  border-radius: 10px;
  padding: 3px;
}

.nav-tab {
  padding: 7px 22px;
  border-radius: 8px;
  border: none;
  background: none;
  font-size: 13px;
  font-weight: 500;
  color: #A0A0A0;
  cursor: pointer;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 7px;
  white-space: nowrap;
}

.nav-tab:hover {
  color: #6B6B6B;
}

.nav-tab.active {
  background: #FFFFFF;
  color: #1A1A1A;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
}

.nav-tab i {
  font-size: 12px;
}

.nav-tab-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.nav-icon {
  width: 30px;
  height: 30px;
  background: #1A1A1A;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  position: relative;
  overflow: hidden;
}

.nav-icon::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent 40%, rgba(255, 255, 255, 0.1) 50%, transparent 60%);
  animation: shine 5s ease-in-out infinite;
}

@keyframes shine {
  0%, 100% { transform: translateX(-100%) translateY(-100%); }
  50% { transform: translateX(100%) translateY(100%); }
}

.nav-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  color: #1A1A1A;
}

.nav-sub {
  font-size: 9px;
  color: #A0A0A0;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-weight: 300;
  flex-shrink: 0;
}

/* 用户头像下拉 */
.nav-user {
  position: relative;
  flex-shrink: 0;
  margin-left: auto;
}

.nav-user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 10px;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-user-trigger:hover {
  background: #F5F5F5;
}

.nav-user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
}

.nav-user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nav-user-name {
  font-size: 13px;
  color: #6B6B6B;
  font-weight: 500;
  max-width: 80px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-user-arrow {
  font-size: 10px;
  color: #A0A0A0;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-user:hover .nav-user-arrow {
  transform: rotate(180deg);
}

.nav-user-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 200px;
  background: #FFFFFF;
  border: 1px solid #ECECEC;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
  z-index: 9999;
  opacity: 0;
  transform: translateY(-8px);
  pointer-events: none;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-user:hover .nav-user-dropdown {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.nav-user-header {
  padding: 16px;
  border-bottom: 1px solid #F3F3F3;
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-user-header-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
}

.nav-user-header-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nav-user-header-info {
  flex: 1;
}

.nav-user-header-name {
  font-size: 14px;
  font-weight: 600;
  color: #1A1A1A;
}

.nav-user-header-role {
  font-size: 12px;
  color: #A0A0A0;
  font-weight: 300;
}

.nav-user-menu {
  padding: 6px;
}

.nav-user-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 13px;
  color: #6B6B6B;
  font-weight: 400;
}

.nav-user-item:hover {
  background: #F5F5F5;
  color: #1A1A1A;
}

.nav-user-item i {
  font-size: 14px;
  width: 16px;
  color: #A0A0A0;
}

.nav-user-item:hover i {
  color: #1A1A1A;
}

.nav-user-item.admin {
  color: #667eea;
  font-weight: 500;
}

.nav-user-item.admin i {
  color: #667eea;
}

.nav-user-item.admin:hover {
  background: #F0F4FF;
  color: #5a67d8;
}

.nav-user-item.admin:hover i {
  color: #5a67d8;
}

.portal-main {
  margin-top: 56px;
  position: relative;
  z-index: 1;
}

.portal-footer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 48px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  animation: fadeUp 0.7s ease 0.2s both;
}

.footer-text {
  font-size: 11px;
  color: #A0A0A0;
  font-weight: 300;
  letter-spacing: 0.5px;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .portal-navbar {
    gap: 16px;
    padding: 0 16px;
  }
  .nav-tabs {
    gap: 1px;
  }
  .nav-tab {
    padding: 6px 12px;
    font-size: 12px;
  }
  .nav-sub {
    display: none;
  }
  .nav-user-name {
    display: none;
  }
  .portal-footer {
    padding: 16px 20px 40px;
  }
}
</style>