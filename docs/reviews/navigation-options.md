# Three navigation options

This review PR offers three working layouts for desktop and the mobile More menu.
Each uses Learn (Reader, Story, Core 60), Practice (Speak, Cards, Games, Field Prep),
and Reference (Grammar, Dictionary, Cognates). Module/language visibility rules,
existing tab navigation, Exams routing, Pricing and settings remain available.

- `?navVersion=sections`: visible section labels; secondary practice tools under Practice Lab.
- `?navVersion=accordion`: expandable Learn, Practice and Reference groups, with the
  active group and active nested tool kept visible.
- `?navVersion=focused`: bordered intent cards with a shorter primary list and secondary
  tools in expandable menus; Practice Lab contains the practice long tail.

The query selector works only in preview/development builds. Production always uses
Sections until a reviewed choice is made; there is no variant chooser in the product.
The mobile dock keeps Reader, Cards, Speak and Core 60, plus More and Tutor, reducing
crowding. More uses the same categorized list as desktop and closes after a selection.
No tools are removed. Standard buttons retain keyboard support, visible focus,
44px minimum touch targets, aria-current and expandable-menu semantics. Desktop
navigation scrolls independently on shorter screens.

Validation: grouping, production query isolation, every tool present exactly once in
each design, active state, and desktop/mobile rendering have automated coverage.
Compare all three preview links at desktop and phone widths, open Practice Lab, switch
between tools, and check pricing/settings and module/language-specific tools.
Measure median first-sign-in to first completed lesson over four weeks after selecting
and shipping a design; this PR does not claim a conversion or learning-time result.
