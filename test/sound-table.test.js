import assert from "node:assert/strict";
import { test } from "node:test";

import { SOUNDS } from "../src/sound/table.js";
import { VOICES } from "../src/sound/voices.js";

// Решение 4: звук и видимый двойник равноправны. У каждого звука есть
// двойник в мире и подпись, а у каждого голоса — строка в таблице.
test(`у каждого звука есть двойник и подпись`, () => {
  for (const [id, { caption, twin }] of Object.entries(SOUNDS)) {
    assert.ok(caption?.trim(), `${id}: нет подписи`);
    assert.ok(twin?.trim(), `${id}: нет двойника`);
    assert.equal(typeof VOICES[id], `function`, `${id}: нет голоса`);
  }
});

test(`нет голоса без строки в таблице`, () => {
  for (const id of Object.keys(VOICES)) {
    assert.ok(SOUNDS[id], `${id}: звучит, но не описан`);
  }
});
