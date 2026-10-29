import { useEffect, useRef, useState } from 'react'

import { createLatestGuard } from '../lib/routing'
import { findEnvironment, type EnvironmentId } from '../lib/environments'

/**
 * 场景背景。
 *
 * 四张背景为 941×1672 PNG，按 cover 铺满；角色仍按 contain 叠在上层。
 * 先预解码，准备好后原子替换；不让单图淡入时露出背景底色。
 * 背景切换本身无需位移动画；卡片动效单独保留。
 * 预解码失败时保留上一张背景，不把空白或坏图推上舞台。
 */
export function SceneBackdrop({ environment }: { environment: EnvironmentId }) {
  const def = findEnvironment(environment)
  const [shown, setShown] = useState<string>(def.background)
  const guardRef = useRef(createLatestGuard())

  useEffect(() => {
    const source = def.background
    if (shown === source) return

    const requestId = guardRef.current.begin()
    let cancelled = false
    const image = new Image()
    image.src = source

    const apply = () => {
      if (cancelled || !guardRef.current.isCurrent(requestId)) return
      setShown(source)
    }

    if (typeof image.decode === 'function') {
      void image.decode().then(apply).catch(() => undefined)
    } else if (image.complete) {
      apply()
    } else {
      image.onload = apply
    }

    return () => {
      cancelled = true
    }
    // shown 只用于跳过重复切换，不参与请求序号判断
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.background])

  return (
    <div className="court-backdrop pointer-events-none absolute inset-0 overflow-hidden bg-background" aria-hidden>
      <img key={shown} src={shown} alt="" className="size-full object-cover" />
    </div>
  )
}
