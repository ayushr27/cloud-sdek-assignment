import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'teacher' | 'admin' | 'student';
  school?: string;
  phone?: string;
  designation?: string;
  bio?: string;
  subjects?: string[];
  city?: string;
  state?: string;
  branch?: string;
  degree?: string;
  createdAt?: Date;
  updatedAt?: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['teacher', 'admin', 'student'], default: 'student' },
    school: { type: String },
    phone: { type: String },
    designation: { type: String },
    bio: { type: String },
    subjects: [{ type: String }],
    city: { type: String },
    state: { type: String },
    branch: { type: String },
    degree: { type: String },
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = async function (candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
