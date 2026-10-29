import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,readdirSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

// Catches a build resolver silently bundling the original 1440px decoders again.
test('shipping character videos are bounded, transparent, and retain every original frame and its timing',()=>{
 const root=new URL('../../',import.meta.url),dist=new URL('../dist-standalone/assets/',import.meta.url)
 const source=JSON.parse(readFileSync(new URL('runtime-assets.json',root))).files.filter(e=>e.path.startsWith('project/src/assets/character/')&&e.path.endsWith('.webm'))
 const emitted=readdirSync(dist).filter(n=>n.endsWith('.webm'))
 assert.equal(emitted.length,11)
 const inspect=path=>JSON.parse(execFileSync('ffprobe',['-v','error','-count_frames','-select_streams','v:0','-show_entries','stream=width,height,nb_read_frames,r_frame_rate:stream_tags:format=duration','-of','json',fileURLToPath(path)]))
 for(const entry of source){
  const original=new URL(entry.path,root),stem=entry.path.split('/').at(-1).replace(/\.webm$/,'')
  assert.equal(createHash('sha256').update(readFileSync(original)).digest('hex'),entry.sha256,'original changed: '+stem)
  const names=emitted.filter(n=>n.startsWith(stem+'-'));assert.equal(names.length,1)
  const mobile=new URL(names[0],dist),a=inspect(original),b=inspect(mobile),stream=b.streams[0]
  assert.equal(stream.width,720,stem);assert.equal(stream.height,720,stem)
  assert.equal(stream.nb_read_frames,a.streams[0].nb_read_frames,stem)
  assert.equal(stream.r_frame_rate,a.streams[0].r_frame_rate,stem)
  assert.ok(Math.abs(Number(a.format.duration)-Number(b.format.duration))<.002,stem)
  assert.equal(Object.entries(stream.tags).find(([k])=>k.toLowerCase()==='alpha_mode')?.[1],'1',stem)
  const alpha=execFileSync('ffmpeg',['-v','error','-c:v','libvpx-vp9','-i',fileURLToPath(mobile),'-frames:v','1','-vf','alphaextract','-f','rawvideo','-pix_fmt','gray','-'])
  assert.ok(alpha.some(n=>n<8)&&alpha.some(n=>n>180),'alpha pixels lost: '+stem)
 }
})
