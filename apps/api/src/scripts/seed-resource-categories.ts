/**
 * Seed script: Insert predefined Resource Categories
 * 
 * Run from project root:
 *   npx tsx apps/api/src/scripts/seed-resource-categories.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from api directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { ResourceCategory } from '../models/Resource.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shailaja-ias';

// A dummy admin ObjectId — will be replaced by a real admin if one exists
const DUMMY_ADMIN_ID = new mongoose.Types.ObjectId();

const CATEGORIES = [
    {
        title: 'Standard Text Books',
        icon: '📚',
        accentColor: '#2563EB', // blue
        order: 1,
        predefinedTags: ['GS1', 'GS2', 'GS3', 'GS4', 'Essay', 'Optional'],
        description: 'Essential NCERT and standard reference books',
    },
    {
        title: 'Revision Notes for Prelims',
        icon: '📝',
        accentColor: '#D97706', // orange
        order: 2,
        predefinedTags: ['GS1', 'GS2', 'GS3', 'GS4'],
        description: 'Quick revision notes for Prelims preparation',
    },
    {
        title: 'Revision Notes for Mains',
        icon: '📒',
        accentColor: '#059669', // green
        order: 3,
        predefinedTags: ['GS1', 'GS2', 'GS3', 'GS4', 'Essay', 'Optional'],
        description: 'Comprehensive notes for Mains answer writing',
    },
    {
        title: 'Mains Value Addition Notes',
        icon: '🏆',
        accentColor: '#7C3AED', // purple
        order: 4,
        predefinedTags: ['GS1', 'GS2', 'GS3', 'GS4', 'Essay'],
        description: 'Extra edge notes for Mains value addition',
    },
    {
        title: 'Prelims PYQ Solved',
        icon: '📋',
        accentColor: '#4338CA', // indigo
        order: 5,
        predefinedTags: ['GS1', 'GS2', 'GS3', 'GS4'],
        description: 'Previous year questions with detailed solutions',
    },
    {
        title: 'Mains PYQ Solved',
        icon: '✏️',
        accentColor: '#0D9488', // teal
        order: 6,
        predefinedTags: ['GS1', 'GS2', 'GS3', 'GS4', 'Essay', 'Optional'],
        description: 'Mains previous year questions with model answers',
    },
    {
        title: 'Topper Notes',
        icon: '🎯',
        accentColor: '#DC2626', // red
        order: 7,
        predefinedTags: ['GS1', 'GS2', 'GS3', 'GS4', 'Essay', 'Optional'],
        description: 'Handwritten and compiled notes from UPSC toppers',
    },
];

async function seed() {
    try {
        console.log('🔗 Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.\n');

        // Try to find an admin user to use as createdBy
        const User = mongoose.model('User', new mongoose.Schema({ role: String }), 'users');
        const admin = await User.findOne({ role: 'admin' }).lean();
        const createdBy = admin ? admin._id : DUMMY_ADMIN_ID;
        console.log(`👤 Using admin: ${admin ? admin._id : '(dummy ID — no admin user found)'}\n`);

        // Check for existing categories
        const existing = await ResourceCategory.countDocuments();
        if (existing > 0) {
            console.log(`⚠️  Found ${existing} existing categories. Skipping duplicates...\n`);
        }

        let created = 0;
        let skipped = 0;

        for (const cat of CATEGORIES) {
            const slug = cat.title
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_]+/g, '-')
                .replace(/^-+|-+$/g, '');

            const exists = await ResourceCategory.findOne({ slug });
            if (exists) {
                console.log(`  ⏭  "${cat.title}" already exists — skipped`);
                skipped++;
                continue;
            }

            await ResourceCategory.create({
                ...cat,
                slug,
                isPublished: true,
                createdBy,
            });
            console.log(`  ✅ Created: ${cat.icon} ${cat.title}`);
            created++;
        }

        console.log(`\n🎉 Done! Created: ${created}, Skipped: ${skipped}`);
    } catch (error) {
        console.error('❌ Seed error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB.');
    }
}

seed();
