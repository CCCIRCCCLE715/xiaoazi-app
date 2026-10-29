import food from '@/assets/ui/food.png'
import scroll from '@/assets/ui/scroll.png'
import dumplings from '@/assets/ui/dumplings.png'
import chicken from '@/assets/ui/chicken.png'
import noodles from '@/assets/ui/noodles.png'
const assets = { food, scroll, dumplings, chicken, noodles }
export type IllustrationName = keyof typeof assets
export function Illustration({ name, className = '' }: { name: IllustrationName; className?: string }) {
  return <img src={assets[name]} alt="" aria-hidden draggable={false} className={`court-illustration ${className}`} />
}
