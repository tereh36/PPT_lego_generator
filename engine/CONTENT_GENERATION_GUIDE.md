# How Claude generates content.json for any topic word

This is a checklist, not a "from scratch" creative process — the goal is that
when a new topic is requested (any word: Fish, Umbrella, Cactus, Airplane...)
the result is assembled by the same consistent algorithm every time, not
reinvented from nothing.

## CRITICAL — rules that were broken in the first version, never repeat them
1. **The story leads to building a model of the TOPIC**, not a derived object.
   Topic "Fish" → build a fish, not a house/aquarium for it. A house/aquarium
   is material for `challenge`, not the main model. Before submitting, check
   yourself: "is what the kids build in Model Building literally the topic
   of the lesson?"
2. **No photo on the cover.** Never add `cover_model_note` or similar fields.
3. **Presentation — minimum 4 questions.**
4. **Games use the unified `script` format** (see content.schema.md), not a
   wall of text. Lines are highlighted ONLY by color (BLUE=children,
   RED=teacher), NO bold/underline.
5. **Story Props — max 3-4.**
6. **Every child builds THEIR OWN model from scratch** — children never
   finish or "fix" the teacher's/character's model. If the story has a
   character problem (e.g. "the snake is too short"), the solution is NOT
   "let's make Sammy longer" but "let's each build our own long snake". The
   story's motivation must lead to each child building a separate, complete,
   own model, not modifying the existing character's object.
7. **Youtube ids are NEVER pulled from memory.** Every id (intro video,
   letter-specific video for a new letter) must be found via `web_search`,
   taken ONLY from a real search result (a URL like `youtube.com/watch?v=ID`).
   After assembly, always run `qa-validate.py` on the content.json — it
   checks every id's availability via the YouTube oEmbed API.
8. **Challenge — different archetypes, never the same one twice in a row**
   (see the separate "Challenge Archetypes" section below).
9. **Game 3 — an explicit reason for the speed change.** Not just "run to the
   tree". You need TWO clearly different teacher commands (slow/fast), each
   with a clear reason tied to the topic (weather, danger, time of day, etc.)
   so children understand when and why to move differently.
10. **Preschool models are built ONLY from simple bricks (2x4, 2x2) — NO
    moving/functional parts.** The "function/mechanism" Challenge archetype
    (flapping wings, rolling wheels, etc.) is Brickmoto (ages 6-9), not
    Preschool. For Preschool this archetype is EXCLUDED from rotation. Real
    example of the mistake: "Make your butterfly's wings actually flap" —
    physically impossible with this LEGO set, was fixed to a modification +
    measurement of wing size instead.
11. **Don't invent extra characters.** There's already a lead character — the
    teacher's LEGO minifigure (see the Story section). If the story needs a
    human role (pilot, explorer, captain), it's ALWAYS the same teacher
    minifigure, not a new invented named character. Named characters are only
    allowed when they PERSONIFY the lesson topic itself (Sammy the Snake,
    Bubbles the Fish, Freddy the Frog) — i.e. when the story can't work
    without them, not "because it's more interesting". Real example of the
    mistake: topic "Airplane" — an extra "Captain Ace" was invented next to
    the already-existing teacher minifigure; fixed to "teacher = pilot".
12. **The story's conflict must be concrete and playable on the table with
    2-3 paper props**, not abstract/emotional. Test before submitting: "could
    the teacher physically act this out with a couple of cutout pictures on
    the table in front of 3-5 year olds?" Abstract phrasing like "can't find
    a dry place", "gets upset" plays out poorly. A concrete interaction with
    another simple, universally known object/creature (a frog and a
    mosquito, not "a frog and an abstract inconvenience") plays out well.
    Real example of the mistake: topic "Frog" — "Freddy can't find a dry
    place to rest" (abstract, nothing to cut out and act with), fixed to
    "Freddy wants to catch a buzzing mosquito but it's too quick" (a
    mosquito is concrete, recognizable, easy to draw as a prop).
13. **A Challenge can't be "just bigger".** A single modification with no
    measurable/comparative element feels too flat. Modification should
    almost always be paired with measurement/comparison ("the widest wings —
    whose are wider?"), not a bare "add more".
14. **Challenge is ALWAYS about building, NEVER about a physical test of the
    already-finished model** (throwing, pushing, rolling, racing). LEGO
    models are fragile and fall apart — and the whole point of a Challenge is
    to build, not to play with something already finished. Any measurement/
    comparison must be measured ON THE CONSTRUCTION ITSELF as it's being
    built (how many bricks, what height/width/length), not through moving
    the model. Real examples of the mistake: "race to see whose airplane
    flies farthest with a push", "how far can your turtle walk in five
    pushes" — both are movement tests, not building; fixed to "build the
    tallest hangar" and "build the biggest shell, count the bricks"
    respectively.
15. **Every physical item children interact with individually MUST be a real,
    printable asset with the right quantity — never a described-but-unmade
    prop.** If the story or Game 2 says a child finds/sorts/matches/holds/
    collects their OWN piece of something, that something needs an entry in
    `game2.print_items` (or `class_copies` on a `story_props` handout) with
    an `image_prompt` and a `copies` count — see content.schema.md and the
    "Game 2" section below. Real example of the mistake: a Duck lesson's
    Game 2 script said "sort the ducks" (`type: "sorting"`), but no duck
    image or copy count existed anywhere in the JSON — nothing printed, the
    teacher had zero ducks to hand out. Before finalizing Game 2 (and any
    story beat that hands children a real object), reread your own script
    line by line and ask: "if I printed exactly what this JSON defines,
    would every physical thing the script asks for actually be on paper, in
    enough copies?" Rule of thumb on quantity: about 8 total (one per child
    in a full class) when each child gets their own piece to sort/match/
    find; 1 copy each when the teacher is just holding two things up to
    compare; a handful (3-6) per repeating unit for a pattern strip.
