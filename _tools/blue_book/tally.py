"""Tally books across the source lists in lists/*.tsv.

Reads every lists/*.tsv, normalises title + author into a key, counts how many
lists each book appears on, and writes:
  tally.tsv        machine view: key, best title, best author, count, lists
  candidates.md    human view for cutting: a table sorted by count
Also prints same-author near-duplicate keys so ALIASES can be extended.

Run: python3 _tools/blue_book/tally.py
"""
import collections, glob, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
LISTS = sorted(glob.glob(os.path.join(HERE, 'lists', '*.tsv')))

# Manual merges. Left side is the automatically computed key; right side is
# the key it should collapse into. Add here when the near-duplicate report
# shows the same book under two keys.
ALIASES = {
    ('fairy tales and stories', 'andersen'): ('fairy tales', 'andersen'),
    ('alices adventures in wonderland and through the looking glass', 'carroll'): ('alices adventures in wonderland', 'carroll'),
    ('alice in wonderland', 'carroll'): ('alices adventures in wonderland', 'carroll'),
    ('journey to the end of night', 'celine'): ('journey to the end of the night', 'celine'),
    ('stories of anton chekhov', 'chekhov'): ('stories', 'chekhov'),
    ('complete sherlock holmes', 'doyle'): ('adventures of sherlock holmes', 'doyle'),
    ('sound and fury', 'faulkner'): ('sound and the fury', 'faulkner'),
    ('faust parts 1 and 2', 'goethe'): ('faust', 'goethe'),
    ('complete stories of franz kafka', 'kafka'): ('stories', 'kafka'),
    ('tale of the genji', 'murasaki'): ('tale of genji', 'murasaki'),
    ('complete poems and tales of edgar allen poe', 'poe'): ('tales', 'poe'),
    ('nineteen eighty four', 'orwell'): ('1984', 'orwell'),
    ('nineteen eighty-four', 'orwell'): ('1984', 'orwell'),
    ('life of samuel johnson ll d', 'boswell'): ('life of samuel johnson', 'boswell'),
    ('life of samuel johnson lld', 'boswell'): ('life of samuel johnson', 'boswell'),
    ('history of don quixote de la mancha', 'cervantes'): ('don quixote', 'cervantes'),
    ('origin of species by means of natural selection', 'darwin'): ('on the origin of species', 'darwin'),
    ('origin of species', 'darwin'): ('on the origin of species', 'darwin'),
    ('history of tom jones a foundling', 'fielding'): ('tom jones', 'fielding'),
    ('history of the decline and fall of the roman empire', 'gibbon'): ('decline and fall of the roman empire', 'gibbon'),
    ('dangerous liaison', 'laclos'): ('dangerous liaisons', 'laclos'),
    ('u s a trilogy', 'passos'): ('u s a', 'passos'),
    ('complete tales and poems of edgar allan poe', 'poe'): ('tales', 'poe'),
    ('tragedy of hamlet prince of denmark', 'shakespeare'): ('hamlet', 'shakespeare'),
    ('othello the moor of venice', 'shakespeare'): ('othello', 'shakespeare'),
    ('inquiry into the nature and causes of the wealth of nations', 'smith'): ('wealth of nations', 'smith'),
    ('life and opinions of tristram shandy gentleman', 'sterne'): ('tristram shandy', 'sterne'),
    ('life and opinions of tristram shandy', 'sterne'): ('tristram shandy', 'sterne'),
    ('strange case of doctor jekyll and mister hyde', 'stevenson'): ('doctor jekyll and mister hyde', 'stevenson'),
    ('huckleberry finn', 'twain'): ('adventures of huckleberry finn', 'twain'),
    ('mahabharata', ''): ('mahabharata', 'vyasa'),
    ('ramayana', ''): ('ramayana', 'valmiki'),
    ('king james bible', ''): ('bible', ''),
    ('holy bible', ''): ('bible', ''),
    ('arabian nights', ''): ('one thousand and one nights', ''),
    ('thousand and one nights', ''): ('one thousand and one nights', ''),
    ('1001 nights', ''): ('one thousand and one nights', ''),
    ('anne frank', 'frank'): ('diary of a young girl', 'frank'),
    ('diary of anne frank', 'frank'): ('diary of a young girl', 'frank'),
    ('federalist', 'jay'): ('federalist papers', 'publius'),
    ('federalist', 'publius'): ('federalist papers', 'publius'),
    ('inferno', 'dante'): ('divine comedy', 'dante'),
    ('inferno', 'alighieri'): ('divine comedy', 'alighieri'),
    ('manifesto of the communist party', 'marx'): ('communist manifesto', 'marx'),
    ('history', 'herodotus'): ('histories', 'herodotus'),
    ('meditations', 'aurelius'): ('meditations', 'aurelius'),
    ('fictions', 'borges'): ('ficciones', 'borges'),
    ('collected fiction', 'borges'): ('ficciones', 'borges'),
    ('outsider', 'camus'): ('stranger', 'camus'),
    ('madame bovery', 'flaubert'): ('madame bovary', 'flaubert'),
    ('usa', 'passos'): ('u s a', 'passos'),
    ('metamorphosis', 'ovid'): ('metamorphoses', 'ovid'),
    ('possessed', 'dostoevsky'): ('demons', 'dostoevsky'),
    ('illiad', 'homer'): ('iliad', 'homer'),
    ('death of ivan ilyich and other stories', 'tolstoy'): ('death of ivan ilyich', 'tolstoy'),
    ('death of ivan ilych', 'tolstoy'): ('death of ivan ilyich', 'tolstoy'),
    ('fairy tales of the brothers grimm', 'grimm'): ('grimms fairy tales', 'grimm'),
    ('fairy tales', 'grimm'): ('grimms fairy tales', 'grimm'),
    ('wonderful wizard of oz', 'baum'): ('wizard of oz', 'baum'),
    ('adventures of pinocchio', 'collodi'): ('pinocchio', 'collodi'),
    ('good soldier schweik', 'hasek'): ('good soldier svejk', 'hasek'),
    ('20 000 leagues under the sea', 'verne'): ('twenty thousand leagues under the sea', 'verne'),
    ('20000 leagues under the sea', 'verne'): ('twenty thousand leagues under the sea', 'verne'),
    ('notre dame de paris', 'hugo'): ('hunchback of notre dame', 'hugo'),
    ('scarlet and black', 'stendhal'): ('red and the black', 'stendhal'),
    ('zenos conscience', 'svevo'): ('confessions of zeno', 'svevo'),
    ('survival in auschwitz', 'levi'): ('if this is a man', 'levi'),
    ('notes from the underground', 'dostoevsky'): ('notes from underground', 'dostoevsky'),
    ('fathers and children', 'turgenev'): ('fathers and sons', 'turgenev'),
    ('yevgeny onegin', 'pushkin'): ('eugene onegin', 'pushkin'),
    ('father goriot', 'balzac'): ('pere goriot', 'balzac'),
    ('old goriot', 'balzac'): ('pere goriot', 'balzac'),
    ('quiet flows the don', 'sholokhov'): ('and quiet flows the don', 'sholokhov'),
    ('if on a winters night a traveler', 'calvino'): ('if on a winters night a traveller', 'calvino'),
}

