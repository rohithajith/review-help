# Review-Help Landing Page

This is a static landing page for Review-Help that can be deployed to GitHub Pages for free hosting.

## ⚠️ IMPORTANT: Set Up Email Notifications First!

Before deploying, you need to set up **Formspree** (free) to receive inquiry emails:

### Step 1: Create a Formspree Account
1. Go to https://formspree.io/register
2. Sign up with your email (free plan allows 50 submissions/month)

### Step 2: Create a Form
1. Click **"New Form"**
2. Give it a name like "Review-Help Inquiries"
3. Copy your **Form ID** (looks like `xrgvnpqk`)

### Step 3: Update the HTML
1. Open `index.html` in a text editor
2. Find this line:
   ```html
   <form id="contactForm" action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
   ```
3. Replace `YOUR_FORM_ID` with your actual form ID:
   ```html
   <form id="contactForm" action="https://formspree.io/f/xrgvnpqk" method="POST">
   ```
4. Save the file

Now when someone submits the form, you'll get an email with their:
- Name
- Email
- Phone number
- Business name
- Message

---

## How to Deploy to GitHub Pages

### Option 1: Using GitHub Web Interface (Easiest)

1. **Create a new GitHub repository:**
   - Go to https://github.com/new
   - Name it `reviewhelp-landing` (or any name you want)
   - Make it **Public** (required for free GitHub Pages)
   - Click "Create repository"

2. **Upload the files:**
   - Click "uploading an existing file" link on the repo page
   - Drag and drop both `index.html` and `logo.png` from this folder
   - Click "Commit changes"

3. **Enable GitHub Pages:**
   - Go to your repo's **Settings** tab
   - Click **Pages** in the left sidebar
   - Under "Source", select **Deploy from a branch**
   - Select `main` branch and `/ (root)` folder
   - Click **Save**

4. **Get your URL:**
   - Wait 1-2 minutes for deployment
   - Your site will be live at: `https://YOUR-USERNAME.github.io/reviewhelp-landing/`

### Option 2: Using Git Command Line

```bash
# Navigate to the github-pages folder
cd github-pages

# Initialize git
git init

# Add files
git add .

# Commit
git commit -m "Initial commit - Review-Help landing page"

# Add your GitHub repo as remote (replace with your repo URL)
git remote add origin https://github.com/YOUR-USERNAME/reviewhelp-landing.git

# Push to GitHub
git branch -M main
git push -u origin main
```

Then follow Step 3 and 4 from Option 1 to enable GitHub Pages.

## Sharing the Link

Once deployed, you can share the GitHub Pages URL with friends and family:
- `https://YOUR-USERNAME.github.io/reviewhelp-landing/`

The page will load instantly with zero compute costs!

## Files Included

- `index.html` - The complete landing page (all CSS/JS inlined)
- `logo.png` - The Review-Help logo
- `README.md` - This file

## Notes

- The "Sign Up" and "Login" buttons link to your main app at `reviewhelp.uk`
- The contact form submits to your main backend API
- This is a read-only landing page - no server required