16. **HARD WORD-COUNT CEILINGS for Game 1/3 chant lines — this is a
    frequently-broken rule, read it every single time.** The entire audience
    for this program is 3-5 year old children who are learning English AS A
    SECOND LANGUAGE (this program runs for Vietnamese-speaking children who
    often know close to zero English words) — every extra word in a chant
    line is a word most of the class cannot understand, and a long line
    stops being chantable/memorable at all. Concrete, checkable limits, not
    a vague "keep it short":
    - `children` chant question: max 6 words.
    - EACH of the teacher's two rhymed responses in Game 1/Game 3: max 4-5
      words TOTAL — that is the whole line, not per clause, not per part.
      If your line is longer than 5 words when you count them, it is too
      long — cut words, don't just reformat.
    - REAL MISTAKE (topic Goat) that must never be repeated: "Quiet steps,
      tip-toe slow, munching grass down in a row!" (10 words) and "Climb up
      high, reach the sky, hop along, way up high!" (11 words). Both are
      sentences, not chants — a non-English-speaking 4-year-old cannot echo
      that after one hearing. CORRECT pattern: 4-5 words max, punchy and
      rhymed: "Tip-toe slow, off we go!" (5 words), "Hop up, touch the sky!"
      (5 words), "Run fast, hide now!" (4 words) — one breath, done.
    - Before finalizing ANY Game 1 or Game 3 teacher line, literally count
      the words. If it's over 5, it fails this check regardless of how good
      the rhyme sounds - shorten it.
17. **Every story MUST include a real, physical, hands-on interaction with
    the children — not just a line the children say once.** A story where
    kids only speak a chorus line and watch the teacher move props around is
    NOT ENOUGH. The children's bodies/hands need to actually DO something
    physical tied to the plot at least once, ideally twice, beyond just
    talking - this is not optional flavor, it's a required part of every
    story. Concrete pattern (REAL EXAMPLE, topic Goat, use this as the
    template): kids chant "Jump, jump, little goat!" while the teacher
    "hops" the goat prop from child to child around the circle, actually
    passing near/in front of each kid in turn (not just holding it in one
    spot) - THEN the story continues with the kids "feeding" the goat by
    holding up a hand/pretend grass and the teacher walks the goat prop
    around to "nibble" from each child's hand in turn. That is two rounds of
    real physical engagement (moving prop child-to-child + feeding gesture),
    not one static chorus line. Reuse this exact pattern (a character
    prop physically visiting/interacting with each child in turn, doing
    something concrete - hopping to them, eating from their hand, hiding
    with them, getting a "pat", racing past them) for every story - it's
    already covered by the "Pool of interactive techniques" below (see
    techniques 2 and 4 especially), but those techniques are NOT optional
    extras to sprinkle in if you feel like it - AT LEAST ONE of them is
    REQUIRED in every story, checked in Step 7's final review.

## Challenge Archetypes (rotate, don't repeat back to back; ALL are about
building, see rule 14)
1. **Modification + measurement** — improve a specific detail of the child's
   OWN already-built model, ALWAYS with a measurable/comparative element,
   measured on the construction itself (e.g. umbrella → beach umbrella with
   the biggest canopy: "whose is biggest?"). A bare "just wider/bigger" feels
   weak — where possible, reinforce it by counting pieces or combining with
   the "family/group" archetype.
2. **Measurement/comparison (height/length/reach a target)** — bring the
   model to a measurable record tied to the topic's defining trait (longest/
   tallest/widest — count in bricks, NOT through movement/throwing/pushing);
   works especially well as a callback to the story's conflict (the snake
   was short → "whose is the longest, count the bricks"; the fruit was high
   on a branch → "build tall enough to reach it"). "Reach a target" means
   counting the reach ON THE CONSTRUCTION ITSELF as it's built (who has
   already reached with their bricks), not through throwing/moving the
   finished model.
3. **Container/shelter/protection** — build a house/aquarium/garage/nest/
   shelter for the model OR for a small object inside it (protect an egg,
   hide/hold something small inside). Don't use by default — only when it
   fits the topic organically, and not two lessons in a row.
   ⚠️ MUST be a concrete, buildable STRUCTURE — NEVER an environment/terrain
   (a swamp, forest, ocean, desert, sky, field). "Build a swampy home" is
   nonsensical: a swamp is water and mud, there is nothing to stack bricks
   into. Real example of the fix (topic Alligator, whose story already had
   the character resting on a log): Challenge became "build a log for your
   alligator to rest on" — a real object from the story, concretely
   buildable and measurable (how many bricks long is the log?), not "build a
   swamp".
4. **Stability/balance** — build so the model stands on its own without
   falling (e.g. on one "leg"/a narrow support) — measurable through
   "stands without support yes/no" or "how many bricks of height it can
   hold before falling".
5. **Strength/weight** — build a construction sturdy enough to hold a small
   real object on top without collapsing (e.g. a bridge holds a toy car, a
   shelf holds a book) — measurable through "held it yes/no", checked
   gently, not by throwing.
6. **Bridge/crossing/connecting two points** — build a structure that
   something can go OVER/UNDER/THROUGH (a bridge, tunnel, arch), or that
   connects two points (two "shores", two marker bricks).
7. **Pattern** — lay out a repeating brick pattern (by color, shape, size) —
   measurable through "how many repeats of the pattern were made".
8. **Fitting pieces together** — build so that two separate parts of the
   model precisely connect/fit together (puzzle-piece principle).
9. **Family/group** — build a small/large version next to it (e.g. a baby
   next to the adult model, or a whole family of several small models) —
   often the most substantial archetype, solves the "too flat" challenge
   problem well.
10. **Function/mechanism** — [BRICKMOTO ONLY, not available for Preschool] —
    add a simple moving part (wheels, wings) and test how it works. Not
    physically possible on the Preschool set (only 2x4/2x2 bricks) — never
    offer this for Preschool under any circumstances.

Do NOT use a "smoothness of movement"/"speed" archetype in any form — any
challenge where success is checked by moving/throwing/pushing/racing the
finished model is forbidden (see rule 14). Measurement is ALWAYS on the
construction itself as it's being built, never through physically moving
the result.

## Input
One topic word (e.g. "Cactus"), optionally: teacher's name, list of the
block's recent topics (for a continuing storyline), lead character's gender
if already set.

## Step 1 — basic fields
- `topic` = the word, capitalized.
- `letter` = the topic's first letter, uppercase.
- Check `scripts/letter-videos.json` for a video id for that letter; if
  missing, leave it blank and warn the user it needs to be added once.

## Step 2 — Story (per section 5-6 of Preschool_Rulebook.md)
The dramaturgy is fixed, only the content changes:
1. Warm-up (already the video on slide 2, not part of Story)
2. Setup → interactive back-and-forth → the topic's object appears → bridge
   to building
