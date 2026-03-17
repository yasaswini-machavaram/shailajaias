/**
 * Component Barrel Export
 * Re-exports all components from both locations for unified import
 */

// Original UI components from src/components
export { default as Header } from '../src/components/Header';
export { default as SearchBar } from '../src/components/SearchBar';
export { default as QuickAccessCard, PrelimsIcon, MainsIcon, QuizIcon, MagazineIcon, VideoIcon, TopicIcon } from '../src/components/QuickAccessCard';
export { default as BurningIssuesGallery } from '../src/components/BurningIssuesGallery';

// New User Portal components
export { default as DatePicker } from './DatePicker';
export { default as BottomNav } from './BottomNav';
export { default as TagChips } from './TagChips';
export { default as RichTextRenderer } from './RichTextRenderer';
export { default as QuizOption } from './QuizOption';
