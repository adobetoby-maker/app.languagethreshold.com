import assert from "node:assert/strict";
import test from "node:test";
import { formFamilies, splitForm, regularPresent, personForEnding, explainIrregular, formIssues } from "../src/lib/verb-games/classify.ts";
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
  assert.deepEqual(formFamilies("oír", "yo", "oigo"), ["es.present.go-yo"]); // R3b: -igo yo is go-yo
  assert.equal(regularPresent("levantarse"), null);
});

test("-go rule ignores stem-change and -guir forms", () => {
  assert.deepEqual(formFamilies("jugar", "yo", "juego"), ["es.present.o-ue"]);
  assert.deepEqual(formFamilies("negar", "yo", "niego"), ["es.present.e-ie"]);
  assert.deepEqual(formFamilies("seguir", "yo", "sigo"), ["es.present.e-i"]); // R3: e-i through gu→g, never go-yo
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

const set = (yo, tu, el, nos, ellos) => ({ yo, tú: tu, él_ella_usted: el, nosotros: nos, ellos_ustedes: ellos });

test("R3: stem change is found through a spelling shift; a bare spelling shift is not a stem change", () => {
  assert.deepEqual(formFamilies("conseguir", "yo", "consigo"), ["es.present.e-i"]);
  assert.deepEqual(formFamilies("corregir", "yo", "corrijo"), ["es.present.e-i"]);
  assert.deepEqual(formFamilies("elegir", "yo", "elijo"), ["es.present.e-i"]);
  assert.deepEqual(formFamilies("torcer", "yo", "tuerzo"), ["es.present.o-ue"]);
  assert.deepEqual(formFamilies("seguir", "yo", "siguo"), []); // the unshifted spelling is wrong
  assert.deepEqual(formFamilies("vencer", "yo", "venzo"), []); // c→z alone is not a stem change
  assert.deepEqual(formFamilies("dirigir", "yo", "dirijo"), []);
  assert.notDeepEqual(formFamilies("seguir", "yo", "sigo"), ["es.present.go-yo"]);
});

test("R3b: -go yo needs an -er/-ir verb; caer, traer, oír are go-yo", () => {
  assert.deepEqual(formFamilies("caer", "yo", "caigo"), ["es.present.go-yo"]);
  assert.deepEqual(formFamilies("traer", "yo", "traigo"), ["es.present.go-yo"]);
  assert.deepEqual(formFamilies("planchar", "yo", "planchago"), []);
  assert.deepEqual(formFamilies("distinguir", "yo", "distingo"), []);
});

test("explainIrregular names standard irregular patterns and nothing else", () => {
  assert.equal(explainIrregular("conocer", "yo", "conozco"), "zc");
  assert.equal(explainIrregular("vencer", "yo", "venzo"), "c→z");
  assert.equal(explainIrregular("dirigir", "yo", "dirijo"), "g→j");
  assert.equal(explainIrregular("distinguir", "yo", "distingo"), "gu→g");
  assert.equal(explainIrregular("construir", "tú", "construyes"), "uy");
  assert.equal(explainIrregular("enviar", "yo", "envío"), "accent");
  assert.equal(explainIrregular("continuar", "ellos_ustedes", "continúan"), "accent");
  assert.equal(explainIrregular("estar", "tú", "estás"), "irregular");
  assert.equal(explainIrregular("enfriar", "yo", "enfría"), null);
  assert.equal(explainIrregular("planchar", "ellos_ustedes", "plancha"), null);
  assert.equal(explainIrregular("monitorear", "tú", "monitoreás"), null);
  assert.equal(explainIrregular("enviar", "nosotros", "envíamos"), null);
  assert.equal(explainIrregular("estar", "tú", "estas"), null);
});

test("R1: formIssues flags untagged, unexplained and inconsistent forms", () => {
  assert.deepEqual(formIssues("tener", set("tengo", "tienes", "tiene", "tenemos", "tienen")), []);
  assert.deepEqual(formIssues("conocer", set("conozco", "conoces", "conoce", "conocemos", "conocen")), []);
  assert.deepEqual(formIssues("ser", set("soy", "eres", "es", "somos", "son")), []);
  assert.deepEqual(formIssues("enviar", set("envío", "envías", "envía", "enviamos", "envían")), []);
  assert.deepEqual(formIssues("planchar", set("plancho", "planchas", "plancha", "planchamos", "plancha")), ["ellos_ustedes"]);
  assert.deepEqual(formIssues("enfriar", set("enfría", "enfrías", "enfría", "enfriamos", "enfrían")), ["yo"]);
  assert.deepEqual(formIssues("monitorear", set("monitoreo", "monitoreás", "monitorea", "monitoreamos", "monitoreán")), ["tú", "ellos_ustedes"]);
  // renovo is the regular -ar form, but the other persons change o → ue: inconsistent
  assert.deepEqual(formIssues("renovar", set("renovo", "renuevas", "renueva", "renovamos", "renuevan")), ["yo"]);
  assert.deepEqual(formIssues("tener", set("tengo", "tienes", "tiene", "tenemos", "tenen")), ["ellos_ustedes"]);
  // a single accented typo among regular persons is inconsistent
  assert.deepEqual(formIssues("estudiar", set("estudío", "estudias", "estudia", "estudiamos", "estudian")), ["yo"]);
  assert.deepEqual(formIssues("estar", set("estoy", "estas", "está", "estamos", "están")), ["tú"]);
});
