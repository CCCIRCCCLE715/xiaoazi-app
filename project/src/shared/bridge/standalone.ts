import type { CapsuleSdk } from './types'

/** Standalone WebView has no Step capsule SDK. Never simulate device work. */
export function createStandaloneSdk(): CapsuleSdk {
  return {
    async invoke(apiName, params) {
      if (apiName === 'canIUse') {
        const name = (params as { args?: string } | undefined)?.args
        return { ok: true, data: name === 'getSafeArea' }
      }
      if (apiName === 'getSafeArea') return { ok: true, top: 0, bottom: 0, left: 0, right: 0 }
      throw new Error(`${apiName}:fail unsupported in standalone test APK`)
    },
    on() {},
    off() {},
  }
}
