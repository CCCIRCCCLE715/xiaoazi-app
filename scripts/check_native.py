from pathlib import Path
import json,subprocess,os,re
out=Path(__file__).resolve().parents[1]
sdk=Path(os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT') or '')
jdk=Path(os.environ['JAVA_HOME'])/'bin' if os.environ.get('JAVA_HOME') else Path(__import__('shutil').which('javac')).parent
platform=Path(os.environ.get('ANDROID_PLATFORM_JAR', str(sdk/'platforms/android-35/android.jar')))
classes=out/'qa/native-test-classes';classes.mkdir(parents=True,exist_ok=True)
sources=sorted((out/'android/tests').glob('*.java'));cp=os.pathsep.join(map(str,[out/'android/build/classes',platform,out/'sensevoice/sherpa-onnx-jvm-2.0.0.jar']))
p=subprocess.run([str(jdk/('javac.exe' if os.name=='nt' else 'javac')),'-classpath',cp,'-d',str(classes),*map(str,sources)],text=True,capture_output=True);(out/'qa/native-test-compile.log').write_text(p.stdout+p.stderr);assert p.returncode==0
results=[];skipped=['ModelHttpsTest','DocumentAnalysisContractTest']
for source in sources:
 if source.stem in skipped:continue
 text=source.read_text();package=re.search(r'^package ([\w.]+);',text,re.M);name=(package[1]+'.' if package else '')+source.stem
 result=subprocess.run([str(jdk/('java.exe' if os.name=='nt' else 'java')),'-cp',os.pathsep.join([str(classes),cp]),name],text=True,capture_output=True)
 assert result.returncode==0,(name,result.stdout,result.stderr)
 results.append({'test':name,'output':result.stdout.strip()})
report={'productionSourcesCompiledByApkBuilder':len(list((out/'android/src').glob('**/*.java'))),'testSourcesCompiled':len(sources),'passedGroups':len(results),'tests':results,'skipped':{'ModelHttpsTest':'Requires real network/service environment.','DocumentAnalysisContractTest':'Requires Android JSONObject runtime.'},'deviceTested':False}
(out/'qa/native-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False))
