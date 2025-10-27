export const REPS = [
  [/ch/g, "t͡ʃ"],
  [/ll/g, "ʝ"],
  [/rr/g, "r"],
  [/r(?=[bdgvlrmn])/g, "ɾ"],
  [/r/g, "r"],
  [/ñ/g, "ɲ"],
  [/j/g, "x"],
  [/gü/g, "ɡw"],
  [/gue/g, "ɡe"],
  [/gui/g, "ɡi"],
  [/qu/g, "k"],
  [/c([ei])/g, "θ$1"],
  [/c/g, "k"],
  [/z/g, "θ"],
  [/v/g, "b"],
  [/h/g, ""],
  [/y/g, "ʝ"],
  [/x/g, "ks"],
];
export const ENDINGS = {
  present: {
    ar: ["o", "as", "a", "amos", "áis", "an"],
    er: ["o", "es", "e", "emos", "éis", "en"],
    ir: ["o", "es", "e", "imos", "ís", "en"],
  },
  preterite: {
    ar: ["é", "aste", "ó", "amos", "asteis", "aron"],
    er: ["í", "iste", "ió", "imos", "isteis", "ieron"],
    ir: ["í", "iste", "ió", "imos", "isteis", "ieron"],
  },
};
export const IRREGULARS = {
  ser: {
    present: ["soy", "eres", "es", "somos", "sois", "son"],
    preterite: ["fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"],
  },
  ir: {
    present: ["voy", "vas", "va", "vamos", "vais", "van"],
    preterite: ["fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"], // same as ser
  },
  estar: {
    present: ["estoy", "estás", "está", "estamos", "estáis", "están"],
    preterite: [
      "estuve",
      "estuviste",
      "estuvo",
      "estuvimos",
      "estuvisteis",
      "estuvieron",
    ],
  },
  tener: {
    present: ["tengo", "tienes", "tiene", "tenemos", "tenéis", "tienen"],
    preterite: ["tuve", "tuviste", "tuvo", "tuvimos", "tuvisteis", "tuvieron"],
  },
  haber: {
    present: ["he", "has", "ha/hay", "hemos", "habéis", "han"],
    preterite: ["hube", "hubiste", "hubo", "hubimos", "hubisteis", "hubieron"],
  },
};
export const PERSONS = [
  "yo",
  "tú",
  "él/ella/usted",
  "nosotros/as",
  "vosotros/as",
  "ellos/ellas/ustedes",
];
