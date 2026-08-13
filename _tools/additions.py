"""Classical additions — short works only, no whole epics or treatises.

Every URL here was fetched and checked for length and language before being
added. Word counts are estimates from the source text, same as the rest of
the set. Negative years are BCE.
"""

GREEK = dict(native_language='Ancient Greek', wrote_in='Ancient Greek',
             nationality='Greek', translated=True, gender='man')
ROMAN_LATIN = dict(native_language='Latin', wrote_in='Latin',
                   nationality='Roman', translated=True, gender='man')
# Marcus Aurelius was a Roman emperor who wrote his notebooks in Greek.
ROMAN_GREEK = dict(native_language='Latin', wrote_in='Ancient Greek',
                   nationality='Roman', translated=True, gender='man')

PLATO     = dict(author='Plato', author_sort='Plato', author_born=-428, author_died=-348, **GREEK)
ARISTOTLE = dict(author='Aristotle', author_sort='Aristotle', author_born=-384, author_died=-322, **GREEK)
PLUTARCH  = dict(author='Plutarch', author_sort='Plutarch', author_born=46, author_died=120, **GREEK)
EPICTETUS = dict(author='Epictetus', author_sort='Epictetus', author_born=50, author_died=135, **GREEK)
ENGLISH   = dict(native_language='English', wrote_in='English', translated=False)

HOMER     = dict(author='Homer', author_sort='Homer', author_born=None, author_died=None, **GREEK)
CICERO    = dict(author='Cicero', author_sort='Cicero', author_born=-106, author_died=-43, **ROMAN_LATIN)
AURELIUS  = dict(author='Marcus Aurelius', author_sort='Aurelius', author_born=121, author_died=180, **ROMAN_GREEK)


def rec(base, **kw):
    r = dict(base)
    r.update(kw)
    r.setdefault('century', 'ancient')
    r.setdefault('author_living', False)
    r.setdefault('alt_urls', [])
    r.setdefault('read_by_club', False)
    return r


