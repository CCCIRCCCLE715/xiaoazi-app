/** Measured from the explicit send, in parallel with routing; never added after API time. */
export const MIN_REPLY_DELAY_MS = 1500
export interface ReplyClock {
  now: () => number
  schedule: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>
  clear: (timer: ReturnType<typeof setTimeout>) => void
}
const clock: ReplyClock = {now: () => performance.now(), schedule: (fn, ms) => setTimeout(fn, ms), clear: timer => clearTimeout(timer)}
export function createReplyDelay(time: ReplyClock = clock) {
  let active: {token: number; deadline: number; timer?: ReturnType<typeof setTimeout>; waiters: Array<(current: boolean) => void>} | undefined
  function cancel() {
    if (!active) return
    const previous = active; active = undefined
    if (previous.timer !== undefined) time.clear(previous.timer)
    previous.waiters.splice(0).forEach(resolve => resolve(false))
  }
  return {
    cancel,
    begin(token: number, delayMs = MIN_REPLY_DELAY_MS) {cancel(); active = {token, deadline: time.now() + delayMs, waiters: []}},
    wait(token: number): Promise<boolean> {
      if (!active || active.token !== token) return Promise.resolve(false)
      const request = active, remaining = request.deadline - time.now()
      if (remaining <= 0) return Promise.resolve(true)
      return new Promise(resolve => {
        request.waiters.push(resolve)
        if (request.timer === undefined) request.timer = time.schedule(() => {
          request.timer = undefined
          // Check the monotonic deadline again in case the host woke a timer early.
          const finish = () => {
            if (active !== request) return
            const left = request.deadline - time.now()
            if (left > 0) {request.timer = time.schedule(finish, left); return}
            request.timer = undefined; request.waiters.splice(0).forEach(done => done(true))
          }
          finish()
        }, remaining)
      })
    },
  }
}