# Recognisable non-novel classics that novel-centric lists under-count.
# (title key, display title, display author). Shown in candidates.md as an
# appendix with their tally counts, only when the count is 0 or 1.
SUGGESTED = [
    ('communist manifesto', 'The Communist Manifesto', 'Karl Marx and Friedrich Engels'),
    ('capital', 'Das Kapital', 'Karl Marx'),
    ('symposium', 'Symposium', 'Plato'),
    ('apology', 'Apology', 'Plato'),
    ('nicomachean ethics', 'Nicomachean Ethics', 'Aristotle'),
    ('poetics', 'Poetics', 'Aristotle'),
    ('politics', 'Politics', 'Aristotle'),
    ('meditations', 'Meditations', 'Marcus Aurelius'),
    ('utopia', 'Utopia', 'Thomas More'),
    ('thus spoke zarathustra', 'Thus Spoke Zarathustra', 'Friedrich Nietzsche'),
    ('beyond good and evil', 'Beyond Good and Evil', 'Friedrich Nietzsche'),
    ('genealogy of morals', 'On the Genealogy of Morals', 'Friedrich Nietzsche'),
    ('social contract', 'The Social Contract', 'Jean-Jacques Rousseau'),
    ('art of war', 'The Art of War', 'Sun Tzu'),
    ('tao te ching', 'Tao Te Ching', 'Laozi'),
    ('analects', 'The Analects', 'Confucius'),
    ('histories', 'The Histories', 'Herodotus'),
    ('history of the peloponnesian war', 'History of the Peloponnesian War', 'Thucydides'),
    ('lives', "Plutarch's Lives", 'Plutarch'),
    ('on the nature of things', 'On the Nature of Things', 'Lucretius'),
    ('summa theologica', 'Summa Theologica', 'Thomas Aquinas'),
    ('discourse on method', 'Discourse on the Method', 'René Descartes'),
    ('meditations on first philosophy', 'Meditations on First Philosophy', 'René Descartes'),
    ('pensees', 'Pensées', 'Blaise Pascal'),
    ('two treatises of government', 'Two Treatises of Government', 'John Locke'),
    ('mathematical principles of natural philosophy', 'Principia', 'Isaac Newton'),
    ('critique of pure reason', 'Critique of Pure Reason', 'Immanuel Kant'),
    ('wealth of nations', 'The Wealth of Nations', 'Adam Smith'),
    ('common sense', 'Common Sense', 'Thomas Paine'),
    ('rights of man', 'Rights of Man', 'Thomas Paine'),
    ('vindication of the rights of woman', 'A Vindication of the Rights of Woman', 'Mary Wollstonecraft'),
    ('federalist papers', 'The Federalist Papers', 'Hamilton, Madison, Jay'),
    ('democracy in america', 'Democracy in America', 'Alexis de Tocqueville'),
    ('narrative of the life of frederick douglass an american slave', 'Narrative of the Life of Frederick Douglass', 'Frederick Douglass'),
    ('self reliance', 'Self-Reliance', 'Ralph Waldo Emerson'),
    ('civil disobedience', 'Civil Disobedience', 'Henry David Thoreau'),
    ('elements', "Euclid's Elements", 'Euclid'),
    ('relativity', 'Relativity', 'Albert Einstein'),
    ('feminine mystique', 'The Feminine Mystique', 'Betty Friedan'),
    ('autobiography of malcolm x', 'The Autobiography of Malcolm X', 'Malcolm X and Alex Haley'),
    ('bhagavad gita', 'Bhagavad Gita', ''),
    ('epic of gilgamesh', 'The Epic of Gilgamesh', ''),
    ('beowulf', 'Beowulf', ''),
    ('mahabharata', 'Mahabharata', 'Vyasa'),
    ('ramayana', 'Ramayana', 'Valmiki'),
    ('song of roland', 'The Song of Roland', ''),
    ('sir gawain and the green knight', 'Sir Gawain and the Green Knight', ''),
    ('le morte darthur', "Le Morte d'Arthur", 'Thomas Malory'),
    ('journey to the west', 'Journey to the West', "Wu Cheng'en"),
    ('dream of the red chamber', 'Dream of the Red Chamber', 'Cao Xueqin'),
    ('romance of the three kingdoms', 'Romance of the Three Kingdoms', 'Luo Guanzhong'),
    ('oresteia', 'The Oresteia', 'Aeschylus'),
    ('agamemnon', 'Agamemnon', 'Aeschylus'),
    ('prometheus bound', 'Prometheus Bound', 'Aeschylus'),
    ('bacchae', 'The Bacchae', 'Euripides'),
    ('trojan women', 'The Trojan Women', 'Euripides'),
    ('electra', 'Electra', 'Sophocles'),
    ('lysistrata', 'Lysistrata', 'Aristophanes'),
    ('clouds', 'The Clouds', 'Aristophanes'),
    ('romeo and juliet', 'Romeo and Juliet', 'William Shakespeare'),
    ('othello', 'Othello', 'William Shakespeare'),
    ('julius caesar', 'Julius Caesar', 'William Shakespeare'),
    ('tempest', 'The Tempest', 'William Shakespeare'),
    ('midsummer nights dream', "A Midsummer Night's Dream", 'William Shakespeare'),
    ('merchant of venice', 'The Merchant of Venice', 'William Shakespeare'),
    ('twelfth night', 'Twelfth Night', 'William Shakespeare'),
    ('much ado about nothing', 'Much Ado About Nothing', 'William Shakespeare'),
    ('taming of the shrew', 'The Taming of the Shrew', 'William Shakespeare'),
    ('richard iii', 'Richard III', 'William Shakespeare'),
    ('henry v', 'Henry V', 'William Shakespeare'),
    ('doctor faustus', 'Doctor Faustus', 'Christopher Marlowe'),
    ('tartuffe', 'Tartuffe', 'Molière'),
    ('misanthrope', 'The Misanthrope', 'Molière'),
    ('phaedra', 'Phèdre', 'Jean Racine'),
    ('cyrano de bergerac', 'Cyrano de Bergerac', 'Edmond Rostand'),
    ('hedda gabler', 'Hedda Gabler', 'Henrik Ibsen'),
    ('importance of being earnest', 'The Importance of Being Earnest', 'Oscar Wilde'),
    ('cherry orchard', 'The Cherry Orchard', 'Anton Chekhov'),
    ('three sisters', 'Three Sisters', 'Anton Chekhov'),
    ('seagull', 'The Seagull', 'Anton Chekhov'),
    ('uncle vanya', 'Uncle Vanya', 'Anton Chekhov'),
    ('pygmalion', 'Pygmalion', 'George Bernard Shaw'),
    ('death of a salesman', 'Death of a Salesman', 'Arthur Miller'),
    ('crucible', 'The Crucible', 'Arthur Miller'),
    ('streetcar named desire', 'A Streetcar Named Desire', 'Tennessee Williams'),
    ('glass menagerie', 'The Glass Menagerie', 'Tennessee Williams'),
    ('cat on a hot tin roof', 'Cat on a Hot Tin Roof', 'Tennessee Williams'),
    ('long days journey into night', "Long Day's Journey into Night", "Eugene O'Neill"),
    ('whos afraid of virginia woolf', "Who's Afraid of Virginia Woolf?", 'Edward Albee'),
    ('rosencrantz and guildenstern are dead', 'Rosencrantz and Guildenstern Are Dead', 'Tom Stoppard'),
    ('threepenny opera', 'The Threepenny Opera', 'Bertolt Brecht'),
    ('mother courage and her children', 'Mother Courage and Her Children', 'Bertolt Brecht'),
    ('six characters in search of an author', 'Six Characters in Search of an Author', 'Luigi Pirandello'),
    ('no exit', 'No Exit', 'Jean-Paul Sartre'),
    ('raisin in the sun', 'A Raisin in the Sun', 'Lorraine Hansberry'),
    ('angels in america', 'Angels in America', 'Tony Kushner'),
    ('fences', 'Fences', 'August Wilson'),
]

