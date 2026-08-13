"""Turn the downloaded essays dump into _data/essays.json for the Jekyll site."""
import json, collections, os, sys
from urllib.parse import urlparse
from tags import TAGS, VOCAB
from additions import EXTRA

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'essays339.json')
OUT = os.path.join(HERE, '..', '_data', 'essays.json')

DROP = {44, 74}  # 44 duplicates 178 (Cactus Person); 74 duplicates 11 (Self-Reliance)

TITLE_FIX = {
    88:  'The Tragedy of the Commons',              # was "— include the criticism with it"
    206: 'Everything Is Fiction',                   # was "— author correction"
    92:  'The Myth of Sisyphus (final chapter)',    # note normalised into a parenthetical
}

BLURB_FIX = {
    # Ends with an aside to the list's compiler, referencing another record by number.
    208: ('Seneca lodges above a bathhouse and catalogues every noise coming through the '
          'floor — grunting weightlifters, the armpit-hair plucker’s clients shrieking — '
          'then argues that the real obstacle to study is internal, not acoustic.'),
}

# Dead links, replaced with copies verified reachable on 2026-08-12.
URL_FIX = {
    7:   'https://interglacial.com/~sburke/pub/prose/Susan_Sontag_-_Notes_on_Camp.html',
    107: 'https://archive.org/details/labyrinthofsolit0000pazo',
    250: 'https://www.neil.blog/articles/david-foster-wallace-nature-of-the-fun',
    259: 'https://nabuckler.wordpress.com/wp-content/uploads/2011/08/the-death-of-the-mothhandout.pdf',
    261: 'https://harpers.org/archive/1998/01/the-wreck-of-time/',
    290: 'http://www.stephenjaygould.org/library/gould_fact-and-theory.html',
}

# Essays that shared one omnibus URL now point at their own page.
URL_FIX.update({
    65:  'https://standardebooks.org/ebooks/seneca/dialogues/aubrey-stewart/text/on-the-shortness-of-life',
    325: 'https://en.wikisource.org/wiki/Of_Peace_of_Mind',
    180: 'https://en.wikisource.org/wiki/The_War_Prayer',
    311: 'https://www.mrfeldkamp.com/uploads/2/3/8/6/23865301/twain_corn_pone_opinions.pdf',
    312: 'https://en.wikisource.org/wiki/To_the_Person_Sitting_in_Darkness',
    323: 'https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_1',
    324: 'https://en.wikisource.org/wiki/Moral_letters_to_Lucilius/Letter_47',
    335: 'https://en.wikisource.org/wiki/Intentions/The_Decay_of_Lying',
    336: 'https://en.wikisource.org/wiki/Intentions/The_Critic_as_Artist',
    337: 'https://en.wikisource.org/wiki/Intentions/Pen,_Pencil,_and_Poison',
})

# The dump attached whole-book counts to single chapters. Verified against the
# linked text: Camus's final chapter runs ~1,600 words, not the book's 40,000.
# Your picks. Put ids here and they get a mark on the row plus their own
# filter. Ids are printed by: python3 _tools/build_essays.py --list
RECOMMENDED = set()

WORDS_FIX = {
    92: 1600,
}

PAYWALL = {
    'nytimes.com', 'newyorker.com', 'theatlantic.com', 'harpers.org', 'lrb.co.uk',
    'nybooks.com', 'wsj.com', 'ft.com', 'economist.com', 'washingtonpost.com',
    'vanityfair.com', 'thecut.com', 'nymag.com', 'vogue.com', 'commentary.org',
    'esquire.com', 'vqronline.org', 'pubmed.ncbi.nlm.nih.gov', 'academia.edu',
    'sweetstudy.com', 'scribd.com',
}

FORM_LABEL = {
    'essay': 'Essay', 'short story': 'Short story', 'speech': 'Speech',
    'lecture': 'Lecture', 'sermon': 'Sermon', 'letter': 'Letter',
    'pamphlet': 'Pamphlet', 'book chapter': 'Book chapter',
    'journal paper': 'Journal paper', 'novella': 'Novella',
    'prose parable': 'Prose parable', 'dialogue': 'Dialogue',
    'broadcast': 'Broadcast', 'book': 'Book', 'poem': 'Poem',
}

LENGTH_LABEL = {
    'under 10 min': 'Under 10 min', '10–20 min': '10–20 min', '20–45 min': '20–45 min',
    '45–90 min': '45–90 min', 'over 90 min': 'Over 90 min', 'unknown': 'Length unknown',
}


# ---------------------------------------------------------------------------
# Reading time
#
# A flat 250 wpm is wrong in two directions. A journal paper in analytic
# philosophy is not read at the speed of a magazine essay, and Bacon's English
# is not read at the speed of Jia Tolentino's. Both slow a real reader down, so
# both lower the effective rate here.
#
# Tune these numbers. They are the whole model.
# ---------------------------------------------------------------------------

BASE_WPM = 250

