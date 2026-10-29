from pathlib import Path
import subprocess, shutil, zipfile, hashlib, json, os, re
import xml.etree.ElementTree as ET
root=Path(__file__).resolve().parents[1]
sdk=Path(os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT') or '')
if not Path(os.environ.get('ANDROID_PLATFORM_JAR', str(sdk/'platforms/android-35/android.jar'))).is_file():
    raise SystemExit('Set ANDROID_HOME to an SDK with platforms;android-35 and build-tools;35.0.0')
jdk=Path(os.environ['JAVA_HOME'])/'bin' if os.environ.get('JAVA_HOME') else Path(shutil.which('javac')).parent
bt=Path(os.environ['ANDROID_BUILD_TOOLS']) if os.environ.get('ANDROID_BUILD_TOOLS') else sdk/'build-tools/35.0.0'
platform=Path(os.environ.get('ANDROID_PLATFORM_JAR', str(sdk/'platforms/android-35/android.jar')))
java=jdk/('java.exe' if os.name=='nt' else 'java')
javac=jdk/('javac.exe' if os.name=='nt' else 'javac')
aapt2=bt/('aapt2.exe' if os.name=='nt' else 'aapt2')
zipalign=bt/('zipalign.exe' if os.name=='nt' else 'zipalign')
android=root/'android'; build=android/'build';build.mkdir(exist_ok=True)
ns='http://schemas.android.com/apk/res/android'
ET.register_namespace('android',ns)
manifest=android/'AndroidManifest.xml'
tree=ET.parse(manifest);document=tree.getroot()
version_code=document.attrib[f'{{{ns}}}versionCode'];version_name=document.attrib[f'{{{ns}}}versionName']
application_id=document.attrib['package']
verification=os.environ.get('XIAOAZI_TEST_BUILD')=='1'
if verification:
    original_id=application_id;application_id+='.verification';document.set('package',application_id)
    app=document.find('application');app.set(f'{{{ns}}}label','小 A 子·验证版');app.set(f'{{{ns}}}debuggable','true')
    for activity in app.findall('activity'):
        name=activity.get(f'{{{ns}}}name')
        if name.startswith('.'):activity.set(f'{{{ns}}}name',original_id+name)
    manifest=build/'verification-manifest.xml';tree.write(manifest,encoding='utf-8',xml_declaration=True)
artifact_name=f'xiaoazi-{version_name}'+('-verification' if verification else '')
web=root/'project/dist-standalone'
assert (web/'index.html').is_file(), 'Build frontend first'
def clone_file(source,dest):
    return shutil.copyfile(source,dest)
assets=build/'assets';shutil.rmtree(assets,ignore_errors=True);shutil.copytree(web,assets/'web',copy_function=clone_file)
sensevoice=root/'sensevoice'
model=sensevoice/'model/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17'
model_manifest=json.loads((sensevoice/'manifest.json').read_text())
libs=[sensevoice/'sherpa-onnx-jvm-2.0.0.jar']
assert hashlib.sha256(libs[0].read_bytes()).hexdigest()==model_manifest['nativeJavaAPI']['sha256']
classes=build/'classes';shutil.rmtree(classes,ignore_errors=True);classes.mkdir()
def run(*args):
    subprocess.run([str(a) for a in args],check=True)
run(javac,'--release','8','-classpath',os.pathsep.join(str(p) for p in [platform,*libs]),'-d',classes,*sorted((android/'src').rglob('*.java')))
classes_jar=build/'classes.jar'
with zipfile.ZipFile(classes_jar,'w') as z:
    for p in sorted(classes.rglob('*.class')):z.write(p,p.relative_to(classes).as_posix())
dex=build/'dex';shutil.rmtree(dex,ignore_errors=True);dex.mkdir()
run(java,'-cp',bt/'lib/d8.jar','com.android.tools.r8.D8','--min-api','26','--lib',platform,'--output',dex,classes_jar,*libs)
offline=assets/'sensevoice';offline.mkdir()
for entry in model_manifest['bundled']:
    source=model/entry['name'];assert source.stat().st_size==entry['bytes'] and hashlib.sha256(source.read_bytes()).hexdigest()==entry['sha256']
    clone_file(source,offline/entry['name'])
licenses=assets/'licenses';licenses.mkdir()
for name in ['SHERPA-LICENSE','ONNXRUNTIME-LICENSE','SENSEVOICE-UPSTREAM-LICENSE','FUNASR-MODEL-LICENSE','SILERO-LICENSE','manifest.json']:shutil.copy2(sensevoice/name,licenses/name)
shutil.copy2(model/'LICENSE',licenses/'model-archive-LICENSE');shutil.copy2(model/'README.md',licenses/'model-archive-README')
res=build/'resources.zip'
run(aapt2,'compile','--dir',android/'res','-o',res)
raw=build/'unsigned.apk'
run(aapt2,'link','-o',raw,'-I',platform,'--manifest',manifest,'--min-sdk-version','26','--target-sdk-version','35','--version-code',version_code,'--version-name',version_name,'-A',assets,'-0','wav','-0','mp3','-0','m4a','-0','mp4','-0','webm','-0','png','-0','webp','-0','html','-0','js','-0','mjs','-0','bcmap','-0','txt','-0','json','-0','css','-0','svg','-0','onnx','-0','zip',res)
with zipfile.ZipFile(raw,'a') as z:
    for path in sorted(dex.glob('*.dex')):z.write(path,path.name)
    for abi in ['arm64-v8a']:
        for library in ['libsherpa-onnx-jni.so','libonnxruntime.so']:
            path=sensevoice/'android-runtime/jni'/abi/library
            assert path.is_file()
            z.write(path,f'lib/{abi}/{library}',compress_type=zipfile.ZIP_DEFLATED)

# Only InputStream-loaded models/tokens may be compressed. Web openFd/Range requires STORED.
compressed=build/'model-deflated.apk'
model_assets={e['asset'] for e in model_manifest['bundled']}
with zipfile.ZipFile(raw) as source,zipfile.ZipFile(compressed,'w') as dest:
    for info in source.infolist():
        data=source.read(info.filename)
        if info.filename in model_assets:info.compress_type=zipfile.ZIP_DEFLATED
        dest.writestr(info,data,compress_type=info.compress_type,compresslevel=6 if info.compress_type==zipfile.ZIP_DEFLATED else None)
raw.unlink() # Only this invocation's generated uncompressed APK.
raw=compressed
aligned=build/'aligned.apk'
run(zipalign,'-f','4',raw,aligned)
raw.unlink() # Aligned intermediate is now the sole signing input.
out=build/(artifact_name+'-unsigned.apk')
shutil.move(aligned,out)
key=os.environ.get('XIAOAZI_KEYSTORE')
if key:
    signed=build/(artifact_name+'-signed.apk')
    run(java,'-jar',bt/'lib/apksigner.jar','sign','--ks',key,'--ks-key-alias',os.environ['XIAOAZI_KEY_ALIAS'],'--ks-pass','env:XIAOAZI_STORE_PASSWORD','--key-pass','env:XIAOAZI_KEY_PASSWORD','--min-sdk-version','26','--v4-signing-enabled','false','--out',signed,out)
    run(java,'-jar',bt/'lib/apksigner.jar','verify','--verbose',signed)
    out=signed
run(zipalign,'-c','4',out)
with zipfile.ZipFile(out) as z:
    assert z.testzip() is None
    names=z.namelist()
    assert not any('vosk' in n.lower() or 'jnidispatch' in n.lower() for n in names), 'No system/Vosk fallback in v26 APK'
    for entry in model_manifest['bundled']:
        assert hashlib.sha256(z.read(entry['asset'])).hexdigest()==entry['sha256']
        assert z.getinfo(entry['asset']).compress_type==zipfile.ZIP_DEFLATED
    for abi in ['arm64-v8a']:
        for library in ['libsherpa-onnx-jni.so','libonnxruntime.so']:
            assert hashlib.sha256(z.read(f'lib/{abi}/{library}')).digest()==hashlib.sha256((sensevoice/'android-runtime/jni'/abi/library).read_bytes()).digest()
    assert 'AndroidManifest.xml' in names and 'classes.dex' in names and 'assets/web/index.html' in names
    assert not any(any(x in n.lower() for x in ['keystore','signing/','source-export','.env','apk-blockers']) for n in names)
    for n in names:
        if n.startswith('assets/web/'):assert z.getinfo(n).compress_type==zipfile.ZIP_STORED,n
badging=subprocess.check_output([str(aapt2),'dump','badging',str(out)],text=True)
identity=re.search(r"package: name='([^']+)' versionCode='([^']+)' versionName='([^']+)'",badging)
assert identity and identity.groups()==(application_id,version_code,version_name)
assert "minSdkVersion:'26'" in badging and "targetSdkVersion:'35'" in badging
metadata={'applicationId':identity[1],'versionName':identity[3],'versionCode':int(identity[2]),'apk':out.name,'bytes':out.stat().st_size,'sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'signed':bool(key),'verificationBuild':verification,'physicalDeviceVerified':False}
(build/'apk-metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
print(json.dumps(metadata,indent=2))
