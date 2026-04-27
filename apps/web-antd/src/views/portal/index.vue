<script lang="ts" setup>
import { inject, type Ref } from 'vue';
import DocsView from './docs.vue';
import MukeView from './muke.vue';

// 从父组件获取 activeTab
const activeTab = inject<Ref<string>>('portalActiveTab');
</script>

<template>
  <div class="portal-page">
    <div class="page-content">
      <DocsView v-if="activeTab === 'docs'" />
      <MukeView v-if="activeTab === 'muke'" />
    </div>
  </div>
</template>

<style scoped>
.portal-page {
  min-height: 100vh;
  position: relative;
}

.page-content {
  position: relative;
  z-index: 1;
}
</style>