import { createStandaloneSdk } from './standalone'
import type { BridgeMode, CapsuleSdk } from './types'
export interface BridgeHandle { mode: BridgeMode; sdk: CapsuleSdk }
let cached: Promise<BridgeHandle> | undefined
export function loadBridge(): Promise<BridgeHandle> {
  return cached ??= Promise.resolve({ mode: 'standalone', sdk: createStandaloneSdk() })
}
