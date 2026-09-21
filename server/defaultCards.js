/**
 * Starter deck (~50 words) covering animals, nature, colors, numbers,
 * family, objects, food, greetings, qualities, time and verbs.
 * Translations were chosen for everyday, neutral usage.
 */
const DEFAULT_CARDS = [
  { category: 'Tiere', sl: 'pes', en: 'dog', de: 'Hund', fr: 'chien' },
  { category: 'Tiere', sl: 'mačka', en: 'cat', de: 'Katze', fr: 'chat' },
  { category: 'Tiere', sl: 'ptica', en: 'bird', de: 'Vogel', fr: 'oiseau' },
  { category: 'Tiere', sl: 'riba', en: 'fish', de: 'Fisch', fr: 'poisson' },

  { category: 'Natur', sl: 'sonce', en: 'sun', de: 'Sonne', fr: 'soleil' },
  { category: 'Natur', sl: 'luna', en: 'moon', de: 'Mond', fr: 'lune' },
  { category: 'Natur', sl: 'drevo', en: 'tree', de: 'Baum', fr: 'arbre' },
  { category: 'Natur', sl: 'roža', en: 'flower', de: 'Blume', fr: 'fleur' },
  { category: 'Natur', sl: 'voda', en: 'water', de: 'Wasser', fr: 'eau' },

  { category: 'Farben', sl: 'rdeča', en: 'red', de: 'rot', fr: 'rouge' },
  { category: 'Farben', sl: 'modra', en: 'blue', de: 'blau', fr: 'bleu' },
  { category: 'Farben', sl: 'zelena', en: 'green', de: 'grün', fr: 'vert' },

  { category: 'Zahlen', sl: 'ena', en: 'one', de: 'eins', fr: 'un' },
  { category: 'Zahlen', sl: 'dve', en: 'two', de: 'zwei', fr: 'deux' },
  { category: 'Zahlen', sl: 'tri', en: 'three', de: 'drei', fr: 'trois' },

  { category: 'Familie', sl: 'mati', en: 'mother', de: 'Mutter', fr: 'mère' },
  { category: 'Familie', sl: 'oče', en: 'father', de: 'Vater', fr: 'père' },
  { category: 'Familie', sl: 'otrok', en: 'child', de: 'Kind', fr: 'enfant' },
  { category: 'Familie', sl: 'prijatelj', en: 'friend', de: 'Freund', fr: 'ami' },

  { category: 'Gegenstände', sl: 'knjiga', en: 'book', de: 'Buch', fr: 'livre' },
  { category: 'Gegenstände', sl: 'miza', en: 'table', de: 'Tisch', fr: 'table' },
  { category: 'Gegenstände', sl: 'stol', en: 'chair', de: 'Stuhl', fr: 'chaise' },
  { category: 'Gegenstände', sl: 'avto', en: 'car', de: 'Auto', fr: 'voiture' },
  { category: 'Gegenstände', sl: 'hiša', en: 'house', de: 'Haus', fr: 'maison' },

  { category: 'Essen', sl: 'kruh', en: 'bread', de: 'Brot', fr: 'pain' },
  { category: 'Essen', sl: 'mleko', en: 'milk', de: 'Milch', fr: 'lait' },
  { category: 'Essen', sl: 'jajce', en: 'egg', de: 'Ei', fr: 'œuf' },
  { category: 'Essen', sl: 'jabolko', en: 'apple', de: 'Apfel', fr: 'pomme' },

  { category: 'Begrüßung', sl: 'živjo', en: 'hello', de: 'hallo', fr: 'salut' },
  { category: 'Begrüßung', sl: 'hvala', en: 'thank you', de: 'danke', fr: 'merci' },
  { category: 'Begrüßung', sl: 'prosim', en: 'please', de: 'bitte', fr: "s'il vous plaît" },
  { category: 'Begrüßung', sl: 'da', en: 'yes', de: 'ja', fr: 'oui' },
  { category: 'Begrüßung', sl: 'ne', en: 'no', de: 'nein', fr: 'non' },

  { category: 'Eigenschaften', sl: 'dober', en: 'good', de: 'gut', fr: 'bon' },
  { category: 'Eigenschaften', sl: 'slab', en: 'bad', de: 'schlecht', fr: 'mauvais' },
  { category: 'Eigenschaften', sl: 'velik', en: 'big', de: 'groß', fr: 'grand' },
  { category: 'Eigenschaften', sl: 'majhen', en: 'small', de: 'klein', fr: 'petit' },
  { category: 'Eigenschaften', sl: 'vroč', en: 'hot', de: 'heiß', fr: 'chaud' },
  { category: 'Eigenschaften', sl: 'mrzel', en: 'cold', de: 'kalt', fr: 'froid' },

  { category: 'Zeit', sl: 'čas', en: 'time', de: 'Zeit', fr: 'temps' },
  { category: 'Zeit', sl: 'dan', en: 'day', de: 'Tag', fr: 'jour' },
  { category: 'Zeit', sl: 'noč', en: 'night', de: 'Nacht', fr: 'nuit' },

  { category: 'Verben', sl: 'jesti', en: 'eat', de: 'essen', fr: 'manger' },
  { category: 'Verben', sl: 'piti', en: 'drink', de: 'trinken', fr: 'boire' },
  { category: 'Verben', sl: 'spati', en: 'sleep', de: 'schlafen', fr: 'dormir' },
  { category: 'Verben', sl: 'teči', en: 'run', de: 'laufen', fr: 'courir' },
  { category: 'Verben', sl: 'iti', en: 'go', de: 'gehen', fr: 'aller' },
  { category: 'Verben', sl: 'videti', en: 'see', de: 'sehen', fr: 'voir' },
  { category: 'Verben', sl: 'slišati', en: 'hear', de: 'hören', fr: 'entendre' },

  { category: 'Gefühle', sl: 'ljubezen', en: 'love', de: 'Liebe', fr: 'amour' },
];

// Nur diese 2 Beispielkarten bekommt ein neu registriertes Konto, damit man
// direkt sieht, wie eine Karte aufgebaut ist, ohne mit 50 Wörtern erschlagen
// zu werden. Die volle DEFAULT_CARDS-Liste bleibt über "Zurücksetzen auf
// Standard" (Tab Import/Export) weiterhin verfügbar.
const STARTER_CARDS = DEFAULT_CARDS.slice(0, 2);

module.exports = { DEFAULT_CARDS, STARTER_CARDS };
