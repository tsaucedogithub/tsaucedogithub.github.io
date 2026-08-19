"""Load and validate the Blue Book canon (_data/blue_book.yml).

PyYAML is not installed on this machine and the site must stay dependency-free,
so YAML is parsed by PyYAML if present, else by a Ruby one-liner (Ruby ships
with the Jekyll toolchain). Returns plain dicts.
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PATH = os.path.normpath(os.path.join(HERE, '..', '..', '_data', 'blue_book.yml'))
REQUIRED_BOOK = ('id', 'title', 'author', 'year', 'passages')
REQUIRED_PASSAGE = ('text', 'locus', 'difficulty')
MAIN_DEFAULTS = {'window': 2, 'form': 'novel', 'aliases': []}


class CanonError(Exception):
    pass


def _load_yaml(path):
    try:
        import yaml  # type: ignore
        with open(path, encoding='utf-8') as f:
            return yaml.safe_load(f)
    except ImportError:
        code = "require 'yaml'; require 'json'; puts JSON.generate(YAML.safe_load(File.read(ARGV[0]), permitted_classes: [], aliases: false))"
        out = subprocess.run(['ruby', '-e', code, path], capture_output=True, text=True)
        if out.returncode != 0:
            raise CanonError('ruby yaml load failed: ' + out.stderr.strip())
        return json.loads(out.stdout)


def validate(books):
    if not isinstance(books, list):
        raise CanonError('canon must be a list of books')
    seen = set()
    for b in books:
        for k in REQUIRED_BOOK:
            if k not in b:
                raise CanonError(f"book {b.get('id', '?')!r} missing {k!r}")
        if b['id'] in seen:
            raise CanonError(f"duplicate book id {b['id']!r}")
        seen.add(b['id'])
        if not isinstance(b['year'], int):
            raise CanonError(f"book {b['id']!r}: year must be an integer")
        if not b['passages']:
            raise CanonError(f"book {b['id']!r}: needs at least one passage")
        for p in b['passages']:
            for k in REQUIRED_PASSAGE:
                if k not in p:
                    raise CanonError(f"book {b['id']!r}: passage missing {k!r}")
        if 'famous' in b and 'text' not in b['famous']:
            raise CanonError(f"book {b['id']!r}: famous needs text")
    return books


def apply_defaults(books):
    pids = set()
    for b in books:
        for k, v in MAIN_DEFAULTS.items():
            b.setdefault(k, list(v) if isinstance(v, list) else v)
        for i, p in enumerate(b['passages'], 1):
            p.setdefault('id', f"{b['id']}-{i}")
            if p['id'] in pids:
                raise CanonError(f"duplicate passage id {p['id']!r}")
            pids.add(p['id'])
        if 'famous' in b:
            b['famous'].setdefault('id', f"{b['id']}-famous")
    return books


def load_canon(path=None):
    return apply_defaults(validate(_load_yaml(path or DEFAULT_PATH)))


def all_passages(books):
    """Main passages only (the ones the schedule rotates), each with a 'book' back-reference."""
    out = []
    for b in books:
        for p in b['passages']:
            q = dict(p)
            q['book'] = b
            out.append(q)
    return out
