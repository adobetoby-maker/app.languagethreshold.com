import type { CoreGrammarPattern } from "./core-speaking";

export const CHINESE_GRAMMAR_EXTENSIONS: CoreGrammarPattern[] = [
  { id: "zh-shi", name: "是 (to be)", meaning: "identify or equate two things", pattern: "A 是 B", examples: ["我是学生。", "这是医院。"], phase: 1 },
  { id: "zh-you", name: "有 (have / there is)", meaning: "express possession or existence", pattern: "A 有 B · 有 B", examples: ["我有一个问题。", "这里有车站。"], phase: 1 },
  { id: "zh-zai", name: "在 (location / progressive)", meaning: "say where something is or what is happening now", pattern: "A 在 B · 在 + verb", examples: ["我在医院。", "他在打电话。"], phase: 1 },
  { id: "zh-negation", name: "Negation with 不 and 没", meaning: "say not (habitual/future) vs not (past/completion)", pattern: "不 + verb/adj · 没(有) + verb", examples: ["我不懂。", "我没去。"], phase: 1 },
  { id: "zh-ma", name: "Yes/no questions with 吗", meaning: "turn a statement into a yes/no question", pattern: "[statement] 吗？", examples: ["你有预约吗？", "可以在这里付款吗？"], phase: 1 },
  { id: "zh-wh", name: "Information questions", meaning: "ask who, what, where, when, why, how", pattern: "谁 / 什么 / 哪儿 / 什么时候 / 为什么 / 怎么", examples: ["车站在哪儿？", "什么时候可以来？"], phase: 1 },
  { id: "zh-le-core", name: "Completed action with 了", meaning: "mark a completed or changed situation", pattern: "verb + 了", examples: ["我打了电话。", "他来了。"], phase: 1 },
  { id: "zh-measure", name: "Measure words", meaning: "count nouns with the correct classifier", pattern: "number + measure word + noun", examples: ["一个人", "三杯水", "两张票"], phase: 1 },
  { id: "zh-de", name: "Modification with 的", meaning: "link a description or possessor to a noun", pattern: "[modifier] 的 [noun]", examples: ["我的电话", "昨天的预约"], phase: 1 },
  { id: "zh-want-core", name: "Want and intention", meaning: "express desire or plan", pattern: "想 / 要 + verb", examples: ["我想学中文。", "我要去医院。"], phase: 1 },
  { id: "zh-can-core", name: "Ability and permission", meaning: "say can, know how, or may", pattern: "会 / 能 / 可以 + verb", examples: ["我会说一点中文。", "可以坐这里吗？"], phase: 1 },
  { id: "zh-please", name: "Polite requests", meaning: "ask someone to do something politely", pattern: "请 + verb · 麻烦你…", examples: ["请再说一次。", "麻烦你帮我一下。"], phase: 1 },
  { id: "zh-compare", name: "Comparisons with 比", meaning: "compare two options", pattern: "A 比 B + adjective", examples: ["火车比汽车快。", "这个更便宜。"], phase: 2 },
  { id: "zh-guo", name: "Past experience with 过", meaning: "say whether you have ever done something", pattern: "verb + 过", examples: ["我去过中国。", "我没吃过这个。"], phase: 2 },
  { id: "zh-ba", name: "Disposal with 把", meaning: "highlight what is handled or moved", pattern: "把 + object + verb", examples: ["请把护照给我。", "我把钥匙忘了。"], phase: 2 },
  { id: "zh-result", name: "Result complements", meaning: "show the result of an action", pattern: "verb + 完 / 好 / 到 / 见", examples: ["我说完了。", "我找到了。"], phase: 2 },
  { id: "zh-direction", name: "Direction of action", meaning: "show direction of the action", pattern: "verb + 来 / 去 / 上 / 下 / 进 / 出", examples: ["请进来。", "拿出来。"], phase: 2 },
  { id: "zh-if", name: "Conditions with 如果 / 的话", meaning: "say what happens if a condition is met", pattern: "如果… · …的话", examples: ["如果有时间，我就去。", "有问题的话，请打电话。"], phase: 2 },
];
