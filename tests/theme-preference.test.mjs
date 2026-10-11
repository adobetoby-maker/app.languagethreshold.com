import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_STATE_KEY,
  THEME_PREFERENCE_KEY,
  readDarkModePreference,
} from "../src/lib/theme-preference.ts";

function saved(values = {}) {
  return { getItem: (key) => values[key] ?? null };
}

test("standalone pages default to the app's midnight theme", () => {
  assert.equal(readDarkModePreference(saved()), true);
});

test("existing learning-app theme carries into standalone pages", () => {
  assert.equal(readDarkModePreference(saved({ [APP_STATE_KEY]: '{"darkMode":false}' })), false);
  assert.equal(readDarkModePreference(saved({ [APP_STATE_KEY]: '{"darkMode":true}' })), true);
});

test("explicit choice wins over older app state", () => {
  assert.equal(
    readDarkModePreference(
      saved({ [THEME_PREFERENCE_KEY]: "light", [APP_STATE_KEY]: '{"darkMode":true}' }),
    ),
    false,
  );
  assert.equal(
    readDarkModePreference(
      saved({ [THEME_PREFERENCE_KEY]: "dark", [APP_STATE_KEY]: '{"darkMode":false}' }),
    ),
    true,
  );
});

test("blocked storage keeps the usable dark default", () => {
  assert.equal(
    readDarkModePreference({
      getItem: () => {
        throw new Error("Storage blocked");
      },
    }),
    true,
  );
});
