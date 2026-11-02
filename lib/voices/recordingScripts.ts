import { INTERFACE_LOCALES, type InterfaceLocale } from "@/lib/i18n/locales";

/**
 * Reading scripts for Make my voice.
 * Interface locale chooses the script. Story and narration language stay en | zh-Hant.
 * Every script is pending fluent-speaker review. Headings are registry ids, never spoken text.
 */
export const RECORDING_SCRIPT_VERSION = "2026-11-02" as const;

export type RecordingReviewStatus = "pending-fluent-speaker-review";
export type RecordingLocale = InterfaceLocale;

export type RecordingScript = {
  locale: RecordingLocale;
  scriptVersion: typeof RECORDING_SCRIPT_VERSION;
  /** Four story paragraphs the parent reads aloud. */
  passage: string;
  /** Short natural phrases. Varied speech, not a set of training commands. */
  phrases: string;
  reviewStatus: RecordingReviewStatus;
};

export type ProviderLanguageLabel = {
  /** Provider language code. Traditional and Simplified Mandarin share zh and differ by accent and description. */
  language: string;
  accent: string;
  description: string;
};

const REVIEW: RecordingReviewStatus = "pending-fluent-speaker-review";

export const RECORDING_SCRIPTS: Record<RecordingLocale, RecordingScript> = {
  "en": {
    locale: "en",
    scriptVersion: RECORDING_SCRIPT_VERSION,
    passage: "Tonight, the house is quiet, and a small lamp shines beside the window. Outside, the sky is turning blue and purple. A little horse named Milo follows a winding path through the garden. He notices three smooth stones, a yellow flower, and a butterfly resting on a leaf.\n\n“Did you hear that?” he asks. Somewhere nearby, a tiny bell rings. Milo stops and listens. “Perhaps a friend is waiting for us. Shall we take a look?”\n\nBehind the old apple tree, a little bird is trying to find its nest. “Take your time,” Milo says. “We can look together.” They count the branches: one, two, three. There it is, just above the soft green leaves.\n\nThe bird settles into its nest, and Milo walks home. Tomorrow will bring another adventure. For now, the blanket is warm, the room is peaceful, and the moon is watching over the garden.",
    phrases: "Hello, my little one. I’m right here. How are you feeling? Let’s try again, slowly. You did very well. I love you. Good night. See you tomorrow.",
    reviewStatus: REVIEW,
  },
  "zh-Hant": {
    locale: "zh-Hant",
    scriptVersion: RECORDING_SCRIPT_VERSION,
    passage: "今晚，家裡很安靜，窗邊的小燈散發著柔和的光。外面的天空慢慢變成深藍色，還帶著一點紫。小馬米洛沿著花園的小路往前走，看見三顆圓圓的石頭、一朵黃色的小花，還有停在葉子上的蝴蝶。\n\n「你聽見了嗎？」米洛問。遠方傳來清脆的鈴聲。他停下腳步，仔細聽了一會兒。「也許有朋友在等我們，要不要一起去看看？」\n\n蘋果樹後面，一隻小鳥正在找自己的窩。「別著急，我們一起找。」米洛說。他們抬頭數著樹枝，一根、兩根、三根。找到了！小鳥的窩就在綠葉上方。\n\n小鳥安心地回到窩裡，米洛也慢慢走回家。明天還會有新的冒險。現在，棉被暖暖的，房間靜靜的，月亮照著花園。今天的故事，就先說到這裡。",
    phrases: "嗨，我的小寶貝。我就在這裡。你今天開心嗎？沒關係，我們慢慢來。你已經做得很好了。我愛你。晚安，我們明天見。",
    reviewStatus: REVIEW,
  },
  "zh-Hans": {
    locale: "zh-Hans",
    scriptVersion: RECORDING_SCRIPT_VERSION,
    passage: "今晚，家里很安静，窗边的小灯散发着柔和的光。外面的天空慢慢变成深蓝色，还带着一点紫。小马米洛沿着花园的小路往前走，看见三颗圆圆的石头、一朵黄色的小花，还有停在叶子上的蝴蝶。\n\n“你听见了吗？”米洛问。远处传来清脆的铃声。他停下脚步，仔细听了一会儿。“也许有朋友在等我们，要不要一起去看看？”\n\n苹果树后面，一只小鸟正在找自己的窝。“别着急，我们一起找。”米洛说。他们抬头数着树枝，一根、两根、三根。找到了！小鸟的窝就在绿叶上方。\n\n小鸟安心地回到窝里，米洛也慢慢走回家。明天还会有新的冒险。现在，被子暖暖的，房间静静的，月亮照着花园。今天的故事，就先讲到这里。",
    phrases: "嗨，我的小宝贝。我就在这里。你今天开心吗？没关系，我们慢慢来。你已经做得很好了。我爱你。晚安，我们明天见。",
    reviewStatus: REVIEW,
  },
  "es": {
    locale: "es",
    scriptVersion: RECORDING_SCRIPT_VERSION,
    passage: "Esta noche, la casa está tranquila y una pequeña lámpara ilumina la ventana. Afuera, el cielo se vuelve azul y violeta. Un caballito llamado Milo recorre el sendero del jardín. Encuentra tres piedras redondas, una flor amarilla y una mariposa que descansa sobre una hoja.\n\n“¿Has oído eso?”, pregunta. A lo lejos suena una campanita. Milo se detiene y escucha. “Quizá nos esté esperando un amigo. ¿Vamos a ver?”\n\nDetrás del manzano, un pajarito busca su nido. “No tengas prisa”, dice Milo. “Podemos buscar juntos.” Miran hacia arriba y cuentan las ramas: una, dos, tres. ¡Ahí está, justo encima de las hojas verdes!\n\nEl pajarito vuelve a su nido y Milo regresa a casa. Mañana habrá otra aventura. Ahora, la manta está calentita, la habitación está en calma y la luna ilumina el jardín.",
    phrases: "Hola, mi pequeño tesoro. Estoy aquí contigo. ¿Cómo te sientes? Vamos a intentarlo otra vez, despacio. Lo has hecho muy bien. Te quiero mucho. Buenas noches. Hasta mañana.",
    reviewStatus: REVIEW,
  },
  "hi": {
    locale: "hi",
    scriptVersion: RECORDING_SCRIPT_VERSION,
    passage: "आज रात घर में शांति है। खिड़की के पास एक छोटा सा दीपक जल रहा है। बाहर आसमान में नीले और बैंगनी रंग घुल रहे हैं। मिलो नाम का एक छोटा घोड़ा बगीचे की पगडंडी पर चलता है। उसे तीन चिकने पत्थर, एक पीला फूल और पत्ते पर बैठी एक तितली दिखाई देती है।\n\n“क्या तुमने वह आवाज़ सुनी?” वह पूछता है। दूर कहीं एक छोटी घंटी बजती है। मिलो रुककर ध्यान से सुनता है। “शायद कोई दोस्त हमारा इंतज़ार कर रहा है। चलकर देखें?”\n\nसेब के पेड़ के पीछे एक नन्ही चिड़िया अपना घोंसला खोज रही है। मिलो कहता है, “जल्दी मत करो। हम साथ मिलकर ढूँढ़ेंगे।” वे ऊपर देखकर डालियाँ गिनते हैं। एक, दो, तीन। वह रहा घोंसला, हरी पत्तियों के ठीक ऊपर!\n\nचिड़िया अपने घोंसले में लौट जाती है और मिलो घर की ओर चल पड़ता है। कल फिर एक नया रोमांच होगा। अभी कमरा शांत है, कंबल नरम है और खिड़की से चाँद दिखाई दे रहा है।",
    phrases: "मेरे प्यारे बच्चे, मैं यहीं हूँ। आज तुम्हारा दिन कैसा रहा? कोई बात नहीं, हम धीरे-धीरे फिर कोशिश करेंगे। तुमने बहुत अच्छा किया। तुम मेरे लिए बहुत खास हो। शुभ रात्रि। कल फिर मिलेंगे।",
    reviewStatus: REVIEW,
  },
  "ar": {
    locale: "ar",
    scriptVersion: RECORDING_SCRIPT_VERSION,
    passage: "في هذه الليلة، يسود الهدوء في البيت، ويضيء مصباح صغير قرب النافذة. في الخارج، يتحول لون السماء إلى الأزرق والبنفسجي. يسير حصان صغير اسمه ميلو في ممر الحديقة. يرى ثلاث حصوات ناعمة، وزهرة صفراء، وفراشة تستريح على ورقة خضراء.\n\nيسأل ميلو: «هل سمعت ذلك الصوت؟» يرن جرس صغير من بعيد. يتوقف قليلًا ويستمع، ثم يقول: «ربما ينتظرنا صديق. ما رأيك أن نذهب ونرى؟»\n\nخلف شجرة التفاح، يبحث عصفور صغير عن عشه. يقول له ميلو: «لا تستعجل. سنبحث معًا». ينظران إلى الأعلى ويعدان الأغصان: واحد، اثنان، ثلاثة. ها هو العش، فوق الأوراق الخضراء مباشرة!\n\nيعود العصفور إلى عشه، ويمشي ميلو نحو البيت. غدًا تنتظره مغامرة جديدة. أما الآن، فالبطانية دافئة، والغرفة هادئة، وضوء القمر يملأ الحديقة. يجلس ميلو قرب النافذة ويبتسم، سعيدًا بالصديق الذي ساعده اليوم.",
    phrases: "مرحبًا يا صغيري. أنا هنا بجانبك. كيف كان يومك؟ لا بأس، يمكننا أن نحاول مرة أخرى بهدوء. لقد أحسنت. أحبك كثيرًا. تصبح على خير. أراك غدًا.",
    reviewStatus: REVIEW,
  },
  "fr": {
    locale: "fr",
    scriptVersion: RECORDING_SCRIPT_VERSION,
    passage: "Ce soir, la maison est calme et une petite lampe éclaire la fenêtre. Dehors, le ciel devient bleu et violet. Un petit cheval nommé Milo suit le sentier du jardin. Il remarque trois pierres lisses, une fleur jaune et un papillon posé sur une feuille.\n\n« Tu as entendu ce bruit ? » demande-t-il. Au loin, une petite cloche sonne. Milo s’arrête et tend l’oreille. « Peut-être qu’un ami nous attend. Tu viens voir avec moi ? »\n\nDerrière le pommier, un oisillon cherche son nid. « Prends ton temps, dit Milo. Nous allons chercher ensemble. » Ils lèvent la tête et comptent les branches : une, deux, trois. Le voilà, juste au-dessus des feuilles vertes !\n\nL’oisillon retrouve son nid et Milo rentre à la maison. Demain, une nouvelle aventure l’attendra. Pour l’instant, la couverture est douce, la chambre est paisible et la lune éclaire le jardin.",
    phrases: "Bonsoir, mon petit cœur. Je suis là, près de toi. Comment te sens-tu ? Ce n’est pas grave, nous pouvons recommencer doucement. Tu as très bien fait. Je t’aime. Bonne nuit. À demain.",
    reviewStatus: REVIEW,
  },
  "pt-BR": {
    locale: "pt-BR",
    scriptVersion: RECORDING_SCRIPT_VERSION,
    passage: "Hoje à noite, a casa está tranquila, e uma pequena luminária ilumina a janela. Lá fora, o céu fica azul e violeta. Um cavalinho chamado Milo segue pelo caminho do jardim. Ele encontra três pedras lisas, uma flor amarela e uma borboleta descansando sobre uma folha.\n\n“Você ouviu esse barulho?”, ele pergunta. Ao longe, toca um pequeno sino. Milo para e escuta com atenção. “Talvez algum amigo esteja esperando a gente. Vamos dar uma olhada?”\n\nAtrás da macieira, um passarinho procura seu ninho. “Não precisa ter pressa”, diz Milo. “Vamos procurar juntos.” Eles olham para cima e contam os galhos: um, dois, três. Ali está o ninho, bem acima das folhas verdes!\n\nO passarinho volta para o ninho, e Milo segue para casa. Amanhã vai ter outra aventura. Agora, o cobertor está quentinho, o quarto está calmo e a lua ilumina o jardim.",
    phrases: "Oi, meu amor. Estou aqui com você. Como foi o seu dia? Tudo bem, vamos tentar de novo, devagar. Você foi muito bem. Eu te amo. Boa noite. Até amanhã.",
    reviewStatus: REVIEW,
  },
  "ru": {
    locale: "ru",
    scriptVersion: RECORDING_SCRIPT_VERSION,
    passage: "Сегодня вечером дома тихо. У окна горит маленькая лампа, а небо за стеклом становится синим и фиолетовым. Маленький конь по имени Мило идёт по садовой дорожке. Он замечает три гладких камешка, жёлтый цветок и бабочку на зелёном листе.\n\n«Ты слышишь этот звук?» — спрашивает он. Где-то вдали звенит колокольчик. Мило останавливается и прислушивается. «Может быть, нас ждёт друг? Пойдём посмотрим?»\n\nЗа яблоней маленькая птичка ищет своё гнездо. «Не торопись, — говорит Мило. — Мы поищем вместе». Они поднимают головы и считают ветки: одна, две, три. Вот оно, прямо над зелёными листьями!\n\nПтичка возвращается в гнездо, а Мило идёт домой. Завтра его ждёт новое приключение. Сейчас одеяло тёплое, в комнате спокойно, а луна освещает сад. Перед сном Мило вспоминает, как приятно помогать друзьям.",
    phrases: "Привет, моё солнышко. Я рядом. Как прошёл твой день? Ничего страшного, попробуем ещё раз, не спеша. У тебя хорошо получилось. Я тебя люблю. Спокойной ночи. До завтра.",
    reviewStatus: REVIEW,
  },
  "ja": {
    locale: "ja",
    scriptVersion: RECORDING_SCRIPT_VERSION,
    passage: "今夜、おうちの中は静かです。窓のそばでは、小さな明かりがやさしく光っています。外の空は、青から紫へと少しずつ色を変えていました。子馬のミロは、庭の小道をゆっくり歩いています。丸い石が三つ、黄色い花が一つ。そして、葉っぱの上には、ちょうがとまっていました。\n\n「ねえ、今の音、聞こえた？」遠くで、小さな鈴が鳴っています。ミロは立ち止まって、耳をすませました。「だれかが待っているのかな。一緒に見に行こうか。」\n\nりんごの木の向こうで、小鳥が自分の巣を探していました。「あわてなくていいよ。一緒に探そう。」二人は上を向いて、枝を数えます。一、二、三。あった！緑の葉っぱの、すぐ上です。\n\n小鳥は安心して巣に戻り、ミロもおうちへ帰りました。明日は、どんな冒険が待っているのでしょう。今は、あたたかい毛布と、静かな夜の時間です。窓の外では、月が庭をやさしく照らしていました。",
    phrases: "だいすきなあなたへ。そばにいるよ。今日はどんな一日だった？だいじょうぶ、ゆっくりやってみよう。よくできたね。だいすきだよ。おやすみ。また明日ね。",
    reviewStatus: REVIEW,
  },
};


