// team-data.js
// The Star Team roster - shared by the constellation and the star profile view.

const STAR_TEAM = [
  {
    id: "captain",
    icon: "👑",
    name: "Captain",
    role: "You",
    blurb: "Boss, you are the Captain of the Star Team.",
    details: "The Star Team exists to serve one Captain - you. Every lesson, every fix, every rule the team follows was trained and approved through you.",
    hasDuties: false,
    color: "#FCD900"
  },
  {
    id: "andrei",
    icon: "🧑‍🚀",
    name: "Andrei Terekhov",
    role: "Star Assistant - Head of the Team",
    blurb: "Andrei trains, teaches, and writes the rules every star follows. Presenting your Star Team!",
    details: "Andrei is the only human on the crew, connected to every other star by his own hand - he wrote the story rules, the layout logic, the image style guide, and personally trains each star through real feedback, lesson by lesson.",
    hasDuties: true,
    color: "#3095D4",
    isHub: true
  },
  {
    id: "story",
    icon: "📖",
    name: "Story Star",
    role: "Writer",
    blurb: "A talented AI story agent - young, but learns fast. Writes every story, game, and challenge.",
    details: "Writes the Story, Game 1/2/3, and Challenge for every lesson - picks a fresh story format each time, keeps every action physically playable with paper props, fact-checks real animal/object details, and always rhymes Game 1 & 3.",
    hasDuties: true,
    color: "#D03331"
  },
  {
    id: "design",
    icon: "🎨",
    name: "Design Star",
    role: "Illustrator",
    blurb: "A talented AI design agent - young, but learns fast. Paints every picture in the lesson.",
    details: "Generates every image in the lesson - the story background, the cut-out props, the real object photo, and the Challenge illustration. Follows strict style rules: photorealistic for objects, soft semi-realism for living creatures, always with clean margins so nothing gets cropped.",
    hasDuties: true,
    color: "#A441C2"
  },
  {
    id: "assembly",
    icon: "🧱",
    name: "Assembly Star",
    role: "Builder",
    blurb: "A talented AI agent - young, but learns fast. Assembles the whole presentation, slide by slide.",
    details: "Builds the full PPTX - cover, story, games, challenge, letter slides, and more - following the visual design system exactly, with text sizing that auto-shrinks to fit so nothing overflows the slide.",
    hasDuties: true,
    color: "#6FC141"
  },
  {
    id: "checking",
    icon: "🔍",
    name: "Checking Star",
    role: "Inspector",
    blurb: "A talented AI agent - young, but learns fast. Checks everything before it ever reaches you.",
    details: "Checks slide layout bounds, verifies every YouTube video actually works, scans generated photos for cropping (like ears or tails cut off at the edge), and flags anything that isn't ready before it reaches you.",
    hasDuties: true,
    color: "#0097A7"
  },
  {
    id: "printing",
    icon: "🖨️",
    name: "Printing Star",
    role: "Printer",
    blurb: "A talented AI agent - young, but learns fast. Prepares the printable handout for the classroom.",
    details: "Builds the printable PDF - story props sized by role (character vs handout), the story background, the full script for the teacher, and the letter pattern sheet, all portrait format ready to print.",
    hasDuties: true,
    color: "#FCD900"
  }
];
