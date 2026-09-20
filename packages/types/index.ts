// User types
export interface IUser {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  role: 'admin' | 'student' | 'mentor';
  authProvider?: 'local' | 'whatsapp';
  status?: 'active' | 'suspended';
  tokenVersion?: number;
  enrolledCourses?: string[];
  enrolledTestSeries?: string[];
  isMentorshipStudent?: boolean;
  purchasedMentorTags?: string[];
  purchasedPtsGroups?: string[];
  purchasedMtsGroups?: string[];
  purchasedCourseGroups?: string[];
  purchasedCourses?: string[];
  mentorshipPurchasedAt?: string;
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
  subjectTags?: string[];
}

export interface ITestSeries {
  id: string;
  uniqueId: string;
  title: string;
  description?: string;
  brochureUrl?: string;
  brochureKey?: string;
  introVideoUrl?: string;
  tests: ITestSeriesItem[];
  price?: number;
  mentorTags?: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

// Course types
export type ContentTabType = 'video' | 'notes' | 'test' | 'mains' | 'help';
export type VideoProvider = 'youtube' | 'bunny' | 'custom';

export interface IPdfFile {
  title: string;
  pdfUrl: string;
  pdfKey?: string;
}

export interface IFaqItem {
  question: string;
  answer: string;
}

export interface IVideoItem {
  id?: string;
  _id?: string;
  title: string;
  description?: string;
  videoProvider: VideoProvider;
  videoUrl: string;
  // Notes section
  notesText?: string;
  pdfFiles: IPdfFile[];
  // Prelims Practice section
  prelimsQuizId?: string;
  prelimsDiscussionVideoUrl?: string;
  prelimsDiscussionVideoProvider?: VideoProvider;
  // Mains Practice section
  mainsPracticeTestId?: string;
  mainsQuestionText?: string;
  mainsModelAnswer?: string;
  mainsDiscussionVideoUrl?: string;
  mainsDiscussionVideoProvider?: VideoProvider;
  // Help & FAQ section
  helpContactInfo?: string;
  faqs: IFaqItem[];
  // Video-level locks
  isPracticeLocked?: boolean;
  isHelpLocked?: boolean;
}

export interface IContentTab {
  type: ContentTabType;
  title: string;
  videoProvider?: VideoProvider;
  videoUrl?: string;
  pdfUrl?: string;
  pdfKey?: string;
  notesText?: string;
  testId?: string;
  mainsTestId?: string;
  mainsQuestionText?: string;
  mainsModelAnswer?: string;
  helpContactInfo?: string;
}

export type CourseLevel = 'course' | 'subject' | 'topic' | 'subtopic';

export interface ICourseNode {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  parentId?: string;
  parent?: string | null;
  order: number;
  level: CourseLevel;
  videos?: IVideoItem[];
  contentTabs: IContentTab[];
  isPublished: boolean;
  isPracticeLocked?: boolean;
  isHelpLocked?: boolean;
  isLocked?: boolean;
  price?: number;
  mentorTags?: string[];
  linkedPtsId?: string | any;
  linkedMtsId?: string | any;
  createdAt: string;
}

export interface ICourseGroup {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  brochureUrl?: string;
  brochureKey?: string;
  introVideoUrl?: string;
  courseIds: (string | ICourseNode)[];
  price: number;
  mentorTags: string[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ITestAttempt {
  id: string;
  ptsId: string;
  testIndex: number;
  attemptCount: number;
  lastAttemptAt: string;
}

export type MentorshipTaskType = 'watch' | 'notes' | 'test' | 'upload';

export interface IMentorshipTaskProgress {
  id: string;
  userId: string;
  tag: string;
  dayNumber: number;
  taskType: MentorshipTaskType;
  completed: boolean;
  completedAt?: string;
  notesText?: string;
  mainsAnswerText?: string;
  mainsAnswerFileUrl?: string;
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

// Mains Test Series types
export interface IMainsTestSeriesItem {
  title: string;
  date: string;
  subjectCategory: string;
  syllabus?: string;
  questionPaperUrl?: string;
  questionPaperKey?: string;
  solutionPaperUrl?: string;
  solutionPaperKey?: string;
  discussionVideoUrl?: string;
  isLocked: boolean;
}

export interface IMainsTestSeries {
  id: string;
  uniqueId: string;
  title: string;
  description?: string;
  brochureUrl?: string;
  brochureKey?: string;
  introVideoUrl?: string;
  tests: IMainsTestSeriesItem[];
  sectionalCount: number;
  fullLengthCount: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IMainsSubmission {
  id: string;
  student: string | { _id: string; name: string; phone?: string; email?: string };
  mainsTestSeries: string | { _id: string; title: string; uniqueId: string };
  testIndex: number;
  testTitle: string;
  seriesUniqueId: string;
  answerSheetUrls: string[];
  answerSheetKeys: string[];
  submittedAt: string;
  reuploadCount?: number;
  mentor?: string | { _id: string; name: string; email?: string };
  status: 'submitted' | 'assigned' | 'under_review' | 'evaluated';
  evaluatedCopyUrl?: string;
  evaluatedCopyKey?: string;
  score?: number;
  maxScore?: number;
  feedback?: string;
  evaluatedAt?: string;
  evaluatedBy?: string | { _id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

// Mains Practice Test types
export interface IMainsQuestionItem {
  id?: string;
  questionText: string;
  marks?: number;
  wordLimit?: number;
  difficultyLevel: 'Easy' | 'Moderate' | 'Difficult';
  modelAnswer: string;
  approach?: string;
  topicTags?: string[];
}

export interface IMainsPracticeTest {
  id: string;
  title: string;
  subjectCategory: string;
  topicsSummary?: string;
  guidelinesUrl?: string;
  guidelinesKey?: string;
  introVideoUrl?: string;
  questions: IMainsQuestionItem[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IMainsPracticeTestConfig {
  guidelinesUrl?: string;
  guidelinesKey?: string;
  introVideoUrl?: string;
}
