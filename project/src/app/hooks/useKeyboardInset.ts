import { useEffect, useState } from 'react'

/**
 * Android WebView 键盘视口处理。
 *
 * 键盘弹出时 visualViewport 会变小，但部分 WebView 不会同步缩小布局视口，
 * 导致底部输入框被键盘挡住。这里把「布局视口 - 可视视口」的差值写进
 * --keyboard-inset，页面底部按它让位。
 *
 * 只读取真实可视区，不猜测键盘高度；没有 visualViewport 时保持 0。
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const gap = window.innerHeight - viewport.height - viewport.offsetTop
        setInset(Math.max(0, Math.round(gap)))
      })
    }

    update()
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    window.addEventListener('orientationchange', update)

    return () => {
      cancelAnimationFrame(frame)
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  return inset
}
