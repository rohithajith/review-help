# Review App

## Overview
This is a full-stack web application that allows users to scan a QR code to land on a web page where they can see a list of company-chosen review templates. Each template can be edited or copied to leave a review on Google Maps.

## Features
1. **Template List**: Displays a list of active review templates.
2. **Edit Template**: Opens a modal to edit the text of a selected template.
3. **Copy & Leave Review**: Copies the template text to the clipboard and opens the Google Maps review URL for the business in a new tab.
4. **Admin Features**: Lists used templates and allows rephrasing/returning them to the active pool.

## Technologies Used
- **Frontend**: React
- **Backend**: Node.js/Express
- **Database**: SQLite

## Setup Instructions

### Prerequisites
- Node.js and npm installed on your machine.
- SQLite3 installed and the database file (reviewapp.db) will be created automatically.

### Backend Setup
1. Navigate to the backend directory:
   ```sh
   cd review-app/backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the backend server (no .env needed for DB connection):
   ```sh
   npm run dev
   ```

## Customizing Templates
- **Adding New Templates**: Add new templates by inserting rows into the `review_templates` table in SQLite.
- **Editing Templates**: Edit existing templates directly in the SQLite database.
- **Admin Features**: Use the admin features in the application to list used templates and rephrase/return them to the active pool.

## Example SQLite Schemas

### review_templates table
```sql
CREATE TABLE review_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### archived_templates table
```sql
CREATE TABLE archived_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,
  archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Contributing
Feel free to contribute to the project by opening issues or pull requests.

## License
This project is licensed under the ISC License.