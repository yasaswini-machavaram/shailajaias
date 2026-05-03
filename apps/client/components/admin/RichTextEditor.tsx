'use client';

import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { useCallback, useEffect, useState } from 'react';

interface RichTextEditorProps {
    content: string; // JSON string
    onChange: (json: string) => void;
    placeholder?: string;
}

// Toolbar button component
function ToolbarButton({
    onClick,
    isActive = false,
    disabled = false,
    title,
    children,
}: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            onMouseDown={(e) => e.preventDefault()}
            disabled={disabled}
            title={title}
            className={`rte-toolbar-btn ${isActive ? 'rte-toolbar-btn--active' : ''}`}
        >
            {children}
        </button>
    );
}

// Toolbar separator
function ToolbarSep() {
    return <div className="rte-toolbar-sep" />;
}

// Toolbar component
function Toolbar({ editor }: { editor: Editor }) {
    const [linkUrl, setLinkUrl] = useState('');
    const [showLinkInput, setShowLinkInput] = useState(false);

    const addImage = useCallback(() => {
        const url = window.prompt('Enter image URL:');
        if (url) {
            editor.chain().focus().setImage({ src: url }).run();
        }
    }, [editor]);

    const openLinkInput = useCallback(() => {
        const previousUrl = editor.getAttributes('link').href;
        setLinkUrl(previousUrl || '');
        setShowLinkInput(true);
    }, [editor]);

    const applyLink = useCallback(() => {
        if (linkUrl === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run();
        } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
        }
        setShowLinkInput(false);
        setLinkUrl('');
    }, [editor, linkUrl]);

    const cancelLink = useCallback(() => {
        setShowLinkInput(false);
        setLinkUrl('');
        editor.chain().focus().run();
    }, [editor]);

    if (showLinkInput) {
        return (
            <div className="rte-toolbar flex items-center gap-2">
                <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Enter URL (e.g. https://google.com)"
                    className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    autoFocus
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            applyLink();
                        } else if (e.key === 'Escape') {
                            e.preventDefault();
                            cancelLink();
                        }
                    }}
                />
                <button
                    type="button"
                    onClick={applyLink}
                    className="px-3 py-1 bg-amber-500 text-white text-sm rounded hover:bg-amber-600"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    Apply
                </button>
                <button
                    type="button"
                    onClick={cancelLink}
                    className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200"
                    onMouseDown={(e) => e.preventDefault()}
                >
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <div className="rte-toolbar">
            {/* Headings */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
            >
                H1
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
            >
                H2
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
            >
                H3
            </ToolbarButton>

            <ToolbarSep />

            {/* Text formatting */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold (Ctrl+B)"
            >
                <strong>B</strong>
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic (Ctrl+I)"
            >
                <em>I</em>
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                title="Underline (Ctrl+U)"
            >
                <u>U</u>
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                isActive={editor.isActive('highlight')}
                title="Highlight"
            >
                <span style={{ background: '#fef08a', padding: '0 2px' }}>H</span>
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleSubscript().run()}
                isActive={editor.isActive('subscript')}
                title="Subscript"
            >
                X<sub>2</sub>
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleSuperscript().run()}
                isActive={editor.isActive('superscript')}
                title="Superscript"
            >
                X<sup>2</sup>
            </ToolbarButton>

            <ToolbarSep />

            {/* Alignment */}
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                isActive={editor.isActive({ textAlign: 'left' })}
                title="Align Left"
            >
                ⇤
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                isActive={editor.isActive({ textAlign: 'center' })}
                title="Align Center"
            >
                ↔
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                isActive={editor.isActive({ textAlign: 'right' })}
                title="Align Right"
            >
                ⇥
            </ToolbarButton>

            <ToolbarSep />

            {/* Lists */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
            >
                • List
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Numbered List"
            >
                1. List
            </ToolbarButton>

            <ToolbarSep />

            {/* Blockquote & Link */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Blockquote / Context Block"
            >
                ❝ Quote
            </ToolbarButton>
            <ToolbarButton
                onClick={openLinkInput}
                isActive={editor.isActive('link')}
                title="Link"
            >
                🔗 Link
            </ToolbarButton>

            <ToolbarSep />

            {/* Insertions */}
            <ToolbarButton
                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                title="Horizontal Rule"
            >
                ― HR
            </ToolbarButton>

            <ToolbarSep />

            {/* Undo / Redo */}
            <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
                title="Undo (Ctrl+Z)"
            >
                ↩
            </ToolbarButton>
            <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
                title="Redo (Ctrl+Shift+Z)"
            >
                ↪
            </ToolbarButton>
        </div>
    );
}

export default function RichTextEditor({
    content,
    onChange,
    placeholder = 'Start writing your article content...',
}: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Image.configure({
                HTMLAttributes: { class: 'rte-image' },
            }),
            Placeholder.configure({ placeholder }),
            Highlight,
            Underline,
            Link.configure({
                openOnClick: false,
                autolink: true,
                linkOnPaste: true,
                HTMLAttributes: { class: 'rte-link' },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Subscript,
            Superscript,
        ],
        content: content ? tryParseJSON(content) : '',
        onUpdate: ({ editor }) => {
            const json = JSON.stringify(editor.getJSON());
            onChange(json);
        },
        editorProps: {
            attributes: {
                class: 'rte-editor-content',
            },
        },
        immediatelyRender: false,
    });

    // Update content when prop changes externally
    useEffect(() => {
        if (editor && content) {
            const parsed = tryParseJSON(content);
            if (parsed && JSON.stringify(editor.getJSON()) !== content) {
                editor.commands.setContent(parsed);
            }
        }
    }, [content, editor]);

    if (!editor) {
        return (
            <div className="rte-loading">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-amber-500" />
            </div>
        );
    }

    return (
        <div className="rte-wrapper">
            <Toolbar editor={editor} />
            <EditorContent editor={editor} />
        </div>
    );
}

function tryParseJSON(str: string): Record<string, unknown> | string {
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
}
