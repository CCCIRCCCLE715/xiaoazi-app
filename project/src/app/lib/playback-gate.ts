/** Two-stage promotion: pending decode cannot blank the visible active frame. */
export function createPlaybackGate() {
  let sequence = 0
  let active: {key: string; token: number} | undefined
  let pending: {key: string; token: number} | undefined
  return {
    request(key: string, restart = false) {
      if (!restart && pending?.key === key) return {token: pending.token, merged: true}
      if (!restart && active?.key === key) { pending = undefined; return {token: active.token, merged: true} }
      // A repeated explicit action keeps its last pixels, but old frames cannot
      // start the newly armed voice while its replacement decoder is loading.
      if (restart && active?.key === key) active = undefined
      pending = {key, token: ++sequence}
      return {token: pending.token, merged: false}
    },
    frame(token: number, ready: boolean) {
      if (!ready) return false
      if (pending?.token === token) { active = pending; pending = undefined; return true }
      return active?.token === token
    },
    complete(token: number) {
      if (active?.token !== token || pending) return false
      active = undefined
      return true
    },
    fail(token: number) {
      if (pending?.token === token) pending = undefined
      if (active?.token === token) active = undefined
    },
    isPending(token: number) { return pending?.token === token },
    isActive(token: number) { return active?.token === token },
    invalidate() { active = pending = undefined; ++sequence },
  }
}