3. `key_phrase` — 2-5 words, said in chorus
4. `characters[0]` is always the teacher-minifigure character
5. `full_story_speaker_notes` — 6+ sentences with lines and gesture stage
   directions, SUPER short phrases (3-6 words per line) — the target
   audience often knows zero English (e.g. Vietnamese children age 3-5),
   meaning travels through tone/gestures/props, not through understanding
   the phrases
6. `observation_questions` — only about what was actually introduced in the
   story (sensory experience: color, shape, number of parts — what the kids
   touched/saw)

### Story format pool — don't default to "antagonist steals the prop"
Vary it from topic to topic (test: could the teacher physically show this
with 1-3 cutout props on the table, no abstractions?). Tag whichever one you
used in `story.archetype` (values: `antagonist_steal`, `hide_and_seek`,
`hungry_offering`, `sad_lonely`, `pure_joy_surprise`, `gift_with_property`) -
the app tracks this server-side and will tell you in the prompt which
archetypes are still "on cooldown" (used too recently); tag honestly so that
tracking stays accurate, don't just pick whichever tag sounds safest:
1. **An antagonist wants to steal the prop** — first play the antagonist
   scene BEFORE handing out props (explains why), then hand out the prop
   "for safekeeping", then the antagonist livens things up trying to grab
   the prop from each child around the class, then leaves.
2. **Someone is lost/playing hide-and-seek** — the character hides in the
   classroom, kids find it; then each child gets their own mini-version to
   hide themselves while the teacher searches. The bridge to building is NOT
   a repeat of the same character but a logical continuation (e.g. lots of
   hidden baby bears → "they need mamas").
3. **The character is hungry/offering food** — comedic contrast is
   encouraged (the character delightedly eats something, kids scrunch up
   their faces/laugh). Before the gesture, kids first repeat a verb-phrase in
   chorus ("Sniff the bone!"), then do the gesture.
4. **The character is sad/lonely** — kids comfort it with chorus lines and
   gestures, no antagonist.
5. **Pure joy of finding/surprise** — hiding behind the teacher's back/in
   kids' hands, WITHOUT invented decorative props that can't physically be
   made (e.g. coral).
6. **The character gives something with no conflict** — play up a PHYSICAL
   PROPERTY of the prop as part of the plot (example: a balloon lifts a
   baby elephant high into the air for its birthday — kids raise their own
   balloons, then cheer together).

### Clarity test (MANDATORY before submitting)
Picture a 4-year-old who just learned "hello" in English, sitting in a
circle, watching the story WITHOUT translation — only gestures, props,
intonation. Ask yourself: **will they understand WHY each action is
happening?** Every action needs a clear physical reason/stake (hunger, fear,
loss, joy of finding, a gift) — not an abstract "check" with no stakes.
MISTAKE (real example, topic Airplane): "let's check the airplane's wings" —
unclear WHY to check, what happens if you don't, what's physically going on
at all. That's not an archetype, it's a vague action about nothing. FIX:
either archetype 3 (the little airplane is hungry/wants fuel, funnily
"refuels" on a cloud), or archetype 1 (a mischievous wind keeps trying to
blow the airplane off course, kids hold it steady), or archetype 6 (the
airplane flies high with the kids' help, who flap their own paper wings
along with it, then cheer "we're flying!" together). Always pick ONE clear
archetype from the pool, don't invent a hybrid.

### Pedagogical basis (from real preschool circle-time practice)
Real techniques that actually work with 3-5 year olds (including non-native
English speakers) and should be present in the story:
- **Repetition is half the method.** A key phrase/gesture repeats at least
  2-3 times in the story, always the same way — kids pick up the pattern
  fast.
- **Call-and-response, not a monologue.** The teacher says/does something —
  kids respond in chorus with a line or gesture. Not long explanations.
- **One simple conflict with a clear stake**, not several topics at once.
- **Physical engagement from the first seconds** — not just listening, but
  immediately doing something with hands/body (touching a prop, waving
  arms, shaking their head).
- **Resolving the conflict = the bridge to building**, not a separate,
  loosely connected thought tacked on at the end.

### Feasibility test (MANDATORY before EVERY action in the story)
Before writing any action, ask yourself: **exactly HOW will the teacher show
this with two hands and paper props, right now, at a little table with an
A4 sheet behind them?** If you can't honestly answer step by step, the
action doesn't pass — rewrite it. Specific things that are NEVER feasible
and were real mistakes in past versions:
- Liquids/mud/water in any form (splashing, spraying, dripping water) — there
  isn't a drop of real water on the table.
- Physical contact between the character and a child (hugging, high-fiving,
  touching) — a printout can't meaningfully touch a live child.
- "Transformation"/materializing out of nothing (an egg cracked and a chick
  APPEARED FROM INSIDE IT, melted, grew before your eyes) — a flat picture
  can't change on its own.
- Tearing/damaging a printed prop (breaking an apple in half) — props are
  reusable, they don't get destroyed as part of the plot.
- A part of a printed prop moving/opening/flapping on its own (wings
  opening, a mouth opening, a tail wagging, legs walking) — a flat cutout is
  RIGID paper, nothing on it moves or articulates. REAL MISTAKE (topic
  Ladybug): "the teacher lifts Dotty's wings open... Dotty opens her wings,
  ready to fly!" — a paper ladybug's wings cannot physically lift or open.
  If the plot needs an already-open-wings version, use the honest prop-swap
  trick below (hide the closed-wings prop, pull out a SEPARATE
  already-prepared open-wings prop) — never describe the SAME prop's part as
  moving.
- Hiding BEHIND a flat background (behind a tree drawn on the background) —
  the background is a flat A4 sheet, nothing can physically hide behind it.
  Hiding is ONLY behind the teacher's back or between two real props (one
  covering another in the teacher's hands).
- Describing "how" a character's emotion "looks" on the picture itself
  ("looks sad", "looks surprised") — a printout doesn't change expression.
  ALL emotion is conveyed ONLY through the teacher's voice/tone and the
  words in the lines ("Oh no!" said in an upset voice), never as a visual
  property of the prop. Phrase it in the script as a vocal/tonal direction
  for the teacher, not as a visual fact.