EXTRA = [
    rec(PLATO, id=401, year=-399, form='speech', words=11500,
        title='The Apology of Socrates',
        url='https://classics.mit.edu/Plato/apology.html',
        tags=['philosophy', 'death'],
        blurb='Socrates defends himself against the charge of corrupting the young, '
              'declines to plead for his life, and tells the jury that the unexamined '
              'life is not worth living.'),

    rec(PLATO, id=402, year=-399, form='dialogue', words=5400,
        title='Crito',
        url='https://classics.mit.edu/Plato/crito.html',
        tags=['philosophy', 'politics'],
        blurb='Crito comes to the cell with an escape plan already paid for. Socrates '
              'argues that he owes the laws his obedience even when they have killed him.'),

    rec(PLATO, id=403, year=-399, form='dialogue', words=6800,
        title='Euthyphro',
        url='https://classics.mit.edu/Plato/euthyfro.html',
        tags=['philosophy', 'faith'],
        blurb='On the courthouse steps Socrates asks a man prosecuting his own father '
              'what piety is, and gets five answers that all collapse.'),

    rec(PLATO, id=404, year=-375, form='book chapter', words=2500,
        title='The Allegory of the Cave',
        url='https://web.stanford.edu/class/ihum40/cave.pdf',
        tags=['philosophy', 'mind'],
        blurb='Prisoners chained facing a wall take the shadows on it for the world. '
              'What happens to the one who gets out, and what happens when he comes back.'),

    rec(ARISTOTLE, id=405, year=-340, form='book chapter', words=8900,
        title='On Friendship (Nicomachean Ethics, Book VIII)',
        url='https://classics.mit.edu/Aristotle/nicomachaen.8.viii.html',
        tags=['philosophy'],
        blurb='Three kinds of friendship: for use, for pleasure, and for the other '
              "person's own sake. Only the third survives either party changing."),

    rec(ARISTOTLE, id=406, year=-335, form='book', words=14500,
        title='Poetics',
        url='https://classics.mit.edu/Aristotle/poetics.mb.txt',
        tags=['writing', 'art'],
        blurb='The founding text of dramatic theory. Plot over character, the six parts '
              'of tragedy, and the reversal and recognition that make an ending land.'),

    rec(AURELIUS, id=407, year=175, form='book chapter', words=2400,
        title='Meditations, Book II',
        url='https://classics.mit.edu/Antoninus/meditations.2.two.html',
        tags=['philosophy', 'death'],
        blurb='Written on campaign among the Quadi. Begin each day expecting to meet the '
              'ungrateful and the arrogant, and remember you could leave life this minute.'),

    rec(AURELIUS, id=408, year=175, form='book chapter', words=4300,
        title='Meditations, Book IV',
        url='https://classics.mit.edu/Antoninus/meditations.4.four.html',
        tags=['philosophy', 'mind'],
        blurb='The retreat into yourself that is available anywhere, and the argument '
              'that whatever happens was always going to happen to someone.'),

    rec(EPICTETUS, id=409, year=125, form='book', words=7500,
        title='The Enchiridion',
        url='https://classics.mit.edu/Epictetus/epicench.html',
        tags=['philosophy', 'mind'],
        blurb='A former slave sorts everything into what is up to you and what is not, '
              'then tells you to want only the first category. Fifty-three short entries.'),

    rec(CICERO, id=410, year=-44, form='essay', words=15000,
        title='On Old Age (Cato Maior de Senectute)',
        url='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cicero/Cato_Maior_de_Senectute/text*.html',
        tags=['philosophy', 'death'],
        blurb='Cato at eighty-four answers the four standard complaints about old age, '
              'including the one about losing pleasure, which he calls a favor.'),

    rec(CICERO, id=411, year=-44, form='essay', words=17000,
        title='On Friendship (Laelius de Amicitia)',
        url='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cicero/Laelius_de_Amicitia/text*.html',
        tags=['philosophy'],
        blurb='Written the year Cicero was killed. Friendship is possible only between '
              'good men, and the hardest part is telling a friend the truth.'),

    rec(PLUTARCH, id=412, year=100, form='essay', words=11000,
        title='On Talkativeness',
        url='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Plutarch/Moralia/De_garrulitate*.html',
        tags=['philosophy', 'writing'],
        blurb='The compulsive talker is the one person no cure reaches, because the '
              'treatment requires listening. Plutarch prescribes exercises anyway.'),

    rec(PLUTARCH, id=413, year=100, form='essay', words=12000,
        title='On Tranquillity of Mind',
        url='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Plutarch/Moralia/De_tranquillitate_animi*.html',
        tags=['philosophy', 'mind'],
        blurb='Written to a friend in a hurry, on why changing your circumstances rarely '
              'changes your state, since you take yourself along.'),

    rec(PLUTARCH, id=414, year=100, form='essay', words=11000,
        title='On the Control of Anger',
        url='https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Plutarch/Moralia/De_cohibenda_ira*.html',
        tags=['philosophy', 'mind'],
        blurb='A man reports what worked: watching angry people closely, refusing to '
              'speak while enraged, and noticing that anger is mostly performed for an audience.'),

    rec(HOMER, id=415, year=-750, form='poem', words=8400,
        title='The Iliad, Book XXIV: Priam and Achilles',
        url='https://classics.mit.edu/Homer/iliad.24.xxiv.html',
        tags=['war', 'death'],
        blurb='The old king crosses the lines alone to kiss the hands of the man who '
              'killed his son, and asks for the body back. The two of them eat together.'),
]


# Poems read at Club Violet, from the National Poetry Month post.
SAPPHO = dict(author='Sappho', author_sort='Sappho', author_born=-630, author_died=-570,
              gender='woman', native_language='Ancient Greek', wrote_in='Ancient Greek',
              nationality='Greek', translated=True)

