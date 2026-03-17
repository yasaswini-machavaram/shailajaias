// User types
export interface IUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'student';
  createdAt: string;
}

// Article types
export type ArticleType = 'daily_prelims' | 'mains' | 'burning_issue';

export interface IKeyword {
  word: string;
  linkedArticleId?: string;
}

export interface IArticle {
  id: string;
  type: ArticleType;
  title: string;
  date: string;
  tags: string[];
  content: string;
  keywords: IKeyword[];
  imageUrl?: string;
  order: number;
  createdAt: string;
}

// Magazine types
export type MagazineCategory = 'prelims_monthly' | 'mains_monthly';

export interface IMagazine {
  id: string;
  title: string;
  category: MagazineCategory;
  year: number;
  month: string;
  fileUrl: string;
  coverImageUrl?: string;
  description?: string;
  createdAt: string;
}

// Quiz types
export interface IQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface IQuiz {
  id: string;
  date: string;
  title: string;
  questions: IQuestion[];
  tags: string[];
  createdAt: string;
}

// Course types
export type ContentTabType = 'video' | 'notes' | 'test';

export interface IContentTab {
  type: ContentTabType;
  title: string;
  videoUrl?: string;
  pdfUrl?: string;
  testId?: string;
}

export type CourseLevel = 'course' | 'subject' | 'topic' | 'subtopic';

export interface ICourseNode {
  id: string;
  title: string;
  description?: string;
  parentId?: string;
  order: number;
  level: CourseLevel;
  contentTabs: IContentTab[];
  isPublished: boolean;
  createdAt: string;
}

// Tag constants
export const TOPIC_TAGS = [
  'Polity',
  'Economy',
  'Environment',
  'Science & Technology',
  'International Relations',
  'History',
  'Geography',
  'Art & Culture',
  'Social Issues',
  'Security',
  'Ethics',
] as const;

export type TopicTag = (typeof TOPIC_TAGS)[number];

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
