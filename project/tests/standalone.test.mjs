import test from 'node:test'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
const moduleUrl = new URL('../src/shared/bridge/standalone.ts', import.meta.url)
test('standalone runtime never reports platform device capabilities available', async () => {
  const { createStandaloneSdk } = await import(moduleUrl.href)
  const sdk = createStandaloneSdk()
  assert.equal((await sdk.invoke('canIUse', { args: 'getLocation' })).data, false)
  assert.equal((await sdk.invoke('canIUse', { args: 'recordAudio' })).data, false)
  await assert.rejects(sdk.invoke('getSystemInfo'), /unsupported/)
  await assert.rejects(sdk.invoke('request', { url: 'https://example.com' }), /unsupported/)
})
test('safe area excludes OS bars already outside the native WebView', async () => {
  const { createStandaloneSdk } = await import(moduleUrl.href)
  assert.deepEqual(await createStandaloneSdk().invoke('getSafeArea'), { ok: true, top: 0, bottom: 0, left: 0, right: 0 })
})
