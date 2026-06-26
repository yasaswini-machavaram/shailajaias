/**
 * API Service Layer for User Portal
 * Centralized client for fetching data from the Admin Portal API
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Types
export interface Article {
    _id: string;
    title: string;
    content: string;
    type: 'daily_prelims' | 'mains' | 'burning_issue';
    date: string;
    tags: string[];
    source?: string | { name: string; url: string };
    imageUrl?: string;
    isPublished: boolean;
}

export interface Question {
    _id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    correctIndex: number;
    explanation: string;
    subject?: string;
}

export interface Quiz {
    _id: string;
    title: string;
    setName?: string;
    date: string;
    questions: Question[];
    tags: string[];
}

export interface BurningIssueImage {
    url: string;
    originalName: string;
    order: number;
}

export interface BurningIssue {
    _id: string;
    topic: string;
    images: BurningIssueImage[];
    date: string;
}

export type MagazineCategory = 'prelims_monthly' | 'mains_monthly' | 'mcq_monthly' | 'quarterly';

export interface Magazine {
    _id: string;
    title: string;
    pdfUrl: string;
    pdfKey: string;
    category: MagazineCategory;
    year: number;
    month: string;
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface TestSeriesItem {
    title: string;
    date: string;
    quizId?: Quiz | string;
    questionPaperUrl?: string;
    questionPaperKey?: string;
    solutionPaperUrl?: string;
    solutionPaperKey?: string;
    syllabus?: string;
    discussionVideoUrl?: string;
    isLocked: boolean;
}

export interface TestSeries {
    _id: string;
    title: string;
    description?: string;
    brochureUrl?: string;
    brochureKey?: string;
    introVideoUrl?: string;
    tests: TestSeriesItem[];
    isPublished: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// Helper function
async function fetchApi<T>(endpoint: string): Promise<ApiResponse<T>> {
    const response = await fetch(`${API_URL}${endpoint}`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
}

// Article APIs
export async function getArticlesByDate(
    type: 'daily_prelims' | 'mains' | 'burning_issue',
    date: string
): Promise<Article[]> {
    const { data } = await fetchApi<Article[]>(
        `/api/articles/by-date?type=${type}&date=${date}`
    );
    return data || [];
}

export async function getAdjacentDates(
    type: 'daily_prelims' | 'mains' | 'burning_issue',
    date: string
): Promise<{ previous: string | null; next: string | null }> {
    const { data } = await fetchApi<{ previous: string | null; next: string | null }>(
        `/api/articles/adjacent-dates?type=${type}&date=${date}`
    );
    return data || { previous: null, next: null };
}

export async function getAdjacentQuizDates(
    date: string
): Promise<{ previous: string | null; next: string | null }> {
    const { data } = await fetchApi<{ previous: string | null; next: string | null }>(
        `/api/quizzes/adjacent-dates?date=${date}`
    );
    return data || { previous: null, next: null };
}

export async function getArticleById(id: string): Promise<Article | null> {
    const { data } = await fetchApi<Article>(`/api/articles/${id}`);
    return data || null;
}

export async function getBurningIssues(limit = 10): Promise<Article[]> {
    const { data } = await fetchApi<Article[]>(
        `/api/articles?type=burning_issue&limit=${limit}&sort=recent`
    );
    return data || [];
}

// Quiz APIs
export async function getQuizzesByDate(date: string): Promise<Quiz[]> {
    const { data } = await fetchApi<Quiz[]>(`/api/quizzes?date=${date}&includeQuestions=true`);
    return data || [];
}

export async function getQuizzesByTag(tag: string): Promise<Quiz[]> {
    const { data } = await fetchApi<Quiz[]>(`/api/quizzes?tags=${tag}&includeQuestions=true&limit=100`);
    return data || [];
}

export async function getQuizByDate(date: string): Promise<Quiz | null> {
    const quizzes = await getQuizzesByDate(date);
    return quizzes?.[0] || null;
}

export async function getQuizById(id: string): Promise<Quiz | null> {
    const { data } = await fetchApi<Quiz>(`/api/quizzes/${id}`);
    return data || null;
}

// Burning Issue (image carousel) APIs
export async function getBurningIssuesList(date?: string): Promise<BurningIssue[]> {
    let url = '/api/burning-issues?limit=50';
    if (date) url += `&date=${date}`;
    const { data } = await fetchApi<BurningIssue[]>(url);
    return data || [];
}

export async function getBurningIssueById(id: string): Promise<BurningIssue | null> {
    const { data } = await fetchApi<BurningIssue>(`/api/burning-issues/${id}`);
    return data || null;
}

// Magazine (PDF) APIs
export async function getMagazines(category?: MagazineCategory, year?: number): Promise<Magazine[]> {
    let url = '/api/magazines?limit=50';
    if (category) url += `&category=${category}`;
    if (year) url += `&year=${year}`;
    const { data } = await fetchApi<Magazine[]>(url);
    return data || [];
}

export async function getMagazineById(id: string): Promise<Magazine | null> {
    const { data } = await fetchApi<Magazine>(`/api/magazines/${id}`);
    return data || null;
}

// Stats API (for home page)
export async function getStats(): Promise<{
    articles: number;
    burningIssues: number;
    magazines: number;
    quizzes: number;
    courses: number;
}> {
    const [articles, burningIssues, magazines, quizzes, courses] = await Promise.all([
        fetchApi<Article[]>('/api/articles?limit=1'),
        fetchApi<BurningIssue[]>('/api/burning-issues?limit=1'),
        fetchApi<Magazine[]>('/api/magazines?limit=1'),
        fetchApi<Quiz[]>('/api/quizzes?limit=1'),
        fetchApi<unknown[]>('/api/courses?limit=1'),
    ]);

    return {
        articles: articles.pagination?.total || 0,
        burningIssues: burningIssues.pagination?.total || 0,
        magazines: magazines.pagination?.total || 0,
        quizzes: quizzes.pagination?.total || 0,
        courses: courses.pagination?.total || 0,
    };
}

// Test Series APIs
export async function getTestSeriesList(includeUnpublished?: boolean): Promise<TestSeries[]> {
    let url = '/api/tests/series';
    if (includeUnpublished) url += '?includeUnpublished=true';
    const { data } = await fetchApi<TestSeries[]>(url);
    return data || [];
}

export async function getTestSeriesById(id: string): Promise<TestSeries | null> {
    const { data } = await fetchApi<TestSeries>(`/api/tests/series/${id}`);
    return data || null;
}

// Date helper — use UTC to avoid timezone drift
export function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

export function formatDisplayDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    try {
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
        });
    } catch {
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    }
}