EXTRA += [
    rec(SAPPHO, id=420, year=-600, form='poem', words=100,
        title='Fragment 31 ("He seems to me equal to gods")',
        url='https://digitalsappho.org/fragments/fr31/',
        tags=['love'],
        blurb='Watching someone she wants sit and laugh with someone else, catalogued as '
              'symptoms: the tongue breaks, fire runs under the skin, she is greener than grass.'),

    rec(dict(author='W. B. Yeats', author_sort='Yeats', author_born=1865, author_died=1939,
             gender='man', nationality='Irish', **ENGLISH),
        id=421, year=1928, century='20th century', form='poem', words=250,
        title='Sailing to Byzantium',
        url='https://www.poetryfoundation.org/poems/43291/sailing-to-byzantium',
        tags=['art', 'death'],
        blurb='"That is no country for old men." An aging man leaves the world of birth '
              'and dying for a city of mosaic, asking to be remade as a golden bird.'),

    rec(dict(author='W. H. Auden', author_sort='Auden', author_born=1907, author_died=1973,
             gender='man', nationality='British', **ENGLISH),
        id=422, year=1957, century='20th century', form='poem', words=120,
        title='The More Loving One',
        url='https://poets.org/poem/more-loving-one',
        tags=['love', 'philosophy'],
        blurb='The stars do not care about us, and that is survivable. "If equal affection '
              'cannot be, / Let the more loving one be me."'),

    rec(dict(author='Elizabeth Bishop', author_sort='Bishop', author_born=1911, author_died=1979,
             gender='woman', nationality='American', **ENGLISH),
        id=423, year=1976, century='20th century', form='poem', words=130,
        title='One Art',
        url='https://poets.org/poem/one-art',
        tags=['death', 'love'],
        blurb='A villanelle that insists losing is easy while the losses get larger, until '
              'the form itself starts to shake in the last line.'),
]


# Sent over directly.
EXTRA += [
    rec(dict(author='Dietrich Bonhoeffer', author_sort='Bonhoeffer', author_born=1906,
             author_died=1945, gender='man', nationality='German',
             native_language='German', wrote_in='German', translated=True),
        id=430, year=1943, century='20th century', form='letter', words=1000,
        title='On Stupidity',
        url='https://nsjonline.com/article/2021/12/bonhoeffer-on-stupidity/',
        tags=['politics', 'philosophy'],
        blurb='Written from a Gestapo prison. Stupidity is a moral failing rather than an '
              'intellectual one, it is produced by power, and against it we are defenseless '
              'in a way we are not against malice.'),

    rec(dict(author='Robert J. Howell', author_sort='Howell', author_born=None,
             author_died=None, author_living=True, gender='man', nationality='American',
             native_language='English', wrote_in='English', translated=False),
        id=431, year=2014, century='21st century', form='journal paper', words=13000,
        title='Google Morals, Virtue, and the Asymmetry of Deference',
        url='https://rjhjr.com/wp-content/uploads/2019/04/Googlemoralsfinal.pdf',
        tags=['philosophy', 'mind'],
        blurb='Imagine an oracle that answers moral questions correctly every time. Howell '
              'argues you still should not defer to it, and works out why taking someone '
              "else's word is fine for facts but corrupting for morals."),

    # National Poetry Month, second weekend.
    rec(dict(author='Robert Hayden', author_sort='Hayden', author_born=1913, author_died=1980,
             gender='man', nationality='American', **ENGLISH),
        id=424, year=1962, century='20th century', form='poem', words=110,
        title='Those Winter Sundays',
        url='https://www.poetryfoundation.org/poems/46461/those-winter-sundays',
        tags=['family'],
        blurb='The father got up first in the cold and nobody ever thanked him. Fourteen '
              'lines that end on "love’s austere and lonely offices."'),

    rec(dict(author='Ada Limón', author_sort='Limon', author_born=1976, author_died=None,
             author_living=True, gender='woman', nationality='American', **ENGLISH),
        id=425, year=2017, century='21st century', form='poem', words=180,
        title='Instructions on Not Giving Up',
        url='https://poets.org/poem/instructions-not-giving',
        tags=['nature', 'death'],
        blurb='After the flowering trees are done showing off, the plain green leaves come '
              'out anyway, and the poem decides to take that as instruction.'),

    rec(dict(author='Naomi Shihab Nye', author_sort='Nye', author_born=1952, author_died=None,
             author_living=True, gender='woman', nationality='American', **ENGLISH),
        id=426, year=1982, century='20th century', form='poem', words=180,
        title='Famous',
        url='https://poets.org/poem/famous',
        tags=['philosophy'],
        blurb='The river is famous to the fish. A redefinition of fame as being known by '
              'the thing nearest you, ending in a wish to be famous the way a buttonhole is.'),

    rec(dict(author='Lana Del Rey', author_sort='Del Rey', author_born=1985, author_died=None,
             author_living=True, gender='woman', nationality='American', **ENGLISH),
        id=427, year=2020, century='21st century', form='poem', words=400,
        title='Violet Bent Backwards Over the Grass',
        url='https://www.coupdemainmagazine.com/lana-del-rey/17143',
        tags=['art', 'family'],
        blurb='The title poem of her collection. She arrives at a party with every decision '
              'already made, sees a seven-year-old arched backwards in the grass doing '
              'nothing, and decides to do nothing about everything.'),
]


