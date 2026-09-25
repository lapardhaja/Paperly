export type PaperSource = "pdf" | "text";

export type TextQuality = "ok" | "low";

export type Coverage = "grounded" | "partial" | "not_in_paper";

export type GeminiFileRef = {
  name: string;
  uri: string;
  expiresAt: string;
};

export type Paper = {
  id: string;
  source: PaperSource;
  filename: string | null;
  title: string | null;
  authors: string[];
  year: number | null;
  abstract: string | null;
  pageCount: number;
  createdAt: string;
  textQuality: TextQuality;
  geminiFile: GeminiFileRef | null;
};

export type PageText = {
  pageNumber: number;
  text: string;
};

export type Citation = {
  page: number;
  quote: string;
  label: string | null;
};

export type GroundedAnswer = {
  answerMarkdown: string;
  analysisMarkdown: string | null;
  citations: Citation[];
  coverage: Coverage;
  pagesUsed: number[];
  truncated: boolean;
};

export type SummaryMode = "quick" | "detailed" | "executive" | "eli5";

export type ArtifactKind =
  | "insights"
  | "summary-quick"
  | "summary-detailed"
  | "summary-executive"
  | "summary-eli5"
  | "analysis";

export const INSIGHT_KEYS = [
  "researchQuestion",
  "contribution",
  "method",
  "dataset",
  "findings",
  "limitations",
  "numbers",
  "conclusion",
] as const;

export type InsightKey = (typeof INSIGHT_KEYS)[number];

export type InsightCard = {
  key: InsightKey;
  body: string;
  citations: Citation[];
};

export type InsightsArtifact = {
  kind: "insights";
  cards: InsightCard[];
  coverage: Coverage;
  pagesUsed: number[];
  truncated: boolean;
  createdAt: string;
};

export type SummaryArtifact = {
  kind:
    | "summary-quick"
    | "summary-detailed"
    | "summary-executive"
    | "summary-eli5";
  answer: GroundedAnswer;
  createdAt: string;
};

export type AnalysisItem = {
  text: string;
  citations: Citation[];
};

export type AnalysisArtifact = {
  kind: "analysis";
  strengths: AnalysisItem[];
  authorLimitations: AnalysisItem[];
  paperlyAnalysis: AnalysisItem[];
  coverage: Coverage;
  pagesUsed: number[];
  truncated: boolean;
  createdAt: string;
};

export type Artifact = InsightsArtifact | SummaryArtifact | AnalysisArtifact;

export type ArtifactMap = Partial<Record<ArtifactKind, Artifact>>;

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  answer: GroundedAnswer | null;
  createdAt: string;
};

export type WorkspaceTab = "overview" | "summary" | "analysis" | "chat";

export type Retrieval = {
  pages: PageText[];
  truncated: boolean;
};
