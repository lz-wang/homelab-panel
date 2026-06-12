<script setup lang="ts">
import { NDivider, NGradientText, NTag } from 'naive-ui'
import { onMounted, ref } from 'vue'
import { get } from '@/api/system/about'
import srcSvglogo from '@/assets/logo.svg'
import srcGitee from '@/assets/about_image/gitee.png'
import srcGithub from '@/assets/about_image/github.png'
import srcBilibili from '@/assets/about_image/bilibili.png'
import srcQQGroupQR from '@/assets/about_image/qq_group_qr2.png'
import { RoundCardModal } from '@/components/common'

interface Version {
  versionName: string
  versionCode: number
}

const versionName = ref('')
const qqGroupQRShow = ref(false)
const frontVersion = import.meta.env.VITE_APP_VERSION || 'unknown'

onMounted(() => {
  get<Version>().then((res) => {
    if (res.code === 0)
      versionName.value = res.data.versionName
  })
})
</script>

<template>
  <div class="pt-5">
    <div class="flex flex-col items-center justify-center">
      <img :src="srcSvglogo" width="100" height="100" alt="">
      <div class="text-3xl font-semibold">
        {{ $t('common.appName') }}
      </div>
      <div class="text-xl">
        <NGradientText type="info">
          <a href="https://github.com/hslr-s/homelab-panel/releases" class="font-semibold" :title="$t('apps.about.viewUpdateLog')" target="_blank">v{{ versionName }}</a>
        </NGradientText>
      </div>
      <div class="mt-2">
        <a href="https://github.com/hslr-s/homelab-panel/releases" target="_blank" class="link">{{ $t('apps.about.checkUpdate') }}</a>
      </div>
    </div>

    <NDivider style="margin:10px 0">
      •
    </NDivider>
    <div class="flex flex-col items-center justify-center text-base">
      <div>
        {{ $t('apps.about.author') }}<a href="https://github.com/hslr-s" target="_blank" class="link">红烧猎人</a> | <a href="https://github.com/hslr-s/homelab-panel/blob/master/doc/donate.md" target="_blank" class="text-red-600 hover:text-red-900">{{ $t('apps.about.donate') }}</a>
      </div>
      <div>
        {{ $t('apps.about.issue') }}<a href="https://github.com/hslr-s/homelab-panel/issues" target="_blank" class="link">Github Issues</a>
      </div>
      <div>
        {{ $t('apps.about.discussions') }}<a href="https://github.com/hslr-s/homelab-panel/discussions" target="_blank" class="link">Github Discussions</a>
      </div>
      <div>
        {{ $t('apps.about.QQGroup') }}<a href="http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=K6UII6aEPZUeDRIPOEpOSJZH-Vmr_RPu&authKey=jEXhnVekLbDDx5UkQzKtd3bRmhZggkGBxmvW4NT5LLIAFP7toMmqABwvkANGHbLb&noverify=0&group_code=831615449" target="_blank" class="link">{{ $t("apps.about.addQQGroupUrl") }}</a>
        |
        <span class="link cursor-pointer" @click="qqGroupQRShow = !qqGroupQRShow">
          {{ $t('apps.about.QR') }}
        </span>
      </div>

      <div class="flex mt-[10px] flex-wrap justify-center">
        <div class="flex items-center mx-[10px]">
          <img class="w-[20px] h-[20px] mr-[5px]" :src="srcGithub" alt="">
          <a href="https://github.com/hslr-s/homelab-panel" target="_blank" class="link">Github</a>
        </div>
        <div class="flex items-center mx-[10px]">
          <img class="w-[20px] h-[20px] mr-[5px]" :src="srcGitee" alt="">
          <a href="https://gitee.com/hslr/homelab-panel" target="_blank" class="link">Gitee</a>
        </div>
        <div class="flex items-center mx-[10px]">
          <img class="w-[20px] h-[20px] mr-[5px]" :src="srcBilibili" alt="">
          <!-- <a href="https://space.bilibili.com/27407696/channel/collectiondetail?sid=2023810" target="_blank" class="link">Bilibili</a> -->
          <a href="https://space.bilibili.com/27407696/channel/collectiondetail?sid=2023810" target="_blank" class="link">Bilibili</a>
        </div>
      </div>

      <div class="mt-5">
        <NTag :bordered="false" size="small">
          {{ $t("apps.about.frontVersionText") }}: FV-{{ frontVersion }}
        </NTag>
      </div>

      <RoundCardModal v-model:show="qqGroupQRShow" title="交流群二维码" style="width: 300px;">
        <div class="text-center">
          - 如果失效请返回联系作者 -
        </div>
        <div class="flex justify-center">
          <img :src="srcQQGroupQR" class="h-[260px]">
        </div>
      </RoundCardModal>
    </div>
  </div>
</template>

<style>
.link{
    color:rgb(0, 89, 255)
}
</style>
