import assert from "node:assert/strict";
import test from "node:test";
import { formFamilies, splitForm, regularPresent, personForEnding } from "../src/lib/verb-games/classify.ts";
import { reasonText, FAMILIES, familyById, isFamilyId, PERSON_LABEL } from "../src/lib/verb-games/families.ts";
import { PERSONS } from "../src/lib/verb-games/types.ts";

test("regular and irregular forms land in the right families", () => {
  assert.deepEqual(formFamilies("hablar", "yo", "hablo"), ["es.present.ar"]);
  assert.deepEqual(formFamilies("tener", "yo", "tengo"), ["es.present.go-yo"]);
  assert.deepEqual(formFamilies("tener", "tú", "tienes"), ["es.present.e-ie"]);
  assert.deepEqual(formFamilies("tener", "nosotros", "tenemos"), ["es.present.er"]);
  assert.deepEqual(formFamilies("poder", "ellos_ustedes", "pueden"), ["es.present.o-ue"]);
  assert.deepEqual(formFamilies("pedir", "tú", "pides"), ["es.present.e-i"]);
  assert.deepEqual(formFamilies("decir", "yo", "digo"), ["es.present.go-yo"]);
  assert.deepEqual(formFamilies("conocer", "yo", "conozco"), []);
  assert.deepEqual(formFamilies("oír", "yo", "oigo"), []); // no regular prediction
  assert.equal(regularPresent("levantarse"), null);
});

test("-go rule ignores stem-change and -guir forms", () => {
  assert.deepEqual(formFamilies("jugar", "yo", "juego"), ["es.present.o-ue"]);
  assert.deepEqual(formFamilies("negar", "yo", "niego"), ["es.present.e-ie"]);
  assert.deepEqual(formFamilies("seguir", "yo", "sigo"), []);
  assert.deepEqual(formFamilies("seguir", "tú", "sigues"), ["es.present.e-i"]);
});

test("splits pieces and builds reasons from family rules only", () => {
  assert.deepEqual(splitForm("venir", "yo", "vengo", ["es.present.go-yo"]), { stem: "ven", ending: "go" });
  assert.deepEqual(splitForm("tener", "tú", "tienes", ["es.present.e-ie"]), { stem: "tien", ending: "es" });
  assert.equal(reasonText("es.present.go-yo", { infinitive: "salir", person: "yo", ending: "go" }),
    "salir is a -go verb: the yo form ends in -go.");
  assert.equal(reasonText("es.present.ar", { infinitive: "hablar", person: "tú", ending: "as" }),
    "hablar is a regular -ar verb: tú takes -as.");
  assert.equal(reasonText("es.present.o-ue", { infinitive: "jugar", person: "yo", ending: "o" }),
    "jugar changes u → ue in every form except nosotros.");
  assert.equal(FAMILIES.length, 7);
});

test("family table carries pinned labels, pills and helpers", () => {
  assert.deepEqual([...PERSONS], ["yo", "tú", "él_ella_usted", "nosotros", "ellos_ustedes"]);
  assert.equal(PERSON_LABEL.él_ella_usted, "él/ella/usted");
  assert.equal(familyById("es.present.go-yo").label, 'The "-go" family');
  assert.equal(familyById("es.present.go-yo").pill, "-go yo form");
  assert.equal(familyById("es.present.e-ie").pill, "e → ie");
  assert.deepEqual(familyById("es.present.e-ie").appliesTo, ["yo", "tú", "él_ella_usted", "ellos_ustedes"]);
  assert.deepEqual(familyById("es.present.go-yo").appliesTo, ["yo"]);
  assert.equal(familyById("es.present.ir").frame.template, "-o · -es · -e · -imos · -en");
  assert.equal(isFamilyId("es.present.ar"), true);
  assert.equal(isFamilyId("es.present.nope"), false);
  assert.equal(isFamilyId(7), false);
});

test("person-ending table is shared with splitForm", () => {
  assert.equal(personForEnding("o"), "yo");
  assert.equal(personForEnding("es"), "tú");
  assert.equal(personForEnding("e"), "él_ella_usted");
  assert.equal(personForEnding("imos"), "nosotros");
  assert.equal(personForEnding("en"), "ellos_ustedes");
  assert.equal(personForEnding("go"), null);
  assert.deepEqual(splitForm("hablar", "nosotros", "hablamos", ["es.present.ar"]), { stem: "habl", ending: "amos" });
  assert.deepEqual(splitForm("x", "yo", "zzz", []), { stem: "zzz", ending: "" });
});
