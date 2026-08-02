import mongoose, { Schema, Document } from 'mongoose';

export interface IMainsPracticeTestConfig extends Document {
    key: string; // 'mpt_global_config'
    guidelinesUrl?: string;
    guidelinesKey?: string;
    introVideoUrl?: string;
    updatedAt: Date;
}

const MainsPracticeTestConfigSchema = new Schema<IMainsPracticeTestConfig>(
    {
        key: {
            type: String,
            default: 'mpt_global_config',
            unique: true,
        },
        guidelinesUrl: {
            type: String,
        },
        guidelinesKey: {
            type: String,
        },
        introVideoUrl: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

export const MainsPracticeTestConfig = mongoose.model<IMainsPracticeTestConfig>(
    'MainsPracticeTestConfig',
    MainsPracticeTestConfigSchema
);
export default MainsPracticeTestConfig;
