export const DEFAULT_KITCHEN_DELIVERY = {address:'',contactName:'',phone:''} as const

export function validKitchenDelivery(card: {address?:string|null;contactName?:string|null;phone?:string|null}) {return Boolean(card.address?.trim() && card.contactName?.trim() && /^1[3-9]\d{9}$/.test(card.phone?.trim() ?? ''))}