# Words per minute before the era and subject adjustments.
FORM_WPM = {
    'journal paper': 90,    # dense argument; you stop and re-read paragraphs
    'dialogue':      170,
    'lecture':       200,
    'sermon':        200,
    'book chapter':  220,
    'pamphlet':      220,
    'book':          240,
    'essay':         250,
    'letter':        250,
    'prose parable': 250,
    'novella':       260,
    'short story':   260,
    'speech':        260,
    'broadcast':     260,
    'poem':          100,   # verse does not move at prose speed
}

# Older English costs you time even when the word count is small. This applies
# to what you actually read, so it keys off the prose in front of you: a
# translated Plato reaches you in modern English and takes the milder
# TRANSLATED_FACTOR instead of its own century's penalty.
ERA_FACTOR = {
    'ancient':      0.60,
    '16th century': 0.50,
    '17th century': 0.60,
    '18th century': 0.70,
    '19th century': 0.85,
    '20th century': 1.00,
    '21st century': 1.00,
}

TRANSLATED_FACTOR = 0.90

# Subjects where the sentences carry more load per word.
DENSE_TAGS = {'Philosophy', 'Mind & consciousness'}
DENSE_FACTOR = 0.85


def minutes_for(words, form, century, tags, translated=False):
    """Effective reading time, not word count divided by a constant."""
    if not words:
        return None
    wpm = FORM_WPM.get(form, BASE_WPM)
    wpm *= TRANSLATED_FACTOR if translated else ERA_FACTOR.get(century, 1.0)
    if DENSE_TAGS & set(tags):
        wpm *= DENSE_FACTOR
    # A short lyric is not a one-minute read; you sit with it.
    floor = 2 if form == 'poem' else 1
    return max(floor, round(words / wpm))


def length_of(minutes):
    """The dump's own length labels contradict its minute counts on 87 records,
    so the bucket is derived here rather than trusted."""
    if minutes is None:
        return 'unknown'
    if minutes < 10:
        return 'under 10 min'
    if minutes <= 20:
        return '10–20 min'
    if minutes <= 45:
        return '20–45 min'
    if minutes <= 90:
        return '45–90 min'
    return 'over 90 min'


def year_label(year):
    return f'{abs(year)} BCE' if year < 0 else str(year)


def access_of(url):
    host = urlparse(url).netloc.lower()
    host = host[4:] if host.startswith('www.') else host
    if host == 'archive.org' and '/details/' in url:
        return 'borrow'
    return 'paywall' if host in PAYWALL else 'free'


src = json.load(open(SRC))

# Records added by hand carry their tags as slugs already, so they bypass tags.py.
for extra in EXTRA:
    TAGS.setdefault(extra['id'], extra.pop('tags'))
    extra.setdefault('blurb', '')
    extra.setdefault('section', 'Classical')
src = src + EXTRA

out = []
for d in src:
    if d['id'] in DROP:
        continue
    url = URL_FIX.get(d['id'], d['url'])
    words = WORDS_FIX.get(d['id'], d['words'])
    tags = [VOCAB[t] for t in TAGS[d['id']]]
    minutes = minutes_for(words, d['form'], d['century'], tags, d['translated'])
    out.append({
        'id': d['id'],
        'title': TITLE_FIX.get(d['id'], d['title']),
        'author': d['author'],
        'author_sort': d['author_sort'],
        'year': d['year'],
        'year_label': year_label(d['year']),
        'century': d['century'],
        'form': d['form'],
        'form_label': FORM_LABEL.get(d['form'], d['form'].capitalize()),
        'words': words,
        'words_label': f"{words:,}" if words else None,
        'minutes': minutes,
        'length': length_of(minutes),
        'length_label': LENGTH_LABEL[length_of(minutes)],
        'url': url,
        'alt_urls': d['alt_urls'],
        'access': access_of(url),
        'gender': d['gender'],
        'native_language': d['native_language'],
        'wrote_in': d['wrote_in'],
        'nationality': d['nationality'],
        'author_born': d['author_born'],
        'author_died': d['author_died'],
        'author_living': d['author_living'],
        'translated': d['translated'],
        'tags': tags,
        'blurb': BLURB_FIX.get(d['id'], d['blurb']),
        'club_read': d['read_by_club'],
        'recommended': d['id'] in RECOMMENDED,
    })

if '--list' in sys.argv:
    for r in sorted(out, key=lambda r: r['author_sort']):
        print(f"{r['id']:>4}  {r['author'][:22]:<24}{r['title'][:60]}")
    raise SystemExit

out.sort(key=lambda r: r['year'])
json.dump(out, open(OUT, 'w'), ensure_ascii=False, indent=1)

print(f'wrote {len(out)} records to {OUT}')
print('\naccess:', dict(collections.Counter(r['access'] for r in out)))
print('urls changed:', len(URL_FIX), '| titles fixed:', len(TITLE_FIX), '| dropped:', len(DROP))
print('duplicate urls remaining:',
      sum(1 for u, n in collections.Counter(r['url'] for r in out).items() if n > 1))
print('\ntags:')
for t, n in collections.Counter(x for r in out for x in r['tags']).most_common():
    print(f'  {n:4d}  {t}')
