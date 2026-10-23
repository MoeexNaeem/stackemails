import { Schema, model, models, type Model } from "mongoose";

/** Atomic sequence counters (e.g. human-friendly support ticket numbers). */
type CounterDoc = { _id: string; seq: number };
const CounterSchema = new Schema<CounterDoc>({ _id: { type: String, required: true }, seq: { type: Number, default: 0 } });

export const Counter: Model<CounterDoc> =
  (models.Counter as Model<CounterDoc>) || model<CounterDoc>("Counter", CounterSchema);

/** Next value of a named sequence, starting after `start`. Atomic under concurrency. */
export async function nextSequence(name: string, start = 1000): Promise<number> {
  await Counter.updateOne({ _id: name }, { $setOnInsert: { seq: start } }, { upsert: true });
  const doc = await Counter.findOneAndUpdate({ _id: name }, { $inc: { seq: 1 } }, { returnDocument: "after" });
  return doc!.seq;
}
