# Core lesson language build reference

Spanish Core lessons provide the **interaction template** for every target language. Keep the shared UI and progress behavior in one implementation; supply language-specific words, passages, audio, and review separately. A shared interface does not imply that every module has reviewed content in every language.

## The shared path

1. `src/data/languages.ts` lists target and native languages. The selected pair is carried in app state.
2. `src/components/guide/AppGuide.tsx` passes both languages and the lesson word list to the shared `LessonPracticeKit` for the word-practice parts of Recall, Hear, Type, and Write. See and Speak have their own shared components. `getCurriculum(moduleId)` supplies the lesson sequence and objectives; it does not select translated content by itself. The practice kit is remounted when the module, lesson, language pair, or word list changes, including a regenerated list of the same length.
3. `src/lib/lesson-words.ts` resolves each word list in order: authored words for their exact target/native pair, authored lesson content, a matching static deck, that pair's local cache, then generation. `src/lib/lesson-words-core.ts` validates lists and keys the cache by module, lesson, target, and native language. Never serve Spanish/English authored words to a different pair by swapping labels.
   `src/lib/lesson-definition.ts` uses the same authored-pair check when it builds review definitions, including English-for-work stages.
4. `LessonWord.es` means **target-language text** and `LessonWord.en` means **native-language text**. Those historical field names are not a license to hardcode Spanish or English in new UI. `src/lib/lesson-card-direction.ts` maps these fields to native-first or target-first faces. `LessonPracticeKit` gets the visible language names, language tags, and target-language speech locale from the selected pair.
5. The Core Cards direction control is native → target or target → native for every pair. A learner can tap the card to flip and use Again or Got it from either face. Switching direction resets only the face, not the queue or lesson progress. Pronounce plays the target-language side in both directions.

## When changing Spanish Core

- Change the shared component or helper when the behavior should apply to every language. Check both directions and both grading faces with Spanish/English, a non-Spanish target such as French/English, and English/Spanish for English-for-work. The unit test covers all selectable pairs at the data-mapping level.
- Keep language-specific vocabulary, passages, examples, and teaching settings behind their exact pair. Verify the source and translation for each new pair; a generated or static word list is not human-reviewed lesson parity.
- Recheck language tags, pronunciation locale, typing/handwriting behavior, small-screen fit, and the stored progress key. A direction toggle should not create or reset progress.
- For a new target language, update the language registry and its speech/typing support, provide the reviewed lesson content or a clearly labeled draft fallback, and verify the full See → Recall → Hear → Type → Write → Speak path on phone and desktop before claiming that module is complete.

## Current scope and limits

This reference covers the **Core lesson interaction code**. The standalone general Cards screen lives in `src/components/flashcards/FlashcardsStudio.tsx` and has its own study direction control. Both should retain the same native/target meaning. Reviewed content and offline audio availability vary by language and module; do not infer parity from the shared template.

The shared Core card UI was checked in a 375 × 667 phone viewport using the available Construction Foreman lesson deck for Spanish, French, German, Italian, Japanese, Chinese, Korean, Portuguese, Pashto, and English (with Spanish as its native language). Every pair showed both direction buttons, changed the front text when switched, and kept grading available before and after flipping. This verifies the card interaction, not the quality or review status of those lesson translations. English-for-work Foundation has a sign-in gate; its authored-pair definition is covered by the source tests.