const LOCALE_ALIASES: Record<string, RecordingLocale> = {
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  "zh-hant": "zh-Hant",
  "zh-tw": "zh-Hant",
  "zh-hk": "zh-Hant",
  "zh-mo": "zh-Hant",
  "zh-hans": "zh-Hans",
  "zh-cn": "zh-Hans",
  "zh-sg": "zh-Hans",
  es: "es",
  "es-es": "es",
  "es-mx": "es",
  "es-419": "es",
  hi: "hi",
  "hi-in": "hi",
  ar: "ar",
  fr: "fr",
  "fr-fr": "fr",
  "pt-br": "pt-BR",
  pt: "pt-BR",
  ru: "ru",
  "ru-ru": "ru",
  ja: "ja",
  "ja-jp": "ja",
};

/** Canonical recording locale, or null. Never turns an unknown language into English. */
export function parseRecordingLocale(value: unknown): RecordingLocale | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase().replace(/_/g, "-");
  if (!raw) return null;
  return LOCALE_ALIASES[raw] ?? null;
}

export function recordingScriptForLocale(locale: RecordingLocale): RecordingScript {
  return RECORDING_SCRIPTS[locale];
}

/**
 * Idle reads follow the selected interface locale.
 * Once a take has started, the frozen script stays even if the app locale changes.
 */
