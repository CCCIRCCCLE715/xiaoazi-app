"""Restore the exact runtime resources distributed with this source release."""
from pathlib import Path
import argparse, hashlib, json, shutil, urllib.request, zipfile
ROOT = Path(__file__).resolve().parents[1]
def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()
def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path, help='Use an already downloaded Release ZIP')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'runtime-assets.json').read_text())
    archive = args.archive
    if archive is None:
        cache = ROOT / '.cache'
        cache.mkdir(exist_ok=True)
        archive = cache / 'xiaoazi-runtime-v0.7.10.zip'
        if not archive.exists():
            print('Downloading', manifest['url'], flush=True)
            with urllib.request.urlopen(manifest['url'], timeout=120) as response, archive.open('wb') as output:
                shutil.copyfileobj(response, output)
    if archive.stat().st_size != manifest['bytes'] or digest(archive) != manifest['sha256']:
        raise SystemExit('Resource archive size/SHA256 mismatch; remove it and download again.')
    # The committed allowlist determines every extraction target; ZIP names are never trusted.
    with zipfile.ZipFile(archive) as source:
        for entry in manifest['files']:
            relative = Path(entry['path'])
            if relative.is_absolute() or '..' in relative.parts:
                raise SystemExit('Invalid resource manifest path')
            target = ROOT / relative
            if target.exists() and target.stat().st_size == entry['bytes'] and digest(target) == entry['sha256']:
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with source.open(entry['path']) as content, target.open('wb') as output:
                shutil.copyfileobj(content, output)
            if target.stat().st_size != entry['bytes'] or digest(target) != entry['sha256']:
                raise SystemExit('Resource hash mismatch: ' + entry['path'])
    print('Verified and restored', len(manifest['files']), 'runtime files.')
if __name__ == '__main__':
    main()