# From the Club Violet longlist. Books (Little Weirds, On Being Blue,
# Consider the Oyster) left out on request.
GUT_MONT = 'https://www.gutenberg.org/files/3600/3600-h/3600-h.htm'

EXTRA += [
    rec(dict(author='George Orwell', author_sort='Orwell', author_born=1903, author_died=1950,
             gender='man', nationality='British', **ENGLISH),
        id=440, year=1946, century='20th century', form='essay', words=2900,
        title='Why I Write',
        url='https://www.orwell.ru/library/essays/wiw/english/e_wiw',
        tags=['writing', 'politics'],
        blurb='Four motives that make anyone write, ranked honestly, with sheer egoism '
              'first. "Good prose is like a windowpane."'),

    rec(dict(author='Bertrand Russell', author_sort='Russell', author_born=1872, author_died=1970,
             gender='man', nationality='British', **ENGLISH),
        id=441, year=1932, century='20th century', form='essay', words=5300,
        title='In Praise of Idleness',
        url='https://libcom.org/article/praise-idleness-bertrand-russell',
        tags=['work', 'philosophy'],
        blurb='The case for a four-hour day, argued from the observation that the modern '
              'world produces more than enough and then invents work to absorb the surplus.'),

    rec(dict(author='Walter Benjamin', author_sort='Benjamin', author_born=1892, author_died=1940,
             gender='man', nationality='German', native_language='German',
             wrote_in='German', translated=True),
        id=442, year=1935, century='20th century', form='essay', words=9200,
        title='The Work of Art in the Age of Mechanical Reproduction',
        url='https://www.marxists.org/reference/subject/philosophy/works/ge/benjamin.htm',
        tags=['art', 'politics'],
        blurb='Reproduction strips an artwork of its aura, the authority it held by existing '
              'in one place at one time, and politics rushes into the vacuum.'),

    rec(dict(author='Ursula K. Le Guin', author_sort='Le Guin', author_born=1929, author_died=2018,
             gender='woman', nationality='American', **ENGLISH),
        id=443, year=1986, century='20th century', form='essay', words=2600,
        title='The Carrier Bag Theory of Fiction',
        url='https://otherfutures.nl/uploads/documents/le-guin-the-carrier-bag-theory-of-fiction.pdf',
        tags=['writing', 'books'],
        blurb='The first cultural device was probably a container, not a weapon. What '
              'happens to storytelling if the novel is a bag holding things rather than a spear.'),

    rec(dict(author='John Berger', author_sort='Berger', author_born=1926, author_died=2017,
             gender='man', nationality='British', **ENGLISH),
        id=444, year=1977, century='20th century', form='essay', words=7500,
        title='Why Look at Animals?',
        url='https://www.sas.upenn.edu/~cavitch/pdf-library/Berger_LookAnimals.pdf',
        tags=['nature', 'art'],
        blurb='Animals were once at the centre of the human world and are now marginal. '
              'The zoo is a monument to their disappearance, and the animals there return no gaze.'),

    rec(dict(author='Tennessee Williams', author_sort='Williams', author_born=1911,
             author_died=1983, gender='man', nationality='American', **ENGLISH),
        id=445, year=1947, century='20th century', form='essay', words=2500,
        title='The Catastrophe of Success',
        url='https://www.esalq.usp.br/lepse/imgs/conteudo_thumb/The-Catastrophe-of-Success.pdf',
        tags=['writing', 'work'],
        blurb='Written after The Glass Menagerie made him famous. Security turned out to be '
              'a kind of death, and he checked into a hotel under a false name to get out of it.'),

    rec(dict(author='Susan Sontag', author_sort='Sontag', author_born=1933, author_died=2004,
             gender='woman', nationality='American', **ENGLISH),
        id=446, year=1964, century='20th century', form='essay', words=4000,
        title='Against Interpretation',
        url='https://archive.org/details/againstinterpret00sont',
        tags=['art', 'books'],
        blurb='Interpretation is the revenge of the intellect upon art. "In place of a '
              'hermeneutics we need an erotics of art."'),

    rec(dict(author='Isaiah Berlin', author_sort='Berlin', author_born=1909, author_died=1997,
             gender='man', nationality='British', **ENGLISH),
        id=447, year=1953, century='20th century', form='essay', words=27000,
        title='The Hedgehog and the Fox',
        url='https://archive.org/details/hedgehogfoxessay0000berl',
        tags=['books', 'philosophy'],
        blurb='The fox knows many things, the hedgehog one big thing. Berlin takes the '
              'fragment seriously, then spends the essay arguing Tolstoy was a fox who '
              'believed he ought to be a hedgehog.'),

    rec(dict(author='Jia Tolentino', author_sort='Tolentino', author_born=1988, author_died=None,
             author_living=True, gender='woman', nationality='American', **ENGLISH),
        id=448, year=2019, century='21st century', form='book chapter', words=1500,
        title='The I in Internet (extract)',
        url='https://www.penguin.co.uk/articles/2019/aug/jia-tolentino-trick-mirror-extract',
        tags=['internet', 'writing'],
        blurb='The opening of Trick Mirror, on how the internet turned identity into a '
              'performance with no offstage. Publisher extract, not the full chapter.'),

    rec(dict(author='Michel de Montaigne', author_sort='Montaigne', author_born=1533,
             author_died=1592, gender='man', nationality='French', native_language='French',
             wrote_in='French', translated=True),
        id=449, year=1580, century='16th century', form='essay', words=6000,
        title='Of Friendship',
        url=GUT_MONT + '#link2HCH0027',
        tags=['philosophy'],
        blurb='Written for Étienne de La Boétie, dead at thirty-two. Montaigne tries to say '
              'why they loved each other and gives up: "Because it was he, because it was I."'),

    rec(dict(author='Michel de Montaigne', author_sort='Montaigne', author_born=1533,
             author_died=1592, gender='man', nationality='French', native_language='French',
             wrote_in='French', translated=True),
        id=450, year=1580, century='16th century', form='essay', words=4500,
        title='Of Solitude',
        url=GUT_MONT + '#link2HCH0038',
        tags=['philosophy', 'mind'],
        blurb='Retiring from the world is useless if you bring the world with you. Reserve '
              'a back shop, wholly your own, and keep your ambition there rather than outside.'),
]


