// User types
export interface IUser {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  role: 'admin' | 'student';
  authProvider?: 'local' | 'whatsapp';
  status?: 'active' | 'suspended';
  tokenVersion?: number;
  enrolledCourses?: string[];
  enrolledTestSeries?: string[];
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

// Test Series types
export interface ITestSeriesItem {
  title: string;
  date: string;
  quizId?: string; // ID of online quiz, optional
  questionPaperUrl?: string;
  questionPaperKey?: string;
  solutionPaperUrl?: string;
  solutionPaperKey?: string;
  syllabus?: string;
  discussionVideoUrl?: string;
  isLocked: boolean;
}

export interface ITestSeries {
  id: string;
  title: string;
  description?: string;
  brochureUrl?: string;
  brochureKey?: string;
  introVideoUrl?: string;
  tests: ITestSeriesItem[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
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

// Doubt types
export interface IDoubtMessage {
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface IDoubt {
  id: string;
  _id?: string;
  student: string | { id: string; name: string; phone?: string; email?: string };
  testSeries?: string;
  testSeriesUniqueId?: string;
  testItemTitle?: string;
  quiz?: string;
  questionIndex?: number;
  questionText?: string;
  subject: string;
  title: string;
  description: string;
  status: 'pending' | 'answered' | 'resolved';
  messages: IDoubtMessage[];
  createdAt: string;
  updatedAt: string;
}

// Test Report types
export interface ITestReport {
  id: string;
  student: string;
  quiz: string | { _id: string; title: string; questions?: any[] };
  testSeries?: string | { _id: string; title: string };
  testSeriesUniqueId?: string;
  testItemTitle?: string;
  scorecard: {
    totalScore: number;
    maxMarks: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    accuracy: number;
    negativeMarks: number;
    timeTaken: number;
  };
  answers: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

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