# Whole-series entries collapse into one key. Applied by prefix on the title key.
SERIES = {
    ('harry potter', 'rowling'): 'harry potter',
    ('lord of the rings', 'tolkien'): 'lord of the rings',
    ('fellowship of the ring', 'tolkien'): 'lord of the rings',
    ('two towers', 'tolkien'): 'lord of the rings',
    ('return of the king', 'tolkien'): 'lord of the rings',
    ('chronicles of narnia', 'lewis'): 'chronicles of narnia',
    ('lion the witch and the wardrobe', 'lewis'): 'chronicles of narnia',
    ('his dark materials', 'pullman'): 'his dark materials',
    ('northern lights', 'pullman'): 'his dark materials',
    ('golden compass', 'pullman'): 'his dark materials',
    ('in search of lost time', 'proust'): 'in search of lost time',
    ('remembrance of things past', 'proust'): 'in search of lost time',
    ('swanns way', 'proust'): 'in search of lost time',
    ('hunger games', 'collins'): 'hunger games',
    ('catching fire', 'collins'): 'hunger games',
    ('mockingjay', 'collins'): 'hunger games',
}
DISPLAY = {
    'harry potter': 'Harry Potter (series)',
    'lord of the rings': 'The Lord of the Rings',
    'chronicles of narnia': 'The Chronicles of Narnia',
    'his dark materials': 'His Dark Materials',
    'in search of lost time': 'In Search of Lost Time',
    'hunger games': 'The Hunger Games (series)',
    '1984': '1984',
    'u s a': 'U.S.A.',
}