# The longlist filed this under Baldwin; it is Hoagland's, Harper's 1988.
EXTRA += [
    rec(dict(author='Edward Hoagland', author_sort='Hoagland', author_born=1932,
             author_died=2020, gender='man', nationality='American', **ENGLISH),
        id=451, year=1988, century='20th century', form='essay', words=7000,
        title='Heaven and Nature',
        url='https://archive.org/details/hoaglandonnature0000hoag',
        tags=['death', 'philosophy'],
        blurb='On the pull toward suicide, opening with a friend who has ridden the subway '
              'for thirty years and thinks about the tracks. Joyce Carol Oates put it among '
              'the best essays of the century.'),
]


EXTRA += [
    rec(dict(author='David Foster Wallace', author_sort='Wallace', author_born=1962,
             author_died=2008, gender='man', nationality='American', **ENGLISH),
        id=460, year=1996, century='20th century', form='essay', words=15000,
        title='The String Theory',
        url='https://www.esquire.com/sports/a5151/the-string-theory-david-foster-wallace/',
        tags=['sport', 'writing'],
        blurb='Michael Joyce is the 79th best tennis player alive, which is to say '
              'unimaginably good and going nowhere. Wallace watches him qualify in Montreal '
              'and works out what that level of devotion costs.'),

    rec(dict(author='Matt Levine', author_sort='Levine', author_born=None, author_died=None,
             author_living=True, gender='man', nationality='American', **ENGLISH),
        id=461, year=2022, century='21st century', form='essay', words=40000,
        title='The Crypto Story',
        url='https://www.bloomberg.com/features/2022-the-crypto-story/',
        tags=['work', 'ai'],
        blurb='An entire issue of Businessweek handed to one writer. Levine explains what '
              'crypto actually is, from first principles, without deciding in advance '
              'whether it is a scam or a revolution.'),
]


