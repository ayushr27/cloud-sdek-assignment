import mongoose, { Schema, Document } from 'mongoose';

export interface IGroup extends Document {
  name: string;
  description?: string;
  joinCode: string;
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  assignments: mongoose.Types.ObjectId[];
}

const GroupSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    joinCode: { type: String, required: true, unique: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    assignments: [{ type: Schema.Types.ObjectId, ref: 'Assignment' }],
  },
  { timestamps: true }
);

export const Group = mongoose.model<IGroup>('Group', GroupSchema);