### Reliable trick for "transformations"/"reveals" instead of materializing
When something needs to change into something else per the plot (egg →
chick, a character "disappears" → is found as something else) — use ONLY an
honest prop swap: hide one prop behind the teacher's back for a second and
pull out an ALREADY-PREPARED different prop. Never claim a prop itself
"cracked open"/"grew"/"melted" — paper doesn't do that.

### Pool of interactive techniques — MANDATORY, not optional flavor (see
CRITICAL rule 17). At least ONE of these must appear in every story - pick
whichever fits the archetype/plot best, don't build a version with none of
them:
1. **Mimicry/choosing among background objects** — the background already
   contains 2-3 large objects; the character (in 2-3 color versions/copies,
   if needed) ends up at each object in turn, kids guess/react in chorus at
   each step BEFORE the teacher reveals the result.
2. **Chase through all the children** — a small character-prop "runs" from
   child to child (the teacher moves it around the circle), a bigger
   character chases just behind, narrowly missing each time; at the last
   child — a real moment of "catching"/meeting with an unexpected, NOT
   scary and NOT food-related (not "ate it") resolution.
3. **Kids create their own points of interest** — each child places their
   own prop (a flower, a thread, etc.) wherever they want, the character
   reacts specifically to what was just placed — a small element of choice
   and involvement instead of pure observation.
4. **Hand out → collect → feed/share in turn** — material (crumbs/thread/
   food, pre-printed) is handed out to everyone at once or scattered on the
   table, kids collect/pass it to the character one by one, with a chorus
   phrase containing a real action word (eat, hide, fly) on each pass — NOT
   just onomatopoeia (not just "yum yum" with no real word).
5. **Building tension through counting/repetition** — a countdown or a
   growing repetition before the climax (e.g. "Crack... crack... CRACK!"
   before a prop swap, or a rising whisper "Sneak, sneak, sneak..." before a
   pounce).
6. **Predator waits, prey moves back and forth** — good for a predator
   character with a fixed resting spot (e.g. an alligator on a log): the
   predator prop stays put at one side of the table, the prey prop moves
   back and forth across the "stage" a couple of times (teacher slides it
   left, then right, narrating each pass), each time the predator tries and
   misses (a quick snap gesture, prey slides away just in time), building
   anticipation through repetition (see technique 5) - on the final pass the
   predator finally catches it. Simple, fully feasible with two flat props
   and one fixed background, no invented movement.

### The story doesn't have to be extremely short
It can be written as a small adventure/dialogue/interaction if that's earned
by genuine interest, not artificially padded. A plot built around a REAL
FACT about the animal/object works well — one of its defining traits, told
through the story (owls stay up at night and hear extremely well; elephants
are heavy — they stomp "BOOM"; octopuses change color to hide; spiders spin
a web thread by thread). A real fact makes the story more logical and more
interesting than an abstract conflict.

### A real stake/hook is mandatory
The story needs a clear hook (will they make it in time/not, catch it/not,
have enough/not) — not just "found an object and played with it, the end".
A flat scene with no stakes feels empty even when it's physically feasible.

