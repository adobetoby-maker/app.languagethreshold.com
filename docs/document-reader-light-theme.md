# Paper-like themes and Progress readability

Light uses warm ivory paper (`#F6F2E9`), white cards, navy text (`#132737`) and teal actions (`#146E73`). Gold stays as a brand accent; gold text uses darker ink (`#86600F`) on light surfaces. Dark retains midnight surfaces and uses bright, readable text for status information.

Progress now uses opaque cards, larger sans-serif labels, clearer rank text and readable locked states. Travel-break panels use separate foreground and background colors in each theme. Warm streak notices, reminder panels, achievement notifications and navigation labels also use legible theme-specific ink.

| Role                 | Light     | Dark      |
| -------------------- | --------- | --------- |
| Information text     | `#155366` | `#C5E8F2` |
| Information panel    | `#E9F2F5` | `#17323E` |
| Streak text          | `#823810` | `#FFD2A6` |
| Streak panel         | `#FFF3E5` | `#372A20` |
| Progress accent text | `#146E73` | `#B8E5DC` |

Typography is upright across the app, including semantic emphasis and older italic utility classes. System Georgia/Cambria headings give a clear printed serif; Inter provides clean body text. Emphasis uses weight rather than slant. The unused display font and its italic variant are no longer requested. The existing theme default and stored Light/Dark preferences are preserved.

Validation: four desktop/iPhone theme checks verify upright lettering, the intended Inter body font, no horizontal overflow and at least 4.5:1 contrast for the tested travel-break labels and visible achievement descriptions. The local regression suite passed 93 tests with 22 skips. Type checking, lint and the production build pass. Preview screenshots use synthetic progress data, not a customer's account.
