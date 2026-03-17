'use client';

/**
 * TipTap JSON Rich Text Renderer
 * Parses TipTap editor JSON output and renders it with the Shailaja IAS design system.
 * Supports: headings (numbered H2s), paragraphs, bullet/ordered lists,
 * blockquotes (context blocks), images, bold, italic, underline, highlight.
 */

import { useMemo } from 'react';

interface TipTapNode {
    type: string;
    content?: TipTapNode[];
    text?: string;
    marks?: { type: string; attrs?: Record<string, unknown> }[];
    attrs?: Record<string, unknown>;
}

interface RichTextRendererProps {
    content: string;
    className?: string;
}

export default function RichTextRenderer({ content, className = '' }: RichTextRendererProps) {
    const parsed = useMemo(() => tryParseJSON(content), [content]);

    if (!parsed) {
        // Fallback for legacy HTML content
        return (
            <article
                className={`article-content ${className}`}
                dangerouslySetInnerHTML={{ __html: content }}
            />
        );
    }

    const doc = parsed as unknown as TipTapNode;
    if (!doc.content) return null;

    return (
        <article className={`article-content ${className}`}>
            <RenderNodes nodes={doc.content} />
        </article>
    );
}

// Track H2 counter for numbered sections
function RenderNodes({ nodes }: { nodes: TipTapNode[] }) {
    let h2Counter = 0;

    return (
        <>
            {nodes.map((node, i) => {
                if (node.type === 'heading' && node.attrs?.level === 2) {
                    h2Counter++;
                    return <RenderNode key={i} node={node} h2Number={h2Counter} />;
                }
                return <RenderNode key={i} node={node} />;
            })}
        </>
    );
}

function RenderNode({ node, h2Number }: { node: TipTapNode; h2Number?: number }) {
    switch (node.type) {
        case 'heading':
            return renderHeading(node, h2Number);
        case 'paragraph':
            return renderParagraph(node);
        case 'bulletList':
            return renderBulletList(node);
        case 'orderedList':
            return renderOrderedList(node);
        case 'listItem':
            return renderListItem(node);
        case 'blockquote':
            return renderBlockquote(node);
        case 'image':
            return renderImage(node);
        case 'horizontalRule':
            return <hr className="article-hr" />;
        case 'text':
            return renderText(node);
        default:
            // Render children for unknown types
            if (node.content) {
                return <>{node.content.map((child, i) => <RenderNode key={i} node={child} />)}</>;
            }
            if (node.text) return <>{node.text}</>;
            return null;
    }
}

function renderHeading(node: TipTapNode, h2Number?: number) {
    const level = (node.attrs?.level as number) || 2;
    const textAlign = (node.attrs?.textAlign as string) || 'left';
    const children = node.content?.map((child, i) => <RenderNode key={i} node={child} />);
    const style = { textAlign: textAlign as 'left' | 'center' | 'right' };

    if (level === 1) {
        return <h1 className="article-h1" style={style}>{children}</h1>;
    }
    if (level === 2) {
        return (
            <h2 className="article-h2" style={style}>
                {h2Number && (
                    <span className="article-h2-number">{h2Number}</span>
                )}
                <span>{children}</span>
            </h2>
        );
    }
    return <h3 className="article-h3" style={style}>{children}</h3>;
}

function renderParagraph(node: TipTapNode) {
    if (!node.content || node.content.length === 0) {
        return <p className="article-p">&nbsp;</p>;
    }

    const textAlign = (node.attrs?.textAlign as string) || 'left';
    const style = { textAlign: textAlign as 'left' | 'center' | 'right' };

    return (
        <p className="article-p" style={style}>
            {node.content.map((child, i) => <RenderNode key={i} node={child} />)}
        </p>
    );
}

function renderBulletList(node: TipTapNode) {
    return (
        <ul className="article-ul">
            {node.content?.map((child, i) => <RenderNode key={i} node={child} />)}
        </ul>
    );
}

function renderOrderedList(node: TipTapNode) {
    return (
        <ol className="article-ol">
            {node.content?.map((child, i) => <RenderNode key={i} node={child} />)}
        </ol>
    );
}

function renderListItem(node: TipTapNode) {
    return (
        <li className="article-li">
            {node.content?.map((child, i) => <RenderNode key={i} node={child} />)}
        </li>
    );
}

function renderBlockquote(node: TipTapNode) {
    return (
        <blockquote className="article-blockquote">
            <span className="article-blockquote-label">Context: </span>
            {node.content?.map((child, i) => <RenderNode key={i} node={child} />)}
        </blockquote>
    );
}

function renderImage(node: TipTapNode) {
    const src = node.attrs?.src as string;
    const alt = (node.attrs?.alt as string) || '';
    const title = (node.attrs?.title as string) || '';
    if (!src) return null;

    return (
        <figure className="article-figure">
            <img src={src} alt={alt} title={title} className="article-img" />
            {title && <figcaption className="article-figcaption">{title}</figcaption>}
        </figure>
    );
}

function renderText(node: TipTapNode) {
    let element: React.ReactNode = node.text || '';

    if (node.marks) {
        for (const mark of node.marks) {
            switch (mark.type) {
                case 'bold':
                    element = <strong className="article-bold">{element}</strong>;
                    break;
                case 'italic':
                    element = <em className="article-italic">{element}</em>;
                    break;
                case 'underline':
                    element = <u>{element}</u>;
                    break;
                case 'highlight':
                    element = <mark className="article-highlight">{element}</mark>;
                    break;
                case 'link':
                    element = (
                        <a
                            href={mark.attrs?.href as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="article-link"
                        >
                            {element}
                        </a>
                    );
                    break;
                case 'subscript':
                    element = <sub>{element}</sub>;
                    break;
                case 'superscript':
                    element = <sup>{element}</sup>;
                    break;
            }
        }
    }

    return <>{element}</>;
}

function tryParseJSON(str: string): Record<string, unknown> | null {
    try {
        const parsed = JSON.parse(str);
        if (parsed && typeof parsed === 'object' && parsed.type === 'doc') {
            return parsed;
        }
        return null;
    } catch {
        return null;
    }
}
