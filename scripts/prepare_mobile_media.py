"""Create bounded mobile renditions without changing the original release assets."""
from pathlib import Path
import hashlib
import json
import os
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[1]
WIDTH = 720
SETTINGS = 'vp9-alpha-720-crf24-v1'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,nb_read_frames:stream_tags:format=duration',
        '-of', 'json', str(path),
    ]))


def transcode(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_name(target.stem + '.tmp.webm')
    try:
        subprocess.run([
            'ffmpeg', '-v', 'error', '-nostdin', '-c:v', 'libvpx-vp9', '-i', str(source),
            '-map', '0:v:0', '-map', '0:a?', '-vf', f'scale={WIDTH}:-2:flags=lanczos',
            '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', '24', '-b:v', '0',
            '-row-mt', '1', '-cpu-used', '4', '-threads', '4', '-auto-alt-ref', '0',
            '-c:a', 'copy', '-y', str(temporary),
        ], check=True)
        original, mobile = probe(source), probe(temporary)
        a, b = original['streams'][0], mobile['streams'][0]
        alpha = {k.lower(): v for k, v in b.get('tags', {}).items()}.get('alpha_mode')
        if alpha != '1' or b['width'] != WIDTH or a['nb_read_frames'] != b['nb_read_frames']:
            raise RuntimeError('Mobile rendition lost alpha, frames, or the expected size')
        if abs(float(original['format']['duration']) - float(mobile['format']['duration'])) > .002:
            raise RuntimeError('Mobile rendition changed duration')
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)


def main():
    if os.environ.get('XIAOAZI_ORIGINAL_MEDIA') == '1':
        return
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        raise SystemExit('FFmpeg and ffprobe are required to prepare mobile character videos.')
    entries = json.loads((ROOT / 'runtime-assets.json').read_text())['files']
    output = ROOT / '.cache/mobile-media'
    receipt = output / 'manifest.json'
    previous = json.loads(receipt.read_text()) if receipt.exists() else {}
    verified = {}
    for entry in entries:
        path = entry['path']
        prefix = 'project/src/assets/character/'
        if not path.startswith(prefix) or not path.endswith('.webm'):
            continue
        source, relative = ROOT / path, path.removeprefix(prefix)
        if not source.is_file() or digest(source) != entry['sha256']:
            raise SystemExit('Restore original assets with scripts/fetch_assets.py first: ' + path)
        target, cached = output / relative, previous.get(relative, {})
        if not (cached.get('settings') == SETTINGS and cached.get('sourceSha256') == entry['sha256']
                and target.exists() and cached.get('sha256') == digest(target)):
            print('Preparing mobile video:', relative, flush=True)
            transcode(source, target)
        verified[relative] = {'settings': SETTINGS, 'sourceSha256': entry['sha256'],
                              'sha256': digest(target), 'bytes': target.stat().st_size}
    output.mkdir(parents=True, exist_ok=True)
    receipt.write_text(json.dumps(verified, indent=2) + '\n')
    print('Verified', len(verified), 'mobile character videos; originals and audio retained.')


if __name__ == '__main__':
    main()
