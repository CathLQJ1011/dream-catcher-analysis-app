# 周公解梦 dictionary: notes

*How `data/symbols/zhougong.csv` was made, what was left out, and what still needs checking.*

## Sources

Three editions were compared. **Only their classical verse sections are used.**

| | edition | classical section | how the text was read |
|---|---|---|---|
| **A** | 周公解梦全书（周公原著，白云道士编译），海南人民出版社，1995/1996 | book pp. 187–207 (PDF = book + 19) | scan → on-device OCR |
| **B** | 周公解梦（第2版，周公著，白云道士编辑），青海人民出版社，2003 | book pp. 233–260 (PDF = book + 3) | scan → on-device OCR |
| **C** | 周公解梦（古代文化集粹），张博主编，延边人民出版社，2013 | 第二章《周公解梦全书》原文 | ebook text |

**B and C contain the same classical text** (C reads as a digitization of B, with its own typos). A is a slightly different, shorter version: it lacks most of the 龙蛇禽兽 section and garbles several category names.

### What else is in these books, and why it isn't used

- **A pp. 1–180 and B's main body**: an alphabetical dream dictionary (抛弃 Abandon, 肚子 Abdomen, 女演员 Actress, 飞机 Aeroplane, 阿拉伯人 Arabs, 母亲 Mother, 灯蛾 Moth…). It reads as a Chinese translation of a Western dream book from around 1900, labelled 周公解梦. It is not 周公 and is full of period gender and ethnic stereotypes.
- **C chapter 3** (modern "详解详析"): the same Western-style material (梦见飞行员, 猫逮鹦鹉…) mixed with modern commentary.
- **B's fortune-telling chapters** (八字, 生肖, "认清男人真面目术", "识破女人内心术"): outside the scope, and the gendered ones conflict with the inclusive rules.
- Historical prophetic-dream anecdotes in A and C: interesting, not dictionary entries.

## How entries were built

- `classical_lines`: the original verse, compared across editions. **The printed text (A or B) wins over the ebook (C)** where they differ.
- `meaning_zh`, `meaning_en`: new paraphrases, not copies of any edition's commentary. The classical verses are traditional public-domain text.
- `source`, `source_detail`: the primary edition and page. `source_2`, `source_2_detail`: where the same lines appear in the other editions.
- `edition_notes`: where editions disagree in a way that matters.

### Notable corrections from comparing editions

- **猫 (cat):** B prints **猫捕鼠者主得财**; C mistypes it as 猎捕鼠者. This is the only classical line about cats, and it's now an entry.
- **兔 (rabbit):** B prints **白兔引路人提携**; C has 白鼠 (white mouse).
- **OCR fixes in A confirmed by B/C:** 富贵 (not 富费), 雨 (not 兩), 梳头洗面百忧去, 屋宅更新主大吉, 身在火中贵人扶.
- **Section names**: A's OCR'd names (捕奈具, 田昂耕种, 坟鸡迎送…) are matched to B/C's clearer names (捕禁刑罚狱具, 田园五谷耕种, 坟墓棺椁送…) in `source_2_detail`.
- **Real disagreements kept as notes:** 鱼飞水上百事吉 (A) vs 百事散 (B/C); 龟鱼相向 (A) vs 龟蛇相同 (B/C); 粪中坐者 大吉 (A) vs 大凶 (B/C), so that line was left out.

## Inclusive principles

Every entry was checked against these rules:

1. **No gender stereotypes.** Lines that read a dream as a wife's infidelity, a woman's gossip, or a woman's worth were left out. "生贵子" (a noble son) is never presented as better than a daughter; where kept, it becomes a gender-neutral new beginning.
2. **No heteronormative assumptions.** "Wife", "husband", "new marriage" and "beautiful woman" are read as any partner, any relationship, any lovely person.
3. **Nothing anti-trans.** A line calling a man becoming a nun unlucky was left out.
4. **No feudal hierarchy as fate.** Servants and masters, concubines, and official rank are dropped or reframed as recognition, progress, or support from others.
5. **No frightening predictions about real people.** Lines predicting that a sick person will die, that a child's death is good news, or that a family member will die are left out. Dreams of death are read the traditional way, as endings and change.
6. **Not locked to one culture.** Buddhist and Taoist figures become "sacred places, any faith or none". Carts become any vehicle.
7. **No violence against partners.** Lines about hitting a spouse were left out. The tradition's well-known reversals (blood, being injured, fire at home → good fortune) are kept, framed as symbolism.

`inclusive_note` on each row says exactly what was changed or omitted for that symbol.

## Columns

| column | meaning |
|---|---|
| `id` | `zg-001` … |
| `tradition` | `zhougong` |
| `term_zh`, `term_en` | the symbol |
| `aliases` | other words that should match it, `|`-separated, Chinese and English |
| `classical_lines` | the original verse lines used, `；`-separated |
| `meaning_zh`, `meaning_en` | modern, inclusive paraphrase shown in the app |
| `tone` | auspicious / inauspicious / mixed |
| `source`, `source_detail` | primary edition, section and page |
| `source_2`, `source_2_detail` | the same lines in the other editions |
| `edition_notes` | where editions disagree |
| `inclusive_note` | what was reframed or left out, if anything |

## Still to check

- **Meanings** are paraphrases. Review them against your own sense of the tradition.
- **Page numbers** for B were located through OCR and are worth a glance against the scan.
- **No classical entries exist** for modern objects like phones, exams or trains as such (the vehicle entry covers carts and transport). Those symbols are better served by the Jungian and neuroscience traditions than by inventing 周公 readings.
- **Source files** came from an online library; cite the printed editions as above.
