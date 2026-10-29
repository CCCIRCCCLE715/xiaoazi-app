import test from 'node:test'
import assert from 'node:assert/strict'
import {buildDevicePlan} from '../src/app/lib/device-plan.ts'
const card={kind:'kitchen',address:'家',contactName:'测试联系人',phone:'13800000000',budget:40,taste:'清淡',dishes:[{id:'pork-rice',merchantId:'pork-rice',name:'猪脚饭',price:22}],selectedDish:null}
test('food approval requires an explicit image choice',()=>assert.equal(buildDevicePlan('open-alipay',card).ok,false))
test('saved choice is retained in Meituan open request without claiming an order',()=>{
 const r=buildDevicePlan('open-alipay',{...card,selectedDish:'猪脚饭'});assert.equal(r.ok,true);assert.equal(r.plan.appName,'美团');assert.equal(r.plan.merchantId,'pork-rice');assert.match(r.plan.summary,/猪脚饭/)
})
test('choice outside saved budget is rejected even if stale UI submits it',()=>assert.equal(buildDevicePlan('open-alipay',{...card,budget:20,selectedDish:'猪脚饭'}).ok,false))

test('incomplete food delivery cannot launch even with a stale selected dish',()=>{for(const patch of [{address:'  '},{contactName:''},{phone:'123'}])assert.equal(buildDevicePlan('open-alipay',{...card,selectedDish:'猪脚饭',...patch}).ok,false)})
