# Global Claude Instructions

## Markdown & Documentation Files

When the user asks you to create documentation or markdown files, follow these rules.

First, create the file at the full path `~/Documents/docs/[project-name]/[filename].md` where `project-name` is the current project you're working on and `filename` is a descriptive name for the feature or topic.

Second, structure the markdown with clear sections like Overview, Implementation Details, Design Decisions, Future Considerations, and any relevant code snippets or references.

Third, extract tags that describe the content — these could relate to technology stack, feature area, decision type, status, or any other relevant category. You decide what tags make sense based on the content.

Fourth, at the end of the markdown file, include wiki-style links to tag files using double brackets syntax like `[[tag-name]]`.

Fifth, for each tag you use, check if a tag file exists at `~/Documents/docs/_tags/[tag-name].md`. If it doesn't exist, create it with a brief description of what that tag represents and include a section at the bottom called "Used in" with a backlink to the markdown file you just created, formatted as `[[project-name/filename]]`.

Sixth, if a tag file already exists, update the "Used in" section to add the backlink to the new markdown file.

Seventh, keep all tag files organized in the `~/Documents/docs/_tags/` folder. This way Obsidian will treat each tag as a node in your knowledge graph and show actual connections between feature markdowns and their related tags.

Eighth, any diagrams, flowcharts, architecture diagrams, sequence diagrams, or other visual representations included in the markdown should be created using Mermaid syntax inside a `mermaid` code block. Apply meaningful color coding using Mermaid's `style` or `classDef` directives — nodes or elements that belong to the same category, layer, or role should share the same color. Color should encode semantics (e.g. all database nodes are one color, all API services another, all external dependencies another), not just decoration.

Ninth, only when creating a Mermaid diagram, read `~/Documents/docs/_meta/mermaid-palette.md` first to load the shared color registry. Always use overlay tint style — light pastel fill + colored stroke + dark text (`color:#1a1a1a`), never solid filled blocks. In classDef declarations use the format `fill:<Fill>,stroke:<Stroke>,color:#1a1a1a`. Match diagram elements to existing semantic categories and reuse their fill/stroke pairs. If a diagram element doesn't fit any existing category, create a new pastel fill + accent stroke pair that doesn't clash with existing entries, use it in the diagram, and append a new row to the palette file in the format: `| category-name | #FILL | #STROKE | description |`. This keeps all diagrams visually consistent over time — same concept always gets the same colors, regardless of which doc or project it appears in.

Tenth, read `~/Documents/docs/_meta/structure.md` at the start of every markdown file creation so accumulated preferences apply automatically. Whenever the user states a formatting or style preference — whether proactively ("always do X", "from now on…") or as feedback on a produced doc (asks to restructure, rejects an approach, changes wording) — infer the generalizable rule, scan existing entries for any rule covering the same topic, and update or append it. Save only the transferable principle, not the specific instance. The most recent decision always wins. After saving, briefly surface the inferred rule to the user — e.g. "saved to structure.md: *diagrams precede prose*" — so they can correct it immediately if the inference was wrong.
