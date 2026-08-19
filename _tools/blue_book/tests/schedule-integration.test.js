// Integration test: does the real generated schedule (_data/blue_book_schedule.json)
// actually resolve through the JS side of the id contract (passageIndex /
// roundsForDay) against the real canon (_data/blue_book.yml)? Both sides
// default missing passage ids the same way (canon.py vs blue-book-core.js);
// this guards against that duplicated rule drifting apart.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const C = require('../../../assets/js/blue-book-core.js');

const ROOT = path.join(__dirname, '..', '..', '..');

function loadCanon() {
  const yamlPath = path.join(ROOT, '_data', 'blue_book.yml');
  const code = "require 'yaml'; require 'json'; puts JSON.generate(YAML.safe_load(File.read(ARGV[0]), permitted_classes: [], aliases: false))";
  const out = execFileSync('ruby', ['-ryaml', '-rjson', '-e', code, yamlPath], { cwd: ROOT, encoding: 'utf8' });
  return JSON.parse(out);
}

function loadSchedule() {
  const schedulePath = path.join(ROOT, '_data', 'blue_book_schedule.json');
  return JSON.parse(fs.readFileSync(schedulePath, 'utf8'));
}

test('real schedule resolves through passageIndex: every scheduled id is a current main passage', () => {
  const books = loadCanon();
  const schedule = loadSchedule();
  const idx = C.passageIndex(books);

  for (const day of schedule.days) {
    for (const id of day) {
      assert.ok(Object.prototype.hasOwnProperty.call(idx, id), 'missing id: ' + id);
      assert.equal(idx[id].isFamous, false, 'scheduled id is a famous passage: ' + id);
    }
  }
});

test('real schedule: every day has 5 entries with 5 distinct book ids', () => {
  const books = loadCanon();
  const schedule = loadSchedule();
  const idx = C.passageIndex(books);

  for (const day of schedule.days) {
    assert.equal(day.length, 5);
    const bookIds = day.map((id) => idx[id].book.id);
    assert.equal(new Set(bookIds).size, 5, 'day repeats a book: ' + JSON.stringify(day));
  }
});

test('real schedule: roundsForDay resolves the schedule exactly with no top-up', () => {
  const books = loadCanon();
  const schedule = loadSchedule();
  const lastDay = schedule.days.length - 1;

  for (const d of [0, 1, 2, lastDay]) {
    const rounds = C.roundsForDay(schedule, books, d);
    assert.equal(rounds.length, 5);
    assert.deepEqual(rounds.map((r) => r.passage.id), schedule.days[d]);
  }
});
