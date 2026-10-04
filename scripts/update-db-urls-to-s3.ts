import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../apps/api/.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/shailaja-ias';
const AWS_BUCKET_NAME = process.env.AWS_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const CDN_URL = process.env.CDN_URL; // Optional CloudFront CDN URL (e.g., https://cdn.shailajaias.com)

const getS3Url = (filename: string): string => {
    const cleanFilename = filename.replace(/^\/?uploads\//, '');
    if (CDN_URL) {
        return `${CDN_URL.replace(/\/$/, '')}/uploads/${cleanFilename}`;
    }
    return `https://${AWS_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/uploads/${cleanFilename}`;
};

async function migrateUrls() {
    if (!AWS_BUCKET_NAME && !CDN_URL) {
        console.error('❌ Error: AWS_BUCKET_NAME or CDN_URL must be defined in your environment variables.');
        process.exit(1);
    }

    console.log(`🔄 Connecting to MongoDB: ${MONGO_URI.replace(/:([^:@]{4})[^:@]*@/, ':****@')}...`);
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB.');

    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('Database connection not established');
    }

    let totalUpdated = 0;

    // 1. Burning Issues
    const burningIssuesCol = db.collection('burningissues');
    const burningIssues = await burningIssuesCol.find({
        $or: [
            { 'images.url': { $regex: '/uploads/' } },
            { 'images.url': { $regex: 'localhost:4000' } },
        ],
    }).toArray();

    for (const bi of burningIssues) {
        let modified = false;
        const updatedImages = (bi.images || []).map((img: any) => {
            if (img.url && (img.url.includes('/uploads/') || img.url.includes('localhost:4000'))) {
                const filename = img.url.split('/').pop();
                modified = true;
                return { ...img, url: getS3Url(filename) };
            }
            return img;
        });

        if (modified) {
            await burningIssuesCol.updateOne({ _id: bi._id }, { $set: { images: updatedImages } });
            totalUpdated++;
            console.log(`Updated Burning Issue: ${bi.title || bi._id}`);
        }
    }

    // 2. Resource Items
    const resourceCol = db.collection('resourceitems');
    const resources = await resourceCol.find({
        $or: [
            { pdfUrl: { $regex: '/uploads/' } },
            { pdfUrl: { $regex: 'localhost:4000' } },
        ],
    }).toArray();

    for (const res of resources) {
        if (res.pdfUrl) {
            const filename = res.pdfUrl.split('/').pop();
            await resourceCol.updateOne({ _id: res._id }, { $set: { pdfUrl: getS3Url(filename) } });
            totalUpdated++;
            console.log(`Updated Resource Item: ${res.title || res._id}`);
        }
    }

    // 3. Magazine PDFs
    const magPdfCol = db.collection('magazinepdfs');
    const magPdfs = await magPdfCol.find({
        $or: [
            { fileUrl: { $regex: '/uploads/' } },
            { fileUrl: { $regex: 'localhost:4000' } },
        ],
    }).toArray();

    for (const mp of magPdfs) {
        if (mp.fileUrl) {
            const filename = mp.fileUrl.split('/').pop();
            await magPdfCol.updateOne({ _id: mp._id }, { $set: { fileUrl: getS3Url(filename) } });
            totalUpdated++;
            console.log(`Updated Magazine PDF: ${mp.title || mp._id}`);
        }
    }

    // 4. Mains Submissions (Student Answers & Evaluated Copies)
    const submissionsCol = db.collection('mainssubmissions');
    const submissions = await submissionsCol.find({}).toArray();

    for (const sub of submissions) {
        let modified = false;
        const updateObj: any = {};

        if (Array.isArray(sub.answerFiles)) {
            const updatedAnswerFiles = sub.answerFiles.map((f: any) => {
                if (f.url && (f.url.includes('/uploads/') || f.url.includes('localhost:4000'))) {
                    const filename = f.url.split('/').pop();
                    modified = true;
                    return { ...f, url: getS3Url(filename) };
                }
                return f;
            });
            if (modified) updateObj.answerFiles = updatedAnswerFiles;
        }

        if (sub.evaluatedFileUrl && (sub.evaluatedFileUrl.includes('/uploads/') || sub.evaluatedFileUrl.includes('localhost:4000'))) {
            const filename = sub.evaluatedFileUrl.split('/').pop();
            updateObj.evaluatedFileUrl = getS3Url(filename);
            modified = true;
        }

        if (modified) {
            await submissionsCol.updateOne({ _id: sub._id }, { $set: updateObj });
            totalUpdated++;
            console.log(`Updated Mains Submission: ${sub._id}`);
        }
    }

    // 5. Mains Test Series Question Papers & Brochures
    const mtsCol = db.collection('mainstestseries');
    const mtsList = await mtsCol.find({}).toArray();

    for (const mts of mtsList) {
        let modified = false;
        const updateObj: any = {};

        if (mts.brochurePdfUrl && (mts.brochurePdfUrl.includes('/uploads/') || mts.brochurePdfUrl.includes('localhost:4000'))) {
            const filename = mts.brochurePdfUrl.split('/').pop();
            updateObj.brochurePdfUrl = getS3Url(filename);
            modified = true;
        }

        if (Array.isArray(mts.tests)) {
            const updatedTests = mts.tests.map((t: any) => {
                let testMod = false;
                const newT = { ...t };
                if (newT.questionPaperPdfUrl && (newT.questionPaperPdfUrl.includes('/uploads/') || newT.questionPaperPdfUrl.includes('localhost:4000'))) {
                    newT.questionPaperPdfUrl = getS3Url(newT.questionPaperPdfUrl.split('/').pop());
                    testMod = true;
                }
                if (newT.modelAnswerPdfUrl && (newT.modelAnswerPdfUrl.includes('/uploads/') || newT.modelAnswerPdfUrl.includes('localhost:4000'))) {
                    newT.modelAnswerPdfUrl = getS3Url(newT.modelAnswerPdfUrl.split('/').pop());
                    testMod = true;
                }
                if (testMod) modified = true;
                return newT;
            });
            if (modified) updateObj.tests = updatedTests;
        }

        if (modified) {
            await mtsCol.updateOne({ _id: mts._id }, { $set: updateObj });
            totalUpdated++;
            console.log(`Updated Mains Test Series: ${mts.title || mts._id}`);
        }
    }

    console.log(`\n🎉 Migration Complete: Successfully migrated ${totalUpdated} records to S3 URLs!`);
    await mongoose.disconnect();
}

migrateUrls().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