export function resolveActiveRecordingScript(interfaceLocale: RecordingLocale, frozen: RecordingScript | null): RecordingScript {
  if (frozen) return frozen;
  return RECORDING_SCRIPTS[interfaceLocale];
}

/** Passage and phrases as the parent sees them. No registry headings. */
export function readingText(script: Pick<RecordingScript, "passage" | "phrases">): string {
  return `${script.passage}\n\n${script.phrases}`;
}

export function providerLanguageLabel(locale: RecordingLocale): ProviderLanguageLabel {
  switch (locale) {
    case "en":
      return { language: "en", accent: "unspecified", description: "English" };
    case "zh-Hant":
      return { language: "zh", accent: "mandarin", description: "Mandarin, Traditional Chinese script" };
    case "zh-Hans":
      return { language: "zh", accent: "mandarin", description: "Mandarin, Simplified Chinese script" };
    case "es":
      return { language: "es", accent: "unspecified", description: "Spanish" };
    case "hi":
      return { language: "hi", accent: "unspecified", description: "Hindi" };
    case "ar":
      return { language: "ar", accent: "unspecified", description: "Arabic" };
    case "fr":
      return { language: "fr", accent: "unspecified", description: "French" };
    case "pt-BR":
      return { language: "pt", accent: "brazilian", description: "Brazilian Portuguese" };
    case "ru":
      return { language: "ru", accent: "unspecified", description: "Russian" };
    case "ja":
      return { language: "ja", accent: "unspecified", description: "Japanese" };
  }
}

