export type SeedLocation = {
  type: "country" | "province" | "district" | "city" | "market";
  slug: string;
  nameEn: string;
  nameUr?: string;
  parentSlug?: string;
  isMajorMarket?: boolean;
  aliasesRoman?: string[];
};

type CityDef = { slug: string; nameEn: string; nameUr?: string; major?: boolean; aliases?: string[] };

const MAJOR = new Set([
  "lahore", "karachi", "faisalabad", "multan", "rawalpindi", "peshawar", "quetta", "hyderabad", "sukkur",
  "gujranwala", "sialkot", "islamabad", "sargodha", "bahawalpur", "rahim-yar-khan", "okara", "sahiwal",
]);

const PROVINCES: Array<{ slug: string; nameEn: string; nameUr: string; cities: CityDef[] }> = [
  {
    slug: "punjab",
    nameEn: "Punjab",
    nameUr: "پنجاب",
    cities: [
      { slug: "lahore", nameEn: "Lahore", nameUr: "لاہور", aliases: ["lhr"] },
      { slug: "faisalabad", nameEn: "Faisalabad", nameUr: "فیصل آباد", aliases: ["lyallpur", "fsd"] },
      { slug: "rawalpindi", nameEn: "Rawalpindi", nameUr: "راولپنڈی", aliases: ["pindi"] },
      { slug: "multan", nameEn: "Multan", nameUr: "ملتان" },
      { slug: "gujranwala", nameEn: "Gujranwala", nameUr: "گوجرانوالہ" },
      { slug: "sialkot", nameEn: "Sialkot", nameUr: "سیالکوٹ" },
      { slug: "sargodha", nameEn: "Sargodha", nameUr: "سرگودھا" },
      { slug: "bahawalpur", nameEn: "Bahawalpur", nameUr: "بہاولپور" },
      { slug: "sheikhupura", nameEn: "Sheikhupura", nameUr: "شیخوپورہ" },
      { slug: "rahim-yar-khan", nameEn: "Rahim Yar Khan", nameUr: "رحیم یار خان", aliases: ["ryk"] },
      { slug: "okara", nameEn: "Okara", nameUr: "اوکاڑہ" },
      { slug: "sahiwal", nameEn: "Sahiwal", nameUr: "ساہیوال" },
      { slug: "jhang", nameEn: "Jhang", nameUr: "جھنگ" },
      { slug: "kasur", nameEn: "Kasur", nameUr: "قصور" },
      { slug: "gujrat", nameEn: "Gujrat", nameUr: "گجرات" },
      { slug: "dera-ghazi-khan", nameEn: "Dera Ghazi Khan", nameUr: "ڈیرہ غازی خان", aliases: ["dg khan", "dgk"] },
      { slug: "vehari", nameEn: "Vehari", nameUr: "وہاڑی" },
      { slug: "khanewal", nameEn: "Khanewal", nameUr: "خانیوال" },
      { slug: "muzaffargarh", nameEn: "Muzaffargarh", nameUr: "مظفر گڑھ" },
      { slug: "bahawalnagar", nameEn: "Bahawalnagar", nameUr: "بہاولنگر" },
      { slug: "hafizabad", nameEn: "Hafizabad", nameUr: "حافظ آباد" },
      { slug: "mandi-bahauddin", nameEn: "Mandi Bahauddin", nameUr: "منڈی بہاؤالدین" },
      { slug: "toba-tek-singh", nameEn: "Toba Tek Singh", nameUr: "ٹوبہ ٹیک سنگھ" },
      { slug: "pakpattan", nameEn: "Pakpattan", nameUr: "پاکپتن" },
      { slug: "chiniot", nameEn: "Chiniot", nameUr: "چنیوٹ" },
      { slug: "jhelum", nameEn: "Jhelum", nameUr: "جہلم" },
      { slug: "attock", nameEn: "Attock", nameUr: "اٹک" },
      { slug: "chakwal", nameEn: "Chakwal", nameUr: "چکوال" },
      { slug: "mianwali", nameEn: "Mianwali", nameUr: "میانوالی" },
      { slug: "bhakkar", nameEn: "Bhakkar", nameUr: "بھکر" },
      { slug: "layyah", nameEn: "Layyah", nameUr: "لیہ" },
      { slug: "lodhran", nameEn: "Lodhran", nameUr: "لودھراں" },
      { slug: "narowal", nameEn: "Narowal", nameUr: "نارووال" },
      { slug: "khushab", nameEn: "Khushab", nameUr: "خوشاب" },
      { slug: "nankana-sahib", nameEn: "Nankana Sahib", nameUr: "ننکانہ صاحب" },
      { slug: "rajanpur", nameEn: "Rajanpur", nameUr: "راجن پور" },
    ],
  },
  {
    slug: "sindh",
    nameEn: "Sindh",
    nameUr: "سندھ",
    cities: [
      { slug: "karachi", nameEn: "Karachi", nameUr: "کراچی", aliases: ["khi"] },
      { slug: "hyderabad", nameEn: "Hyderabad", nameUr: "حیدرآباد" },
      { slug: "sukkur", nameEn: "Sukkur", nameUr: "سکھر" },
      { slug: "larkana", nameEn: "Larkana", nameUr: "لاڑکانہ" },
      { slug: "mirpur-khas", nameEn: "Mirpur Khas", nameUr: "میرپور خاص" },
      { slug: "nawabshah", nameEn: "Nawabshah (Shaheed Benazirabad)", nameUr: "نواب شاہ", aliases: ["shaheed benazirabad"] },
      { slug: "thatta", nameEn: "Thatta", nameUr: "ٹھٹھہ" },
      { slug: "badin", nameEn: "Badin", nameUr: "بدین" },
      { slug: "sanghar", nameEn: "Sanghar", nameUr: "سانگھڑ" },
      { slug: "khairpur", nameEn: "Khairpur", nameUr: "خیرپور" },
      { slug: "jacobabad", nameEn: "Jacobabad", nameUr: "جیکب آباد" },
      { slug: "shikarpur", nameEn: "Shikarpur", nameUr: "شکارپور" },
      { slug: "dadu", nameEn: "Dadu", nameUr: "دادو" },
      { slug: "jamshoro", nameEn: "Jamshoro", nameUr: "جامشورو" },
      { slug: "tando-allahyar", nameEn: "Tando Allahyar", nameUr: "ٹنڈو الہیار" },
      { slug: "tando-muhammad-khan", nameEn: "Tando Muhammad Khan", nameUr: "ٹنڈو محمد خان" },
      { slug: "umerkot", nameEn: "Umerkot", nameUr: "عمرکوٹ" },
      { slug: "ghotki", nameEn: "Ghotki", nameUr: "گھوٹکی" },
      { slug: "matiari", nameEn: "Matiari", nameUr: "مٹیاری" },
      { slug: "kashmore", nameEn: "Kashmore", nameUr: "کشمور" },
      { slug: "naushahro-feroze", nameEn: "Naushahro Feroze", nameUr: "نوشہرو فیروز" },
      { slug: "qambar-shahdadkot", nameEn: "Qambar Shahdadkot", nameUr: "قمبر شہدادکوٹ" },
      { slug: "tharparkar", nameEn: "Tharparkar", nameUr: "تھرپارکر", aliases: ["mithi"] },
      { slug: "sujawal", nameEn: "Sujawal", nameUr: "سجاول" },
    ],
  },
  {
    slug: "khyber-pakhtunkhwa",
    nameEn: "Khyber Pakhtunkhwa",
    nameUr: "خیبر پختونخوا",
    cities: [
      { slug: "peshawar", nameEn: "Peshawar", nameUr: "پشاور" },
      { slug: "mardan", nameEn: "Mardan", nameUr: "مردان" },
      { slug: "swat", nameEn: "Swat (Mingora)", nameUr: "سوات", aliases: ["mingora"] },
      { slug: "abbottabad", nameEn: "Abbottabad", nameUr: "ایبٹ آباد" },
      { slug: "dera-ismail-khan", nameEn: "Dera Ismail Khan", nameUr: "ڈیرہ اسماعیل خان", aliases: ["di khan", "dik"] },
      { slug: "kohat", nameEn: "Kohat", nameUr: "کوہاٹ" },
      { slug: "bannu", nameEn: "Bannu", nameUr: "بنوں" },
      { slug: "charsadda", nameEn: "Charsadda", nameUr: "چارسدہ" },
      { slug: "nowshera", nameEn: "Nowshera", nameUr: "نوشہرہ" },
      { slug: "swabi", nameEn: "Swabi", nameUr: "صوابی" },
      { slug: "mansehra", nameEn: "Mansehra", nameUr: "مانسہرہ" },
      { slug: "haripur", nameEn: "Haripur", nameUr: "ہری پور" },
      { slug: "malakand", nameEn: "Malakand", nameUr: "ملاکنڈ" },
      { slug: "dir", nameEn: "Dir", nameUr: "دیر" },
      { slug: "chitral", nameEn: "Chitral", nameUr: "چترال" },
    ],
  },
  {
    slug: "balochistan",
    nameEn: "Balochistan",
    nameUr: "بلوچستان",
    cities: [
      { slug: "quetta", nameEn: "Quetta", nameUr: "کوئٹہ" },
      { slug: "turbat", nameEn: "Turbat", nameUr: "تربت" },
      { slug: "khuzdar", nameEn: "Khuzdar", nameUr: "خضدار" },
      { slug: "gwadar", nameEn: "Gwadar", nameUr: "گوادر" },
      { slug: "hub", nameEn: "Hub (Lasbela)", nameUr: "حب", aliases: ["lasbela"] },
      { slug: "sibi", nameEn: "Sibi", nameUr: "سبی" },
      { slug: "zhob", nameEn: "Zhob", nameUr: "ژوب" },
      { slug: "loralai", nameEn: "Loralai", nameUr: "لورالائی" },
      { slug: "chaman", nameEn: "Chaman (Killa Abdullah)", nameUr: "چمن", aliases: ["killa abdullah"] },
      { slug: "dera-murad-jamali", nameEn: "Dera Murad Jamali (Naseerabad)", nameUr: "ڈیرہ مراد جمالی", aliases: ["naseerabad"] },
      { slug: "pishin", nameEn: "Pishin", nameUr: "پشین" },
    ],
  },
  {
    slug: "gilgit-baltistan",
    nameEn: "Gilgit-Baltistan",
    nameUr: "گلگت بلتستان",
    cities: [
      { slug: "gilgit", nameEn: "Gilgit", nameUr: "گلگت" },
      { slug: "skardu", nameEn: "Skardu", nameUr: "سکردو" },
    ],
  },
  {
    slug: "azad-jammu-kashmir",
    nameEn: "Azad Jammu & Kashmir",
    nameUr: "آزاد جموں و کشمیر",
    cities: [
      { slug: "muzaffarabad", nameEn: "Muzaffarabad", nameUr: "مظفرآباد" },
      { slug: "mirpur-ajk", nameEn: "Mirpur", nameUr: "میرپور", aliases: ["mirpur ajk"] },
      { slug: "kotli", nameEn: "Kotli", nameUr: "کوٹلی" },
    ],
  },
  {
    slug: "islamabad-capital-territory",
    nameEn: "Islamabad Capital Territory",
    nameUr: "وفاقی دارالحکومت اسلام آباد",
    cities: [{ slug: "islamabad", nameEn: "Islamabad", nameUr: "اسلام آباد", aliases: ["isb"] }],
  },
];

