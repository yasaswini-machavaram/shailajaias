import mongoose, { Schema, Document } from 'mongoose';

export interface ICounter extends Document {
    name: string;
    seq: number;
}

const CounterSchema = new Schema<ICounter>({
    name: {
        type: String,
        required: true,
        unique: true,
    },
    seq: {
        type: Number,
        default: 100,
    },
});

export const Counter = mongoose.model<ICounter>('Counter', CounterSchema);

/**
 * Atomically increment and return the next sequence number for a given counter name.
 * If the counter doesn't exist, it is created with seq = 100, so the first returned value is 101.
 */
export async function getNextSequence(name: string): Promise<number> {
    const counter = await Counter.findOneAndUpdate(
        { name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
}

export default Counter;
