import type { CharacterSnapshot } from "../../lib/posters/characterSnapshot.ts";
import type { AgeBand } from "../../lib/posters/audienceAge.ts";

export type PosterExample = {
  id: string;
  age: string;
  band: AgeBand;
  genre: string;
  language: "en" | "zh-Hant";
  title: string;
  character: CharacterSnapshot;
};

const humanChild: CharacterSnapshot = {
  id: "char_mei",
  version: "mei-1",
  name: "Mei",
  type: "human child",
  characterAge: "6 months",
  appearance: {
    colours: "warm brown skin and black hair",
    proportions: "small toddler proportions",
    clothing: "cream pyjamas",
    accessories: "a tiny terracotta hair clip",
  },
  referenceImageUrl: null,
};

const rabbit: CharacterSnapshot = {
  id: "char_lulu",
  version: "lulu-1",
  name: "Lulu",
  type: "rabbit",
  characterAge: "3 years",
  appearance: {
    colours: "soft grey fur with a white chest",
    proportions: "round storybook rabbit",
    clothing: "a blue knitted scarf",
    accessories: "one brass bell",
  },
  referenceImageUrl: null,
};

const dragon: CharacterSnapshot = {
  id: "char_momo",
  version: "momo-1",
  name: "Momo",
  type: "dragon",
  characterAge: null,
  appearance: {
    colours: "sage green scales and a cream belly",
    proportions: "small friendly dragon, not huge",
    clothing: "no clothes",
    accessories: "a short rounded snout and tiny wings",
  },
  referenceImageUrl: null,
};

const olderChild: CharacterSnapshot = {
  id: "char_an",
  version: "an-1",
  name: "安安",
  type: "human child",
  characterAge: "11 years",
  appearance: {
    colours: "black hair and a navy jacket",
    proportions: "a child rather than a toddler",
    clothing: "a navy jacket over a cream shirt",
    accessories: "a small star pin",
  },
  referenceImageUrl: null,
};

export const POSTER_EXAMPLES: PosterExample[] = [
  {
    id: "band-0-2-human-animals-zh",
    age: "6 months",
    band: "0-2",
    genre: "Animals",
    language: "zh-Hant",
    title: "小梅與月亮下的小兔子朋友，一個很長很長的睡前名字",
    character: humanChild,
  },
  {
    id: "band-3-5-rabbit-adventure-en",
    age: "4 years",
    band: "3-5",
    genre: "Adventure",
    language: "en",
    title: "Lulu and the Lantern Path",
    character: rabbit,
  },
  {
    id: "band-6-8-dragon-mystery-en",
    age: "7 years",
    band: "6-8",
    genre: "Mystery",
    language: "en",
    title: "Momo and the Quiet Key",
    character: dragon,
  },
  {
    id: "band-9-human-space-zh",
    age: "10 years",
    band: "9+",
    genre: "Space",
    language: "zh-Hant",
    title: "安安把星星收回口袋裡的那個很長的晚上，月亮還在等一句晚安",
    character: olderChild,
  },
];