EXTRA += [
    rec(dict(author='Jasmine Sun', author_sort='Sun', author_born=None, author_died=None,
             author_living=True, gender='woman', nationality='American', **ENGLISH),
        id=462, year=2026, century='21st century', form='essay', words=6200,
        title='No Data Centers In My Backyard',
        url='https://jasmi.news/p/no-data-centers-in-my-backyard',
        tags=['ai', 'politics'],
        blurb='Reported from Janesville and Mount Pleasant, Wisconsin and Port Washington '
              'and Saline Township, Michigan, where towns are fighting the AI buildout. The '
              'objection turns out not to be about megawatts but about being told after the '
              'deal was signed.'),
]


EXTRA += [
    # The byline really is "John Doe": the Journal of Medical Toxicology ran it
    # anonymously, and says so in the closing line.
    rec(dict(author='John Doe', author_sort='Doe', author_born=None, author_died=None,
             author_living=True, gender='man', nationality='American', **ENGLISH),
        id=463, year=2012, century='21st century', form='essay', words=2800,
        title='My Story: How one Percocet Prescription Triggered my Addiction',
        url='https://pmc.ncbi.nlm.nih.gov/articles/PMC3550260/',
        tags=['death', 'mind'],
        blurb='An emergency-department nurse is prescribed Percocet after a meningitis '
              'exposure and traces, month by month, how the prescription became the '
              'addiction. Published anonymously in the Journal of Medical Toxicology.'),
]


EXTRA += [
    rec(dict(author='Harriet McBryde Johnson', author_sort='Johnson', author_born=1957,
             author_died=2008, gender='woman', nationality='American', **ENGLISH),
        id=464, year=2003, century='21st century', form='essay', words=9000,
        title='Unspeakable Conversations',
        url='https://courses.washington.edu/intro2ds/Readings/24_Johnson-unspeakable.pdf',
        tags=['death', 'philosophy'],
        blurb='Johnson, a disability-rights lawyer, goes to Princeton to debate Peter '
              'Singer, who argues that parents should be free to kill disabled infants. '
              'She finds him courteous, takes the argument seriously, and refuses it '
              'from inside her own life.'),
]


ASIMOV = dict(author='Isaac Asimov', author_sort='Asimov', author_born=1920,
              author_died=1992, gender='man', nationality='American', **ENGLISH)

EXTRA += [
    rec(ASIMOV, id=465, year=1956, century='20th century', form='short story', words=4700,
        title='The Last Question',
        url='https://users.ece.cmu.edu/~gamvrosi/thelastq.html',
        tags=['ai', 'science'],
        blurb='Across trillions of years, humanity keeps asking the computer whether '
              'entropy can be reversed, and keeps getting the same answer: INSUFFICIENT '
              'DATA FOR MEANINGFUL ANSWER. Asimov called it his own favorite of everything '
              'he wrote.'),

    rec(ASIMOV, id=466, year=1980, century='20th century', form='short story', words=3700,
        title='The Last Answer',
        url='https://www.yeyebook.com/en/isaac-asimov-short-story-the-last-answer-full-text-ebook/',
        tags=['faith', 'death'],
        blurb='Murray Templeton, an atheist physicist, dies of a heart attack and wakes to '
              'find himself the property of a being that made him in order to be thought '
              'about. He starts working out how to end it.'),
]
