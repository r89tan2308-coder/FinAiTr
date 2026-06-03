export interface CategorySuggestion {
  categoryId: string;
  tags: string[];
  confidence: number;
}

interface CategoryRule {
  categoryId: string;
  keywords: string[];
  tags: string[];
}

const categoryRules: CategoryRule[] = [
  {
    categoryId: "dairy",
    keywords: ["творог", "йогурт", "молоко", "kefir", "milk", "yogurt", "cottage cheese", "cheese"],
    tags: ["dairy", "groceries"],
  },
  {
    categoryId: "alcohol",
    keywords: ["beer", "wine", "vodka", "whiskey", "alcohol", "пиво", "вино", "водка"],
    tags: ["alcohol"],
  },
  {
    categoryId: "medicine",
    keywords: [
      "aspirin",
      "ibuprofen",
      "pharmacy",
      "medicine",
      "bandage",
      "таблет",
      "аптека",
      "лекар",
    ],
    tags: ["medicine", "health"],
  },
  {
    categoryId: "games",
    keywords: ["steam", "playstation", "xbox", "game", "games", "nintendo"],
    tags: ["games"],
  },
  {
    categoryId: "software",
    keywords: ["adobe", "openai", "elevenlabs", "suno", "software", "subscription"],
    tags: ["software", "subscription"],
  },
  {
    categoryId: "gym",
    keywords: ["gym", "fitness", "club", "зал", "фитнес"],
    tags: ["gym", "health"],
  },
  {
    categoryId: "groceries",
    keywords: [
      "bread",
      "coffee",
      "rice",
      "apple",
      "banana",
      "market",
      "grocery",
      "water",
      "juice",
      "хлеб",
      "кофе",
      "рис",
    ],
    tags: ["groceries"],
  },
];

export function guessReceiptItemCategory(name: string): CategorySuggestion {
  const normalizedName = name.toLowerCase();

  for (const rule of categoryRules) {
    if (rule.keywords.some((keyword) => normalizedName.includes(keyword))) {
      return {
        categoryId: rule.categoryId,
        confidence: 0.82,
        tags: rule.tags,
      };
    }
  }

  return {
    categoryId: "uncategorized",
    confidence: 0.25,
    tags: ["uncategorized"],
  };
}
