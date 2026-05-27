import mongoose, { Schema, Document, Types } from 'mongoose';

// ─── ResourceCategory ────────────────────────────────────────────────────────
// Admin-managed submodules like "Standard Text Books", "Topper Notes", etc.

export interface IResourceCategory extends Document {
    title: string;
    slug: string;
    description?: string;
    icon: string;           // emoji icon, e.g., "📚"
    accentColor: string;    // hex color for the category accent
    order: number;
    predefinedTags: string[];
    isPublished: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ResourceCategorySchema = new Schema<IResourceCategory>(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        icon: {
            type: String,
            default: '📁',
        },
        accentColor: {
            type: String,
            default: '#1E3A5F',
        },
        order: {
            type: Number,
            default: 0,
        },
        predefinedTags: [{
            type: String,
            trim: true,
        }],
        isPublished: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

ResourceCategorySchema.index({ order: 1 });

// ─── ResourceItem ────────────────────────────────────────────────────────────
// Individual PDF documents within a category.

export interface IResourceItem extends Document {
    title: string;
    category: Types.ObjectId;
    tag: string;
    pdfUrl: string;
    pdfKey: string;
    description?: string;
    order: number;
    isPublished: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const ResourceItemSchema = new Schema<IResourceItem>(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: 'ResourceCategory',
            required: [true, 'Category is required'],
        },
        tag: {
            type: String,
            required: [true, 'Tag is required'],
            trim: true,
        },
        pdfUrl: {
            type: String,
            required: [true, 'PDF URL is required'],
        },
        pdfKey: {
            type: String,
            required: [true, 'PDF key is required'],
        },
        description: {
            type: String,
            trim: true,
        },
        order: {
            type: Number,
            default: 0,
        },
        isPublished: {
            type: Boolean,
            default: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

ResourceItemSchema.index({ category: 1, order: 1 });
ResourceItemSchema.index({ category: 1, tag: 1 });

export const ResourceCategory = mongoose.model<IResourceCategory>('ResourceCategory', ResourceCategorySchema);
export const ResourceItem = mongoose.model<IResourceItem>('ResourceItem', ResourceItemSchema);
