import mongoose from 'mongoose';
import { INote } from '../types/note';

const noteSchema = new mongoose.Schema<INote>({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: false,
    trim: true,
  },
  filename: {
    type: String,
    required: true,
    unique: true,
  },
  original_name: {
    type: String,
    required: true,
  },
  content_type: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  uploaded_at: {
    type: Date,
    default: Date.now,
  },
  category: {
    type: String,
    required: false,
    trim: true,
  },
  tags: [{
    type: String,
    trim: true,
  }],
});

const Note = mongoose.models.Note || mongoose.model<INote>('Note', noteSchema);

export default Note;