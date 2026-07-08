import mongoose, { Schema } from 'mongoose';
import type { Document } from 'mongoose';

export interface ISession extends Document {
    userId: mongoose.Types.ObjectId;
    deviceId: string;
    deviceName: string;
    lastActive: Date;
    createdAt: Date;
    updatedAt: Date;
}

const SessionSchema = new Schema<ISession>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        deviceId: {
            type: String,
            required: true,
            trim: true,
        },
        deviceName: {
            type: String,
            default: 'Unknown Device',
            trim: true,
        },
        lastActive: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for fast lookups by user + device
SessionSchema.index({ userId: 1, deviceId: 1 }, { unique: true });

// TTL index: auto-delete sessions inactive for 30 days
SessionSchema.index({ lastActive: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Session = mongoose.model<ISession>('Session', SessionSchema);
export default Session;