AUTHOR_ALIASES = {
    'dostoyevsky': 'dostoevsky', 'dostoievski': 'dostoevsky',
    'saavedra': 'cervantes',
    'garcia marquez': 'marquez', 'garcía márquez': 'marquez',
    'vergil': 'virgil',
    'tzu': 'laozi', 'lao-tzu': 'laozi', 'laotzu': 'laozi',
    'shikibu': 'murasaki',
    'anonymous': '', 'anon': '', 'unknown': '', 'various': '',
    'grimm': 'grimm', 'brothers': 'grimm',
    'thackeray': 'thackeray',
    'de beauvoir': 'beauvoir',
    'du maurier': 'maurier',
    'le guin': 'guin',
    'st augustine': 'augustine', 'st. augustine': 'augustine',
    'hippo': 'augustine',
    'aquinas': 'aquinas',
    'eliot': 'eliot',
    'stowe': 'stowe',
    'sade': 'sade',
    'assisi': 'francis',
    'the elder': 'pliny',
    'pere': 'dumas', 'boccacio': 'boccaccio', 'cerventes': 'cervantes', 'hemmingway': 'hemingway',
    'groszman': 'grossman', 'nabakov': 'nabokov', 'nabakoz': 'nabokov', 'tolkein': 'tolkien',
    'stern': 'sterne', 'bronte': 'bronte', 'marquez': 'marquez',
}
AUTHOR_ALIASES.update({'alighieri': 'dante', 'engels': 'marx', 'x': 'malcolm x', 'haley': 'malcolm x'})