const MARKETS: Array<{ city: string; slug: string; nameEn: string; nameUr?: string; aliases?: string[] }> = [
  { city: "lahore", slug: "badami-bagh-sabzi-mandi", nameEn: "Badami Bagh Sabzi Mandi", nameUr: "بادامی باغ سبزی منڈی" },
  { city: "lahore", slug: "akbari-mandi", nameEn: "Akbari Mandi", nameUr: "اکبری منڈی" },
  { city: "lahore", slug: "lahore-ghalla-mandi", nameEn: "Lahore Grain Market (Ghalla Mandi)", nameUr: "لاہور غلہ منڈی", aliases: ["ghalla mandi lahore"] },
  { city: "lahore", slug: "shahdara-mandi", nameEn: "Shahdara Mandi", nameUr: "شاہدرہ منڈی" },
  { city: "lahore", slug: "misri-shah", nameEn: "Misri Shah (Iron Market)", nameUr: "مصری شاہ", aliases: ["loha market"] },
  { city: "karachi", slug: "jodia-bazar", nameEn: "Jodia Bazar", nameUr: "جوڑیا بازار" },
  { city: "karachi", slug: "sabzi-mandi-super-highway", nameEn: "Sabzi Mandi Super Highway", nameUr: "سبزی منڈی سپر ہائی وے" },
  { city: "karachi", slug: "shershah", nameEn: "Shershah (Scrap Market)", nameUr: "شیر شاہ", aliases: ["sher shah kabari"] },
  { city: "karachi", slug: "dhan-mandi", nameEn: "Dhan Mandi", nameUr: "دھان منڈی" },
  { city: "faisalabad", slug: "ghalla-mandi-faisalabad", nameEn: "Ghalla Mandi Faisalabad", nameUr: "غلہ منڈی فیصل آباد" },
  { city: "faisalabad", slug: "sutar-mandi", nameEn: "Sutar Mandi", nameUr: "سوتر منڈی", aliases: ["yarn market"] },
  { city: "multan", slug: "multan-ghalla-mandi", nameEn: "Multan Ghalla Mandi", nameUr: "ملتان غلہ منڈی" },
  { city: "hyderabad", slug: "hyderabad-sabzi-mandi", nameEn: "Hyderabad Sabzi Mandi", nameUr: "حیدرآباد سبزی منڈی" },
  { city: "peshawar", slug: "peshawar-ghalla-mandi", nameEn: "Peshawar Ghalla Mandi", nameUr: "پشاور غلہ منڈی" },
  { city: "okara", slug: "okara-ghalla-mandi", nameEn: "Okara Ghalla Mandi", nameUr: "اوکاڑہ غلہ منڈی" },
  { city: "sahiwal", slug: "sahiwal-ghalla-mandi", nameEn: "Sahiwal Ghalla Mandi", nameUr: "ساہیوال غلہ منڈی" },
];

function build(): SeedLocation[] {
  const out: SeedLocation[] = [{ type: "country", slug: "pakistan", nameEn: "Pakistan", nameUr: "پاکستان" }];
  for (const p of PROVINCES) {
    out.push({ type: "province", slug: p.slug, nameEn: p.nameEn, nameUr: p.nameUr, parentSlug: "pakistan" });
    for (const c of p.cities) {
      out.push({
        type: "district",
        slug: `${c.slug}-district`,
        nameEn: `${c.nameEn} District`,
        nameUr: c.nameUr ? `ضلع ${c.nameUr}` : undefined,
        parentSlug: p.slug,
      });
      out.push({
        type: "city",
        slug: c.slug,
        nameEn: c.nameEn,
        nameUr: c.nameUr,
        parentSlug: `${c.slug}-district`,
        isMajorMarket: MAJOR.has(c.slug),
        aliasesRoman: c.aliases,
      });
    }
  }
  for (const m of MARKETS) {
    out.push({ type: "market", slug: m.slug, nameEn: m.nameEn, nameUr: m.nameUr, parentSlug: m.city, aliasesRoman: m.aliases });
  }
  return out;
}

export const LOCATION_SEED: SeedLocation[] = build();
