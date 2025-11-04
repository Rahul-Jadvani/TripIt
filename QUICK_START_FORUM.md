# Quick Start - Chain Forum Feature

## 🚀 Running the Forum Feature

### Step 1: Database Setup

Run the migration to create the forum tables:

```bash
cd backend
python migrations/create_chain_posts.py
```

You should see:
```
✅ Chain posts table created
✅ Chain post reactions table created
✅ Reaction count trigger created
✅ Reply count trigger created
✅ Activity timestamp trigger created
```

### Step 2: Start Backend

```bash
cd backend
python app.py
```

Backend will start on `http://localhost:5000`

### Step 3: Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will start on `http://localhost:5173`

### Step 4: Test the Feature

1. **Login** to your account
2. **Navigate** to any chain (create one if needed)
3. **Click the "Forum" tab**
4. **Create a discussion**:
   - Click "New Discussion"
   - Add a title: "Welcome to our community!"
   - Add content with markdown:
     ```markdown
     ## Hello everyone!

     This is our new **discussion forum**. Feel free to:
     - Ask questions
     - Share ideas
     - Connect with others

     [Check out our docs](https://example.com)
     ```
   - Upload images (optional)
   - Click "Post Discussion"

5. **Interact with posts**:
   - ⬆️ Upvote posts you like
   - 💬 Reply to discussions
   - ✏️ Edit your own posts
   - 📌 Pin important posts (chain owner)
   - 🔒 Lock posts to prevent replies (chain owner)

## 🎯 Key Features to Test

### For All Users:
- ✅ Create posts with markdown
- ✅ Upload images
- ✅ Reply to posts (nested comments)
- ✅ Upvote/downvote
- ✅ Edit own posts
- ✅ Delete own posts
- ✅ Sort by Hot/New/Top/Active

### For Chain Owners:
- ✅ Pin/unpin posts
- ✅ Lock/unlock posts
- ✅ Delete any post in the chain

## 📝 Markdown Examples

Try these in your posts:

```markdown
# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
~~Strikethrough~~

- Bullet point 1
- Bullet point 2

1. Numbered item
2. Another item

[Link text](https://example.com)

> This is a quote

`inline code`

\`\`\`javascript
// Code block
const greeting = "Hello!";
\`\`\`
```

## 🔍 Checking It Works

### Backend Check
Visit: `http://localhost:5000/health`
Should return: `{"status": "ok", "message": "0x.ship backend is running"}`

### Database Check
Connect to PostgreSQL and verify tables exist:
```sql
SELECT COUNT(*) FROM chain_posts;
SELECT COUNT(*) FROM chain_post_reactions;
```

### Frontend Check
Open browser console (F12) and check for errors.
Network tab should show successful API calls to `/api/chains/:slug/posts`

## 🐛 Common Issues

### "Chain not found"
- Make sure you've created a chain first
- Check the chain slug in the URL matches

### "Unauthorized"
- Login first
- Check JWT token in localStorage

### "Failed to create post"
- Check backend console for errors
- Verify chain status is 'active'
- Make sure title and content are not empty

### Images not uploading
- Verify IPFS upload endpoint is configured
- Check file size (max 10MB)
- Ensure file is an image type (PNG, JPG, GIF, WebP)

## 📊 Database Triggers Working?

Create a post and upvote it, then check:

```sql
-- Should show upvote_count = 1
SELECT id, upvote_count, downvote_count FROM chain_posts WHERE id = 'your-post-id';

-- Should show one reaction
SELECT * FROM chain_post_reactions WHERE post_id = 'your-post-id';
```

Create a reply and check:

```sql
-- Parent post should have comment_count = 1
SELECT id, comment_count, total_replies FROM chain_posts WHERE id = 'parent-post-id';
```

## ✨ Everything Working?

You should now have a fully functional Reddit-style forum in your chains!

Enjoy creating discussions, building community, and engaging with your users! 🎉