ARTICLES = ('the ', 'a ', 'an ', 'le ', 'la ', 'les ', 'il ', 'lo ', 'el ', 'los ', 'las ', 'der ', 'die ', 'das ')

def strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))

SPELLINGS = {'honour': 'honor', 'colour': 'color', 'grey': 'gray', 'travelling': 'traveling', 'traveller': 'traveler', 'dr': 'doctor', 'mr': 'mister', 'mrs': 'missus'}

def norm_title(t):
    t = strip_accents(t).lower().strip()
    t = re.sub(r'\s*[\(\[].*?[\)\]]', '', t)   # drop parentheticals
    t = re.sub(r',\s*(the|a|an)\s*$', '', t)      # "Great Gatsby, The" → "great gatsby"
    t = t.replace('&', ' and ')
    for k, v in SPELLINGS.items():
        t = re.sub(r'\b' + k + r'\b', v, t)
    t = re.sub(r"[’‘']", '', t)                # don't → dont, alice's → alices
    t = re.split(r'\s*[:;]\s*|\s+or,?\s+', t)[0]  # drop subtitles ("Moby-Dick; or, The Whale")
    t = re.sub(r'[^a-z0-9 ]+', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip()
    for a in ARTICLES:
        if t.startswith(a):
            t = t[len(a):]
            break
    return t

def norm_author(a):
    a = strip_accents(a).lower().strip()
    a = re.sub(r'\(.*?\)', '', a)
    a = re.sub(r'[^a-z\- ]+', ' ', a)
    a = re.sub(r'\s+', ' ', a).strip()
    if not a:
        return ''
    # "Last, First" → last
    if ',' in a:
        return AUTHOR_ALIASES.get(a.split(',')[0].strip(), a.split(',')[0].strip())
    parts = a.split(' ')
    # two-word surnames we want to keep together
    for n in (2,):
        tail = ' '.join(parts[-n:])
        if tail in AUTHOR_ALIASES:
            return AUTHOR_ALIASES[tail]
    last = parts[-1]
    if last in ('jr', 'sr', 'jr.', 'iii') and len(parts) > 1:
        last = parts[-2]
    return AUTHOR_ALIASES.get(last, last)

def load():
    books = collections.defaultdict(lambda: {'titles': collections.Counter(), 'authors': collections.Counter(), 'lists': set(), 'years': collections.Counter()})
    listnames = []
    for path in LISTS:
        name = os.path.splitext(os.path.basename(path))[0]
        listnames.append(name)
        seen_in_list = set()
        with open(path, encoding='utf-8') as f:
            for line in f:
                line = line.rstrip('\n')
                if not line or line.startswith('#'):
                    continue
                cols = line.split('\t')
                while len(cols) < 3:
                    cols.append('')
                title, author, year = cols[0].strip(), cols[1].strip(), cols[2].strip()
                if not title:
                    continue
                key = (norm_title(title), norm_author(author))
                key = ALIASES.get(key, key)
                for (pref, auth), target in SERIES.items():
                    if key[1] == auth and key[0].startswith(pref):
                        key = (target, auth)
                        break
                if key in seen_in_list:
                    continue
                seen_in_list.add(key)
                b = books[key]
                b['titles'][title] += 1
                if author:
                    b['authors'][author] += 1
                if year:
                    b['years'][year] += 1
                b['lists'].add(name)
    return books, listnames

def near_dupes(books):
    """Same author key, similar title keys → print for manual aliasing."""
    by_author = collections.defaultdict(list)
    for (t, a) in books:
        by_author[a].append(t)
    out = []
    for a, titles in by_author.items():
        if not a or len(titles) < 2:
            continue
        for i in range(len(titles)):
            for j in range(i + 1, len(titles)):
                x, y = titles[i], titles[j]
                xs, ys = set(x.split()), set(y.split())
                if not xs or not ys:
                    continue
                overlap = len(xs & ys) / min(len(xs), len(ys))
                if x in y or y in x or overlap >= 0.6:
                    out.append((a, x, y))
    return out

def main():
    books, listnames = load()
    rows = []
    for key, b in books.items():
        top = max(b['titles'].values())
        # among the most common spellings, prefer no subtitle, then shorter
        title = sorted((t for t, c in b['titles'].items() if c == top), key=lambda t: (':' in t, len(t)))[0]
        title = re.sub(r'\s*\((?=[^)]*(#\d|book \d|series|novel))[^)]*\)', '', title, flags=re.I).strip()
        title = re.sub(r':\s*A Novel$', '', title)
        if title.isupper():
            title = title.title().replace("'S ", "'s ").replace(' Of ', ' of ').replace(' The ', ' the ').replace(' And ', ' and ').replace(' In ', ' in ').replace(' A ', ' a ').replace(' To ', ' to ').replace(' On ', ' on ')
        title = DISPLAY.get(key[0], title)
        author = b['authors'].most_common(1)[0][0] if b['authors'] else ''
        year = b['years'].most_common(1)[0][0] if b['years'] else ''
        rows.append((len(b['lists']), title, author, year, sorted(b['lists']), key))
    rows.sort(key=lambda r: (-r[0], norm_author(r[2]), r[1].lower()))

    with open(os.path.join(HERE, 'tally.tsv'), 'w', encoding='utf-8') as f:
        f.write('count\ttitle\tauthor\tyear\tlists\tkey\n')
        for count, title, author, year, lists, key in rows:
            f.write(f'{count}\t{title}\t{author}\t{year}\t{",".join(lists)}\t{key[0]}|{key[1]}\n')

    SHORT = {
        'bbc_big_read_top100': 'bbc', 'bokklubben_world_library': 'bokklubben', 'bookbub_classics_lifetime': 'bookbub',
        'classic_books_challenge': 'cbc', 'goodreads_137197_top100': 'gr-list', 'goodreads_lifetime_100_pdf': 'gr-lifetime',
        'great_books_western_world': 'greatbooks', 'greatest_books_top200': 'tgb200',
        'guardian_100_best_nonfiction_2017': 'guardian-nonfic', 'guardian_100_best_novels_2026': 'guardian-2026',
        'guardian_100_best_novels_english_2015': 'guardian-2015', 'jeffrich_100_books': 'jeffrich',
        'le_monde_100_books': 'lemonde', 'modern_library_prh_nonfiction': 'ml-nonfic', 'modern_library_prh_novels': 'ml-novels',
        'observer_100_greatest_novels_2003': 'observer-2003', 'pbs_great_american_read': 'pbs',
        'penguin_100_classics': 'penguin', 'time_100_novels': 'time', 'worldcat_library100': 'worldcat',
    }
    short = {n: SHORT.get(n, n) for n in listnames}
    with open(os.path.join(HERE, 'candidates.md'), 'w', encoding='utf-8') as f:
        f.write('# Blue Book canon candidates\n\n')
        f.write(f'{len(rows)} distinct books across {len(listnames)} lists. Delete rows to cut. Sorted by how many lists each book appears on.\n\n')
        f.write('Lists: ' + ', '.join(f'`{short[n]}` = {n}' for n in listnames) + '\n\n')
        main = [r for r in rows if r[0] >= 2]
        f.write(f'## On two or more lists ({len(main)} books)\n\n')
        f.write('| # | Title | Author | Year | On | Lists |\n|---|---|---|---|---|---|\n')
        for i, (count, title, author, year, lists, key) in enumerate(main, 1):
            f.write(f'| {i} | {title} | {author} | {year} | {count} | {" ".join(short[n] for n in lists)} |\n')
        by_tkey = collections.defaultdict(list)
        for r in rows:
            by_tkey[r[5][0]].append(r)
        f.write('\n## Suggested non-novel classics the lists under-count\n\n')
        f.write('Most source lists are novel lists, so plays, epics, and philosophy score low even when everyone has heard of them. Hand-picked; each shows how many lists it did make. Pull in what you want.\n\n')
        f.write('| Title | Author | On | Lists |\n|---|---|---|---|\n')
        for tkey, dt, da in SUGGESTED:
            hits = by_tkey.get(tkey, [])
            best = max(hits, key=lambda r: r[0]) if hits else None
            count = best[0] if best else 0
            if count >= 2:
                continue  # already in the main table
            lists = ' '.join(short[n] for n in best[4]) if best else ''
            f.write(f'| {dt} | {da} | {count} | {lists} |\n')
        f.write(f'\n## Everything else\n\nThe remaining {len(rows) - len(main)} books appear on one list only. They are in `tally.tsv` (sorted by count, then author) if you want to trawl.\n')

    dist = collections.Counter(r[0] for r in rows)
    print(f'{len(rows)} distinct books from {len(listnames)} lists')
    print('books by list-count:', ' '.join(f'{k}:{v}' for k, v in sorted(dist.items(), reverse=True)))
    nd = near_dupes(books)
    if nd:
        print(f'\n{len(nd)} possible same-author duplicates (add to ALIASES if real):')
        for a, x, y in sorted(nd):
            print(f'  {a!r}: {x!r} <-> {y!r}')

if __name__ == '__main__':
    main()
