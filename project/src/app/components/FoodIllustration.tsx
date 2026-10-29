import dish0 from '@/assets/ui/food-v34/pork-rice.webp'
import dish1 from '@/assets/ui/food-v34/kfc.webp'
import dish2 from '@/assets/ui/food-v34/damixiansheng.webp'
import dish3 from '@/assets/ui/food-v34/pork-duck.webp'
import dish4 from '@/assets/ui/food-v34/pork-combo.webp'
import dish5 from '@/assets/ui/food-v34/pork-chicken.webp'
import dish6 from '@/assets/ui/food-v34/kfc-crispy.webp'
import dish7 from '@/assets/ui/food-v34/kfc-wings.webp'
import dish8 from '@/assets/ui/food-v34/kfc-nuggets.webp'
import dish9 from '@/assets/ui/food-v34/dami-pepper.webp'
import dish10 from '@/assets/ui/food-v34/dami-tomato.webp'
import dish11 from '@/assets/ui/food-v34/dami-chicken.webp'

const assets: Record<string,string> = {
  'pork-rice': dish0,
  'kfc': dish1,
  'damixiansheng': dish2,
  'pork-duck': dish3,
  'pork-combo': dish4,
  'pork-chicken': dish5,
  'kfc-crispy': dish6,
  'kfc-wings': dish7,
  'kfc-nuggets': dish8,
  'dami-pepper': dish9,
  'dami-tomato': dish10,
  'dami-chicken': dish11,
}

export function FoodIllustration({id}:{id:string}) {
  return <img src={assets[id]} alt="" aria-hidden draggable={false} className="court-illustration" width={512} height={512} loading="lazy" />
}
