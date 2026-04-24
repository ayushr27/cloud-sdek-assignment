import mongoose, { Schema, Document } from 'mongoose';

export interface IResource extends Document {
  title: string;
  fileUrl: string;
  type: 'pdf' | 'image' | 'ppt' | 'other';
  tags: {
    subject?: string;
    grade?: string;
    chapter?: string;
  };
  uploadedBy: mongoose.Types.ObjectId;
  aiSummary?: string;
}

const ResourceSchema = new Schema(
  {
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
    type: { type: String, enum: ['pdf', 'image', 'ppt', 'other'], required: true },
    tags: {
      subject: String,
      grade: String,
      chapter: String,
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    aiSummary: { type: String },
  },
  { timestamps: true }
);

export const Resource = mongoose.model<IResource>('Resource', ResourceSchema);