### Mandatory fact-check (real mistake: camel humps supposedly store water)
Before submitting, check EVERY factual claim about the real animal/object
against what you actually know to be true - including claims baked into
the story's core premise, not just isolated trivia lines. Real example of
the mistake: an entire Camel story was built around "the camel is thirsty
because her humps are full of water" - this is FALSE, camel humps store
FAT, not water. The whole plot rested on a wrong fact. If you're not
confident a fact is correct, either don't use it, or use a safer, more
general true statement instead (e.g. "camels can go a long time without
water" is true and still gives a usable story hook). A story that "sounds
plausible" is not the same as one that is actually correct - treat this
check with the same seriousness as the physical-feasibility test.

## Step 3 — Story Props
A minimal set (usually 2, max 3-4), only directly related to the topic, no
secondary characters for decoration.

Every prop needs a `role`: `"character"` for the main story character(s), or
`"handout"` for a small item that gets given to/collected by children or
eaten (a carrot, a leaf, krill, a cactus, etc.). This isn't cosmetic - it
drives the print size: characters print at roughly a quarter of the page
(bigger for naturally large animals/objects), handout items print noticeably
smaller but never so small a 3-4 year old can't comfortably hold one. Get
this wrong and printed sizes look illogical (a tiny character, a giant
carrot).

## Step 4 — Games (unified `script` format for game1/game2/game3)
Each game is described as a `script: [{speaker, text}]` array, speaker is
one of: `children` (kids initiate a line in chorus), `teacher` (the
teacher's command response), `action` (what physically happens),
`instruction` (a rule step, mostly for Game 2). The slide rendering shows
the FIRST `children` line big and centered at the top of the slide (the
phrase kids are learning to read/say), with a small note underneath telling
the teacher to have kids learn it before playing. ONLY `children` lines are
highlighted (bold blue) anywhere on the slide - `teacher`/`action`/
`instruction` lines are plain text, so the one thing kids need to repeat
stands out clearly. Keep it short and conversational (3-6 words for kids line), not long
phrases - it needs to work both as a giant headline and as a phrase a
4-year-old can actually say.

⚠️ REMINDER (applies to every game below, see CRITICAL rule 16 above for
exact numbers): this audience is 3-5 year old non-native English learners
who often know almost no English words yet. Every single line in Game 1,
Game 2, and Game 3 needs a hard word-count check before you move on, not
just a general "keep it short" feeling - see rule 16 for the exact ceilings
and a real example of what happens when this gets skipped.

- **Game 1** — an established template (not a free choice between two
  styles): the same children's chant-question (`speaker: children`) repeats
  EVERY round the same way within the lesson; the teacher (`speaker:
  teacher`) answers with one of TWO rhymed options — following the
  pattern "[action], [action], + a short rhymed line" (2-3 short action
  words, then a punchy rhymed tag - see the hard word-count ceiling in
  CRITICAL rule 16, max 4-5 words total per response, no exceptions).
  One option is real running (kids scatter, the teacher play-chases them,
  a separate `action` line describes this), the other is a big action in
  place (jumping, etc., genuinely high and energetic). EXACTLY 3 rounds (not
  4) - 4 rounds crams too much text onto the slide and forces the font
  smaller than it should be.
  ⚠️ Round assignment is NOT fully random - it's fixed to avoid a real
  repetition bug: Round 3 is ALWAYS the running/chase option (the mandatory
  ending). Round 2 is ALWAYS the OTHER option (in-place/jumping) - never
  the same option as Round 3, since two identical rounds back-to-back
  (verbatim-identical text shown twice in a row) is boring and was a real
  observed bug (topic Goat: rounds 2 and 3 both came out as "Down the hill,
  run and dance!" word-for-word). Round 1 can be either option (this is the
  only round with genuine choice). This guarantees rounds are never
  duplicated consecutively while still ending on the chase.
  The chant's WORDS and both responses are NEW for every topic, drawn from
  the topic's own vocabulary (action verbs for that specific animal/object),
  never reuse previous lessons' phrasing verbatim, and never reuse the same
  word twice within one lesson's two responses either (REAL MISTAKE, topic
  Goat: "reach the sky" then "way up high" in the same lesson - "high"
  appeared twice, which also padded the line past the word-count ceiling).

  CRITICAL about language: the target audience is 3-5 year olds, often
  non-native speakers (e.g. Vietnamese, who just learned "hello"). The chant
  and responses must consist ONLY of the simplest, shortest, highest-
  frequency words (1 syllable preferred, 2 max) — verbs like "go, fly, run,
  jump, hide, swim" and the topic name, NOT complex constructions. See the
  hard word-count ceiling (rule 16) - this is not a suggestion, count the
  words before finalizing.

  CRITICAL about the teacher's response: BOTH of the teacher's two options
  must be SHORT and RHYME — this is not optional and not specific to the
  rhymed template's "third line", the whole point of a chant is that it's
  rhythmic and easy to remember by ear. Say it out loud before you commit to
  it: if it doesn't scan and doesn't rhyme, rewrite it. This same short+rhyme
  requirement applies to Game 3's teacher lines too (see below), since Game 3
  reuses this exact chant structure.

  Don't default every time to the same "[Topic], [Topic], what do we do?"
  structure. Genuinely vary the QUESTION STRUCTURE from topic to topic, not
  just the words plugged into it — never reuse the same structure two
  lessons in a row (per `structure_tag` cooldown below), and treat this list
  as a starting point to riff on, not an exhaustive menu to cycle through
  verbatim:
  "[Topic], [Topic], what do we do?", "[Topic], [Topic], where do we go?",
  "[Topic] time, what now?", "Hey [Topic], what's the plan?", "[Topic],
  [Topic], up or down?", "[Topic], [Topic], can you tell?", "Little
  [Topic], what's next?", "[Topic] friend, what do we do?", "[Topic] says,
  what now?", "Ready, [Topic], what's the call?", "[Topic], [Topic], loud
  or quiet?", "[Topic], [Topic], near or far?". Always check rhyme grammar.
  Don't tie the commands literally to the LEGO model itself (see the
  umbrella-rule example). Tag the structure you used in
  `game1.structure_tag` - the app tracks this server-side and will tell you
  in the prompt which structures are still "on cooldown" (used too
  recently); tag honestly so the tracking stays accurate. If every tagged
  structure is on cooldown, compose a genuinely new one rather than
  reusing a cooling-down tag - the pool above is not a hard enum, `other`
  is always a valid tag for something new.

  ALTERNATE valid structure — cue-word cross game (great fit for predator/
  hiding themes): instead of two rhymed lines, the teacher's two responses
  are short CUE WORDS/phrases naming two states tied to the topic — one calm
  ("safe"), one danger ("chase"). On the calm cue kids walk/wander calmly in
  place; on the danger cue kids scatter and race to cross to a safe wall/
  spot, teacher play-chases as the predator. Real example (topic Alligator,
  who rests on a log in the story): children chant "What do we do, gator?";
  teacher randomly calls "Log!" (kids calmly wander) or "Alligator!" (kids
  scatter and cross the river to the far wall, teacher chases). This is
  essentially "red light, green light" retextured to the topic - simple,
  familiar to kids, and doesn't need a rhyme. Use this variant when a
  clean predator/safe-spot pair exists naturally in the topic; otherwise
  default to the rhymed template above. (The Round 2/Round 3 anti-repeat
  rule above applies here too: the calm cue and danger cue must not repeat
  back-to-back the same way.)
