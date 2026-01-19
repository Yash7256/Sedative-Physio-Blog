# Blog Management System

A full-featured blog management system built with Next.js, MongoDB, and TipTap rich text editor.

## Features

- ✅ Rich text editing with formatting (bold, italic, underline, headings)
- ✅ Bullet points and ordered lists
- ✅ Image uploads for cover images and inline content
- ✅ Table support
- ✅ Link embedding
- ✅ Tag management
- ✅ Draft/Published workflow
- ✅ Featured posts
- ✅ View counting
- ✅ Reading time calculation
- ✅ Responsive admin dashboard
- ✅ SEO-friendly URLs

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup MongoDB

You can use either:
- Local MongoDB installation
- MongoDB Atlas (cloud)
- Docker container

#### Local MongoDB Setup:
```bash
# Install MongoDB locally
sudo apt-get install mongodb

# Start MongoDB service
sudo systemctl start mongodb

# Verify it's running
mongo --eval 'db.runCommand({ connectionStatus: 1 })'
```

#### MongoDB Atlas Setup:
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Update `.env.local` with your MongoDB URI

### 3. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.local.example .env.local
```

Update the values in `.env.local`:

```env
# Database Configuration
MONGODB_URI=your_mongodb_connection_string

# Application Configuration  
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

### Creating Blog Posts

1. Navigate to `/admin` to access the admin dashboard
2. Click "Create New Blog"
3. Fill in the form:
   - **Title**: Blog post title
   - **Description**: Short description/preview text
   - **Cover Image**: Upload or paste image URL
   - **Tags**: Comma-separated tags
   - **Content**: Use the rich text editor for full content
   - **Author**: Post author name
   - **Publish**: Toggle to make live
   - **Feature**: Toggle to mark as featured

### Rich Text Editor Features

The editor supports:
- **Text formatting**: Bold, Italic, Underline
- **Headings**: H1, H2, H3
- **Lists**: Bullet points and numbered lists
- **Links**: Insert hyperlinks
- **Images**: Upload and insert images
- **Tables**: Create and edit tables

### Managing Posts

From the admin dashboard you can:
- Edit existing posts
- Delete posts
- Toggle publish status
- Set featured status
- View analytics (views, reading time)

## API Endpoints

### Blogs
- `GET /api/blogs` - Get all blogs (supports pagination, filtering)
- `POST /api/blogs` - Create new blog
- `GET /api/blogs/[slug]` - Get specific blog
- `PUT /api/blogs/[slug]` - Update blog
- `DELETE /api/blogs/[slug]` - Delete blog

### Upload
- `POST /api/upload` - Upload images

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── blogs/
│   │   │   ├── route.ts          # Blogs CRUD operations
│   │   │   └── [slug]/route.ts   # Individual blog operations
│   │   └── upload/
│   │       └── route.ts          # Image upload endpoint
│   ├── admin/
│   │   └── page.tsx              # Admin dashboard
│   ├── blog/
│   │   ├── [slug]/page.tsx       # Individual blog page
│   │   └── page.tsx              # Blog listing page
│   └── ...
├── components/
│   └── RichTextEditor.tsx        # TipTap rich text editor
├── models/
│   └── Blog.ts                   # Mongoose blog schema
└── lib/
    └── dbConnect.ts              # Database connection utility
```

## Customization

### Styling
- Modify `globals.css` for custom editor styles
- Update Tailwind classes in components
- Adjust color scheme in `tailwind.config.ts`

### Extensions
You can add more TipTap extensions by:
1. Installing the extension package
2. Adding it to the extensions array in `RichTextEditor.tsx`
3. Adding toolbar buttons if needed

### Database
The system uses MongoDB with Mongoose. You can:
- Add new fields to the Blog schema
- Create additional models
- Modify indexes for better performance

## Deployment

### Vercel Deployment
1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Production MongoDB
For production, use MongoDB Atlas:
1. Create production cluster
2. Update `MONGODB_URI` in environment variables
3. Configure IP whitelist and database user

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check if MongoDB is running
   - Verify `MONGODB_URI` in `.env.local`
   - Ensure network connectivity

2. **Image Upload Not Working**
   - Check if `public/uploads` directory exists
   - Verify file permissions
   - Check browser console for errors

3. **Rich Text Editor Not Loading**
   - Clear browser cache
   - Check for JavaScript errors in console
   - Ensure all TipTap dependencies are installed

### Getting Help

If you encounter issues:
1. Check the browser console for errors
2. Review server logs
3. Verify all dependencies are installed
4. Check environment variables are set correctly

## Contributing

Feel free to submit issues and enhancement requests!