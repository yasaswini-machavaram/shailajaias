import mongoose from 'mongoose';
import { CourseNode } from '../models/Course.js';

async function migrateVideoLocks() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/shailajaias';
    console.log('Connecting to MongoDB at:', mongoUri);
    await mongoose.connect(mongoUri);

    try {
        const courses = await CourseNode.find({});
        console.log(`Found ${courses.length} course nodes for migration.`);

        let updatedNodes = 0;
        for (const course of courses) {
            let modified = false;
            const isNodePracticeLocked = (course as any).isPracticeLocked;
            const isNodeHelpLocked = (course as any).isHelpLocked;

            if (course.videos && course.videos.length > 0) {
                for (const vid of course.videos) {
                    if (isNodePracticeLocked && vid.isPracticeLocked === undefined) {
                        vid.isPracticeLocked = true;
                        modified = true;
                    }
                    if (isNodeHelpLocked && vid.isHelpLocked === undefined) {
                        vid.isHelpLocked = true;
                        modified = true;
                    }
                }
            }

            if (modified) {
                await course.save();
                updatedNodes++;
            }
        }

        console.log(`Migration completed successfully! Updated ${updatedNodes} course nodes.`);
    } catch (err) {
        console.error('Migration failed with error:', err);
    } finally {
        await mongoose.disconnect();
    }
}

migrateVideoLocks();
