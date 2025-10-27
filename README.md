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
- **Database**: MongoDB

## Setup Instructions

### Prerequisites
- Node.js and npm installed on your machine.
- MongoDB installed and running locally or a MongoDB Atlas account.

### Backend Setup
1. Navigate to the backend directory:
   ```sh
   cd review-app/backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file in the backend directory with the following environment variables:
   ```sh
   MONGODB_URI=your_mongodb_connection_string
   PORT=3001
   ```
4. Start the backend server:
   ```sh
   npm run dev
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```sh
   cd review-app/client
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file in the frontend directory with the following environment variables:
   ```sh
   REACT_APP_API_URL=http://localhost:3001/api
   ```
4. Start the frontend development server:
   ```sh
   npm start
   ```

## Customizing Templates
- **Adding New Templates**: Add new templates by inserting documents into the `ReviewTemplate` collection in MongoDB.
- **Editing Templates**: Edit existing templates directly in the MongoDB database.
- **Admin Features**: Use the admin features in the application to list used templates and rephrase/return them to the active pool.

## Example MongoDB Schemas

### ReviewTemplate Collection
```json
{
  "text": "Great service and friendly staff!",
  "used": false,
  "createdAt": "2025-10-27T14:55:59.058Z"
}
```

### ArchivedTemplate Collection
```json
{
  "text": "Great service and friendly staff!",
  "archivedAt": "2025-10-27T14:55:59.058Z"
}
```

## Contributing
Feel free to contribute to the project by opening issues or pull requests.

## License
This project is licensed under the ISC License.