- **Game 2** — a MIXED POOL of formats, like the story — pick based on the
  topic, don't default to the same one every time, and don't default to
  `search` ("kids must find something") just because it's the most familiar
  option. Every type below is equally valid when it fits the topic better —
  the goal is the BEST-fitting concrete mechanic for this specific animal/
  object's real traits, not habit. General principle: Game 2 is noticeably
  calmer than Game 1 (which already "owns" running/energy) and CLOSER to the
  real world — no running, only printed materials/a real object/bricks. All
  questions/steps use SIMPLE words (remember: non-native 3-5 year olds, see
  rule 16), but responses should still be full, meaningful short phrases
  where a child speaks (e.g. "Yes, I like it!", "I found the leaf!") rather
  than a single bare word/interjection every time — a game that's only ever
  "yes/no" one-word answers ends up feeling too thin and teaches little real
  language. No open questions like "what color", but "do you like it? yes or
  no" is fine. The script here is mostly `instruction` lines (rule steps) +
  one `action`, and where the teacher does have a line, keep it SHORT (aim
  for the same ~5-word ceiling as Game 1/3 even though a rhyme isn't
  mandatory here) — a long unrhythmic sentence still doesn't belong on a
  slide a 4-year-old is meant to glance at.

  **Think like a room of specialists before you commit to a mechanic**, not
  just a single "pick from the list" pass. Genuinely run through these four
  angles on your OWN draft idea before finalizing `game2` (this is not
  cosmetic — each angle below has caught a real, different class of mistake):
  - **An early-childhood pedagogy specialist** asks: does this actually
    teach a real concept at a 3-5-year-old's developmental level (sorting,
    counting, comparing, patterning, cause-and-effect), or is it just
    busywork dressed up as a game?
  - **A language-acquisition/ESL specialist** asks: are the phrases the
    child speaks here DIFFERENT from what they said in Game 1 and in the
    last few lessons' Game 2, or is this the same sentence shape again with
    the topic word swapped in? And just as important: is every line still
    inside the word-count ceiling for a beginner who barely speaks English?
  - **A hands-on/motor-development specialist** asks: what does the child's
    hand actually DO in this game (pick up, flip, place in a pile, hold next
    to another card)? If you can't answer that concretely, the mechanic is
    too abstract for this age group.
  - **A print-production/classroom-logistics specialist** asks the most
    literal question of all: "if I printed exactly what this JSON defines
    and nothing else, could a teacher run this game tomorrow morning?" —
    walk through the script line by line and confirm every physical item it
    names has a matching `print_items`/`search_item`/`colors` entry with a
    sane copy count (see КРИТИЧНО #15). This is the check that would have
    caught the duck-sorting bug (a script that said "sort the ducks" with no
    duck image defined anywhere).
  If any of the four would object, revise before moving on — don't write
  four bullet points of praise and continue with the original idea.

  Pick a real, interesting, TOPIC-SPECIFIC trait to build the mechanic
  around, not the laziest available one. "Sort by big/small" is the correct
  answer sometimes, but it's also the easiest answer to reach for by habit —
  before defaulting to size, ask whether the topic has a more specific, more
  interesting real trait to sort/match/compare/pattern by (does it float or
  dive, is it loud or quiet, does it live on land or in water, is it smooth
  or bumpy, is it awake by day or by night, does it have stripes or spots).
  A genuine real-world fact almost always makes a more memorable game than a
  generic size split — apply the same "prefer a real fact" instinct that
  `search` already uses for `search_item` (see below) to `matching`,
  `sorting`, `compare`, and `pattern` too.

  Tag your choice in `game2.type`. The app tracks recent (non-sensory)
  choices server-side and will nudge you in the prompt to avoid repeats -
  but this is a SOFT preference, not a hard rule. `sensory` is NEVER
  restricted: if the topic has an accessible real object, use `sensory`
  regardless of how recently it was used elsewhere.

  1. **`type: "sensory"`** (PRIORITY if the topic has an accessible real
     object): touch/smell/taste the real object of the topic ("do you like
     it?", "tasty/not tasty?", "touch the leaves... green leaves!").
     ⚠️ A single object + a single one-word reaction ("Yes, so soft!") is a
     thin, weak experience for the whole game - REAL MISTAKE (topic Goat):
     the entire sensory game was "pass around one cotton ball, say soft".
     Whenever there's a genuine second material with a CONTRASTING texture
     available (the topic's real object AND something else clearly
     different - e.g. a goat's soft fur vs. its hard hoof/horn, a turtle's
     soft belly vs. its hard shell), upgrade this into a real `compare` or
     `sorting` game instead of plain `sensory`: kids feel/handle 2+ distinct
     things and sort or compare them by the texture trait (soft vs. hard,
     rough vs. smooth), using `game2.print_items` or real objects - this
     gives a genuinely fuller interaction and richer language than one item
     and one adjective. Only use plain single-object `sensory` when there
     genuinely isn't a second contrasting material naturally available. No
     print assets needed for plain single-object sensory - this uses the
     real object, not a printout.
  2. **`type: "search"`**: the teacher hides cutout cards around the room
     (under a chair, behind a curtain, etc. — calm, not running), kids take
     turns searching and happily show what they found; a chorus line on
     finding it — the children's line should be a short but MEANINGFUL full
     phrase using simple words (e.g. "I found the fish!", "Here is the
     cactus!"), not just a bare interjection like "Found it!" alone (too
     thin, doesn't teach real language). Two sub-modes, pick whichever fits
     better:
     - **Reuse story props**: hide the already-printed story-prop cards
       (2-4 different items), one of each. Good default, needs no extra
       printing.
     - **Real-fact item, many copies** (PREFERRED when there's a good real
       fact to hook it to): tie the search to something interesting and true
       about the topic — what it eats, what it's drawn to, what it collects
       (e.g. a camel topic → "find the cactus" because camels eat cactus; a
       squirrel topic → "find the acorns"). This needs its OWN item, set via
       `search_item: {name, image_prompt}` on game2 — see below. Prefer this
       whenever a genuine behavioral/dietary fact fits naturally; it makes
       the game more interesting than a generic prop hunt.
  3. **`type: "matching"`**: pair up simple printed cards by ONE clear,
     genuinely interesting trait — prefer a real behavioral/physical trait
     of the topic over a generic one when a good one exists (e.g. matching
     each animal to the sound it makes, to what it eats, to where it
     sleeps), falling back to size/shape/"same or not the same" only when
     no such trait fits naturally. Needs `game2.print_items` (see below) —
     one entry per distinct card image, unless it's a reuse-story-props
     match (see above), which needs no new images.
  4. **`type: "sorting"`**: sorting/counting printed cards or REAL objects of
     the topic into two or more piles by a trait — pick the trait the same
     way as `matching` above (a real, specific, interesting one first, a
     generic size/count split only as a fallback) — NOT LEGO bricks: those
     are already used plenty in Model Building/Game 1, no need to repeat
     that here. Needs `game2.print_items`: one entry per category (e.g. a
     "floats"/"dives" sort needs a floating-duck image and a diving-duck
     image, each with its own `copies`) — see КРИТИЧНО #15, this is exactly
     the mechanic that broke when the print asset was never defined.
  5. **`type: "compare"`**: hold up two printed cards or real objects side by
     side and answer ONE simple comparative question tied to a real trait of
     the topic (which is bigger/longer/heavier/taller) — not an open-ended
     "how are they different?". Needs `game2.print_items` with two entries,
     `copies: 1` each (the teacher holds these up, they aren't handed out).
  6. **`type: "pattern"`**: a simple AB repeating sequence children copy or
     extend — two topic-relevant colors alternating (e.g. red-blue-red-blue
     bricks), or a real pattern the topic actually has (zebra stripes,
     ladybug spots) recreated with printed cards or LEGO bricks. Keep it to
     a plain AB pattern (not AAB/ABC) — this age group is just meeting the
     concept for the first time. If done with printed cards (not bricks),
     needs `game2.print_items`: one entry per pattern unit, a few `copies`
     each (enough to lay out and extend one sequence, not a full class set).
  7. **`type: "shape_build"`** (narrow, LEGO-specific — use only when it
     genuinely fits, not as a default): children arrange a small sheet of
     loose brick-shape pieces to match a printed reference shape. Uses
     `shape_reference_prompt` + `shape_pieces_prompt`, not `print_items`.

  Selection test: if the topic has an accessible real object — almost
  always `sensory` (upgraded to `compare`/`sorting` when a second
  contrasting-texture material exists, see above). Otherwise, actively
  consider all of `search` (with a real-fact `search_item`), `matching`,
  `sorting`, `compare`, and `pattern` against the topic's actual real-world
  traits, and pick whichever gives the most concrete, specific, interesting
  game — not whichever you reached for last time. Reusing story props for a
  simple `search`/`matching` is a fine fallback when nothing more specific
  presents itself, but a topic-specific trait beats a generic reuse when
  one is available.

  For `matching` and for `search` when reusing story props, do NOT invent
  separate new images — reuse the ALREADY-printed story props (page 1 of the
  printable set, `story_props`). This keeps prep simple for the teacher.

  ⚠️ Print quantity, by mechanic: `search` with `search_item` needs about 8
  physical copies of the one item tiled on a full page (handled
  automatically once `game2.search_item` is set — you only provide `name`
  and a single `image_prompt`, photorealistic per Step 6 rules, on a plain
  white background). `matching`/`sorting` with `print_items` needs copies
  across all entries to sum to about 8 (one class set - e.g. 2 categories x
  4, or 4 pairs x 2) - set each entry's `copies` accordingly, the engine
  tiles them together on one page. `compare` needs only 1 copy per entry.
  `pattern` needs a handful (3-6) per unit. Never leave a `print_items`
  entry without a `copies` number, and never describe a card or category in
  the script that has no matching `print_items` entry - see КРИТИЧНО #15.
- **Game 3**: must physically use the built model, with the same chant
  structure as Game 1 (the same children's line + the teacher randomly picks
  1 of 2 responses), NEW words for the topic, as simple as possible (see the
  language rule under Game 1 AND the hard word-count ceiling in CRITICAL
  rule 16 - max 4-5 words per teacher response, same as Game 1). Both teacher
  responses must be SHORT and RHYME, same as Game 1's - say them out loud
  before finalizing, and count the words. REAL MISTAKE (topic Goat), never
  repeat this: "Climb up high, reach the sky, hop along, way up high!" (11
  words, and "high" used twice) and "Wind blows strong, hold on tight,
  creep down low, out of sight!" (11 words) - both far over the 5-word
  ceiling and read as full sentences, not a chant. FIX pattern: something
  like "Hop up high, touch the sky!" (6 words) / "Creep down low, nice and
  slow!" (6 words) - short, punchy, actually chantable by a beginner. You
  need TWO clearly different teacher commands with a clear reason tied to
  the topic's weather/mood (e.g. "sunny day, fly high!" / "storm is coming,
  fly low!") — simply a different height/speed of movement for the model,
  WITHOUT a specific destination.
  CRITICAL: NEVER mention an object/structure the kids haven't built yet
  (e.g. "fly to the hangar", "run to the house") — at this point in the
  lesson only the topic's own model has been built, the Challenge object
  only appears LATER. The final `action`/`teacher` line is a simple bridge
  into the Challenge (e.g. "Sky flew so high! Now let's build something to
  help Sky land safely."), without specifics of the solution (the actual
  demo-solving of the Challenge doesn't belong here, only in
  `challenge.text`/notes).

## Step 5 — Challenge
Pick an archetype from the "Challenge Archetypes" list (see the critical
rules above), NOT repeating the archetype used in the previous lesson of the
block. The wording should be concrete, measurable, understandable to a 3-5
year old.

`challenge.text` should read like a script where "the teacher solves it
themselves in front of the kids, then explicitly invites them to try":
the teacher builds, asks "good/safe/big enough?", kids say "no" in chorus
until it's done, then "yes" — ending with an explicit invitation "Now YOU
build your own...". Don't stretch the text beyond the slide's text budget,
but the spirit of demo+invitation should come through.

## Step 6 — image_prompt fields
`background_image_prompt` (story background): HORIZONTAL orientation, FULL
PHOTOREALISM (like an actual photograph of a scene, not an illustration/
painting), natural lighting, no people, no text, a calm and friendly scene
(nothing scary/dark). Exception: the sun and similar abstract natural
elements can stay cartoonish if photorealism doesn't read well for them —
use judgment.

The scene MUST match the topic's REAL habitat/typical setting, not a
generic or guessed nature backdrop - this is part of the mandatory fact
check (see Step 2). Real example of the mistake: an alligator background was
described as African - wrong, alligators live in the southeastern US (and a
small population in China); Africa has crocodiles, a different animal. Get
the actual real-world region/habitat right (e.g. cypress swamp/marsh of the
southeastern US for an alligator, not a generic "swamp" that could be
anywhere).

**Character props that are ALIVE (animals/insects/reptiles):** soft
semi-realism — true-to-life colors, textures, and body proportions, WITHOUT
extreme close-up detail (no compound eyes, hairs, scales up close — this can
scare 3-5 year olds) and WITHOUT cartoon cliches (no smiley faces, no giant
Disney eyes, no rosy cheeks — looks silly, not what's needed). A calm,
recognizable view of the whole creature, like a good children's book — not
a cartoon and not a macro photo.

**Object/vehicle props, EVEN IF they're the story's "main character"**
(a little airplane, a car, an umbrella, a rock, a balloon, etc.): ALWAYS
full photorealism — like a real photo of a toy/object, NOT a painted
illustration, NOT a "fluffy"/soft style. Real example of the mistake (topic
Airplane): the little airplane came out looking "like it's made of cotton
wool" — because the living-creature rule was applied to a piece of
machinery. An airplane, a car, any inanimate object — always a crisp
realistic photo, like in a toy catalog.

All character and object props are on a plain WHITE or transparent
background (for cutting out), no scene/decoration.

**Exception — `real_object_image_prompt`**: this is an ACTUAL photograph of
the topic's object (not LEGO, not an illustration) — phrase it as "A real
photograph of an actual [object], photorealistic, isolated on a plain white
background, no text". This is the only field that needs full studio-quality
photorealism (no scene, no natural background).

**Challenge image**: a real photo matching the meaning of the challenge,
WITHOUT any hint of LEGO/bricks/toys — just an ordinary realistic photograph
of whatever the challenge is about, on a white/transparent background.
⚠️ This gets broken often, read carefully: the photo is of the REAL-WORLD
OBJECT the challenge references, not a photo/render of what the LEGO
model would look like. If the challenge is "build a hill for your goat to
climb", the image is a real photograph of an actual hill (grass, dirt,
rocks - a real landscape photo) - NOT a LEGO hill, NOT a brick-built hill,
NOT any kind of toy/model render of a hill. If the challenge is "build a
nest", the image is a real photograph of an actual bird's nest (twigs,
real texture) - NOT a LEGO nest. Same rule as `real_object_image_prompt`
and story props: this field is ALWAYS a plain real-world photograph of the
plain real-world thing, exactly as if you searched Google Images for "real
[object] photo" - the fact that the challenge will be BUILT out of LEGO
afterward is completely irrelevant to what this image shows. If you catch
yourself writing anything like "LEGO-style", "toy version of", "brick
representation of", or imagining bricks/studs in this image_prompt at all -
that's the mistake, delete it and describe the plain real object instead.

## Step 7 — final QA review (act as a strict, separate reviewer)
Before returning anything, switch mindset: stop being the writer and become
a strict external QA reviewer seeing this content for the first time, whose
only job is to find problems, not to defend what was just written. Go
through every item below one by one. If ANYTHING fails, fix it and re-check
the whole list again from the top - do not submit content that fails even
one check, and do not rationalize a borderline case as "probably fine".
- [ ] The story leads to building a model of the TOPIC, not a derived object (house/container — belongs in challenge)
- [ ] Every child builds THEIR OWN model from scratch, the story doesn't imply "fixing"/"finishing" the character's model
- [ ] The story's conflict is concrete and playable with 2-3 paper props (test: could the teacher physically show this?)
- [ ] The story includes at least one REAL physical hands-on interaction with the children (a prop visiting each child in turn, a feeding gesture, etc.) - not just a chorus line said once (rule 17)
- [ ] Challenge image_prompt describes a plain REAL-WORLD photograph of the object (a real hill, a real nest) - it does NOT describe a LEGO/brick/toy version of it
- [ ] No part of a printed prop moves/opens/flaps on its own (wings, mouth, tail, legs) - a flat cutout is rigid; use an honest prop-swap for any "before/after" state instead
- [ ] No extra invented human characters — only the teacher minifigure + (if needed) a personification of the topic itself
- [ ] Challenge does NOT use moving/functional parts (that's Brickmoto, not Preschool)
- [ ] Challenge target is a concrete buildable STRUCTURE, never an environment/terrain (no "build a swamp/forest/ocean" - those aren't buildable, only real objects like a log, nest, fence, bridge are)
- [ ] Challenge isn't "just bigger" — there's a measurable/comparative element
- [ ] Challenge is ALWAYS about building, not a test of the finished model (throwing/pushing/racing are forbidden)
- [ ] The cover has no photo fields
- [ ] presentation_qa has at least 4 pairs
- [ ] game1/game2/game3 use the script format (not a wall of text), lines are color-only, no bold/underline
- [ ] The story format archetype is tagged accurately in `story.archetype` and doesn't match what the prompt told you is on cooldown (see the pool of 6 formats)
- [ ] Game 1 — the same children's chant + the teacher randomly picks 1 of 2 rhymed responses (running/action-in-place), NEW words for the topic; `structure_tag` matches what you actually wrote and isn't on cooldown per the prompt; say both teacher lines out loud — do they actually rhyme and scan, or just kind of? COUNT THE WORDS: children line <= 6 words, each teacher response <= 5 words total (rule 16) - if over 5, shorten it now, no exceptions.
- [ ] Game 1's Round 2 and Round 3 are NOT the same option as each other (Round 3 is always chase, Round 2 is always the other one) - reread the actual text of rounds 2 and 3, they must not be verbatim identical
- [ ] Game 1's question structure is genuinely different from the last couple of lessons, not just the same "what do we do?" shape with the topic word swapped in
- [ ] Game 2 — a fitting format was chosen from the pool (sensory/search/matching/sorting/compare/pattern/shape_build), not defaulting to `search`/size-sorting out of habit; `sensory` used whenever a real object exists regardless of recent history, UPGRADED to `compare`/`sorting` by texture when a second contrasting-texture material genuinely exists (not left as a thin single-object touch-and-say-one-word game); you actually ran the pedagogy/language/motor/print-logistics four-angle pass on this game (see Step 4) rather than committing to the first idea; every teacher line here also respects the ~5-word ceiling
- [ ] Game 2's sorting/matching/compare/pattern trait is a real, specific, interesting fact about the topic where one was available, not a lazy default (size/color) chosen without considering alternatives
- [ ] Every physical item the story or any game asks a child to find/sort/match/hold/collect individually has a real print asset backing it (`game2.print_items` with `image_prompt` + `copies`, `game2.search_item`, `game2.colors`, or a handout `story_props` entry with `class_copies`) — reread every game script line by line and confirm nothing describes a physical object with nothing printed for it (the duck-sorting bug)
- [ ] Print copy counts make sense for how the item is used: ~8 total when each child gets their own piece (search/matching/sorting/most handouts), 1 each for a `compare` the teacher just holds up, a handful per unit for `pattern`
- [ ] Challenge.text ends with an explicit "Now YOU build your own..." invitation
- [ ] Game 3 — two clear slow/fast commands with a clear reason, both teacher lines short and rhyming like Game 1's, COUNT THE WORDS (<= 5 total per response, rule 16)
- [ ] Challenge — the archetype differs from the previous lesson in the block
- [ ] All youtube ids were found via web_search in this same chat, not from memory
- [ ] No em-dashes anywhere in the text
- [ ] Numbers in prose are spelled out, except Game N labels
- [ ] Presentation questions rely only on what was covered in Story/Observation
- [ ] Story Props <= 4 items, all directly on-topic, every prop has a valid `role` (character/handout); any handout that each child receives individually during the story has `class_copies` set (not just the single storytelling cutout)
- [ ] Every factual claim about the real animal/object has been fact-checked (not just plausible-sounding) - see the camel-humps example
- [ ] The JSON is valid (no fields missing from content.schema.md)

## Output
One `content/<topic_slug>.json` file, fully self-contained — from there it's
handled only by the engine (build-pptx.js / build-print-pdf.js /
qa-validate.js), no further instructions needed in chat.