export type RecordingMetadata =
  | { ok: true; locale: RecordingLocale; scriptVersion: typeof RECORDING_SCRIPT_VERSION }
  | { ok: false; status: 400; error: string };

/**
 * Accept only a real recording locale and the script version that was frozen at record start.
 * A story-language value of English must not overwrite a different recording locale.
 */
export function resolveRecordingMetadata(input: {
  recordingLocale: unknown;
  scriptVersion: unknown;
  language?: unknown;
}): RecordingMetadata {
  const recordingField = typeof input.recordingLocale === "string" ? input.recordingLocale.trim() : "";
  const fromRecording = parseRecordingLocale(input.recordingLocale);
  if (recordingField && !fromRecording) {
    return { ok: false, status: 400, error: "That recording language is not one of the reading scripts." };
  }
  const fromLanguage = parseRecordingLocale(input.language);
  if (fromRecording && fromLanguage && fromRecording !== fromLanguage) {
    return { ok: false, status: 400, error: "The recording language does not match the script that was read." };
  }
  const locale = fromRecording ?? fromLanguage;
  if (!locale) {
    return { ok: false, status: 400, error: "That recording language is not one of the reading scripts." };
  }
  const version = String(input.scriptVersion ?? "").trim();
  if (version !== RECORDING_SCRIPTS[locale].scriptVersion) {
    return { ok: false, status: 400, error: "This reading script is out of date. Start the recording again." };
  }
  return { ok: true, locale, scriptVersion: RECORDING_SCRIPTS[locale].scriptVersion };
}

export function recordingLocaleList(): RecordingLocale[] {
  return INTERFACE_LOCALES.map((item) => item.code);
}
