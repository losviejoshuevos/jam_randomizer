# Blues: исследовательская выборка для генератора

Это не попытка воспроизвести полные формы песен. Выборка нужна для выделения
повторяемых джемовых правил. BPM округлён: старые записи и концертные версии
часто плавают по темпу, а некоторые каталоги считают half-time/double-time.

| Запись | Направление | Примерный BPM | Форма / вывод для генератора |
| --- | --- | ---: | --- |
| Robert Johnson — Sweet Home Chicago | Delta / standard | 100–110 | quick-change 12-bar, turnaround |
| Elmore James — Dust My Broom | slide / shuffle | 100–105 | плотный 12-bar, основная часть держится на I |
| Muddy Waters — Hoochie Coochie Man | Chicago stop-time | 72–76 | расширенный 16-bar, рифф и остановки |
| Muddy Waters — Mannish Boy | Chicago riff | 80–100 | одноаккордовый stop-time vamp |
| Howlin’ Wolf — Smokestack Lightning | Delta/Chicago vamp | 90–110 | одноаккордовый пропульсивный рифф |
| Muddy Waters — Got My Mojo Working | Chicago / jump | 110–115 | driving I–IV–V, простой гармонический каркас |
| John Lee Hooker — Boom Boom | boogie | 157–168 | быстрый 12-bar/boogie с stop-time hook |
| Howlin’ Wolf — Killing Floor | uptempo Chicago | около 120 | быстрый 12-bar, хроматический рифф поверх I–IV–V |
| Willie Dixon / Howlin’ Wolf — Spoonful | riff blues | 90–110 | долгое удержание одного центра важнее смен аккордов |
| B.B. King — The Thrill Is Gone | modern minor blues | 80–95 | minor 12-bar, ход i–iv–i–♭VI–V |
| T-Bone Walker — Stormy Monday | slow / sophisticated | около 66 | slow 12-bar, minor-IV и проходные изменения |
| B.B. King — Every Day I Have the Blues | jump / urban | 104–105 | компактный бодрый 12-bar |
| Big Bill Broonzy / Little Walter — Key to the Highway | 8-bar | 90–110 | I–V–IV–IV / I–V–I–V |
| Albert King — Born Under a Bad Sign | Stax / riff | 85–100 | нестандартная 8/10-bar фраза, долгое удержание I |
| Freddie King — Hide Away | Texas instrumental | 110–130 | 12-bar shuffle, риффовые chorus-вариации |
| Stevie Ray Vaughan — Pride and Joy | Texas shuffle | 120–130 | moderately fast 12-bar shuffle |
| Buddy Guy / Stevie Ray Vaughan — Mary Had a Little Lamb | Texas riff | около 123 | короткая 8-bar логика внутри I–IV–V |
| Jimi Hendrix — Red House | slow electric | около 66 | медленный 12-bar, diminished-краска и свободная фразировка |
| Cream — Crossroads | blues rock | 130–133 | быстрый 12-bar, минимум гармонических украшений |
| The Allman Brothers Band — Statesboro Blues | Southern / slide | 90–105 | 12-bar slide groove и turnaround |

## Выведенные архетипы

1. `classic-12` — стандартный и quick-change 12-bar.
2. `chicago-stop` — 12/16-bar, stop-time и риффовые паузы.
3. `texas-shuffle` — 8/12-bar, более быстрый shuffle.
4. `minor-modern` — minor blues с дозированным ♭VI–V.
5. `slow-blues` — медленный 12-bar с minor-IV и diminished-проходами.
6. `one-chord-boogie` — 4/8-bar vamp, где развитие создаёт ритм.
7. `eight-bar-roadhouse` — джемовая 8-bar форма в духе Key to the Highway.

## Основные источники

- PBS, разбор 12-bar и Dust My Broom: https://www.pbs.org/theblues/classroom/essays12bar.html
- Premier Guitar, основные варианты blues progressions: https://www.premierguitar.com/style-guide-essential-blues-progressions
- Blues Harmonica, Key to the Highway как опорная 8-bar форма: https://www.bluesharmonica.com/davids_tip_day_key_highway_blues_standards
- Hoochie Coochie Man, 16-bar и 72 BPM: https://en.wikipedia.org/wiki/Hoochie_Coochie_Man
- Pride and Joy, Texas shuffle и 12-bar: https://en.wikipedia.org/wiki/Pride_and_Joy_%28Stevie_Ray_Vaughan_song%29
- Red House, slow 12-bar и 66 BPM: https://en.wikipedia.org/wiki/Red_House_%28song%29
- Open Music Theory, общие варианты blues harmony: https://viva.pressbooks.pub/openmusictheory/

Разночтение по `Born Under a Bad Sign` ожидаемо: разные разборы считают riff,
pickup и вокальную фразу как 8- или 10-тактовую конструкцию. Для Jam Randomizer
используется более легко считываемый музыкантами 8-bar archetype, а не копия записи.
