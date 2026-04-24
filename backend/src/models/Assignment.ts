import mongoose, { Document, Schema } from 'mongoose';

export interface IQuestionType {
  type: string;
  count: number;
  marks: number;
}

export interface IQuestion {
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  options?: string[];       // for MCQ
  answer?: string;
}

export interface ISection {
  title: string;
  instruction: string;
  questions: IQuestion[];
}

export interface IQuestionPaper {
  schoolName: string;
  subject: string;
  className: string;
  timeAllowed: string;
  totalMarks: number;
  sections: ISection[];
}

export interface IAssignment extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  subject: string;
  className: string;
  chapters: string[];
  dueDate: Date;
  questionTypes: IQuestionType[];
  additionalInstructions: string;
  fileUrl?: string;
  status: 'pending' | 'generating' | 'done' | 'error';
  jobId?: string;
  result?: IQuestionPaper;
  markingScheme?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  text: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  marks: { type: Number, required: true },
  options: [String],
  answer: String,
});

const SectionSchema = new Schema<ISection>({
  title: { type: String, required: true },
  instruction: { type: String, required: true },
  questions: [QuestionSchema],
});

const QuestionPaperSchema = new Schema<IQuestionPaper>({
  schoolName: String,
  subject: String,
  className: String,
  timeAllowed: String,
  totalMarks: Number,
  sections: [SectionSchema],
});

const QuestionTypeSchema = new Schema<IQuestionType>({
  type: { type: String, required: true },
  count: { type: Number, required: true, min: 1 },
  marks: { type: Number, required: true, min: 1 },
});

const AssignmentSchema = new Schema<IAssignment>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    className: { type: String, required: true },
    chapters: [{ type: String }],
    dueDate: { type: Date, required: true },
    questionTypes: [QuestionTypeSchema],
    additionalInstructions: { type: String, default: '' },
    fileUrl: String,
    status: {
      type: String,
      enum: ['pending', 'generating', 'done', 'error'],
      default: 'pending',
    },
    jobId: String,
    result: QuestionPaperSchema,
    markingScheme: String,
    errorMessage: String,
  },
  { timestamps: true }
);

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
