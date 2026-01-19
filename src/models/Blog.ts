import mongoose, { Schema, Document } from 'mongoose';

export interface Blog {
  id?: string;
  title: string;
  slug: string;
  description: string;
  content: string; // Rich text content (HTML)
  cover_image: string;
  tags: string[];
  author: string;
  published: boolean;
  featured: boolean;
  created_at?: string;
  updated_at?: string;
  reading_time: number; // in minutes
  views: number;
}

const BlogSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  content: {
    type: String,
    required: true
  },
  coverImage: {
    type: String,
    required: true
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  author: {
    type: String,
    default: 'Admin'
  },
  published: {
    type: Boolean,
    default: false
  },
  featured: {
    type: Boolean,
    default: false
  },
  readingTime: {
    type: Number,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better search performance
BlogSchema.index({ title: 'text', description: 'text', content: 'text' });
BlogSchema.index({ tags: 1 });
BlogSchema.index({ published: 1 });
BlogSchema.index({ featured: 1 });
BlogSchema.index({ createdAt: -1 });

// Pre-save middleware to generate slug from title
BlogSchema.pre<IBlog>('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Method to calculate reading time
BlogSchema.methods.calculateReadingTime = function(): number {
  const wordsPerMinute = 200;
  const textContent = this.content.replace(/<[^>]*>/g, ''); // Strip HTML tags
  const wordCount = textContent.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
};

// Static method to find published blogs
BlogSchema.statics.findPublished = function() {
  return this.find({ published: true }).sort({ createdAt: -1 });
};

// Static method to find featured blogs
BlogSchema.statics.findFeatured = function() {
  return this.find({ published: true, featured: true }).sort({ createdAt: -1 });
};

export default mongoose.models.Blog || mongoose.model<IBlog>('Blog', BlogSchema);