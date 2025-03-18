# Official Business Form

An online application for managing Official Business Forms with database storage and printable HTML generation.

## Features

- Submit and manage official business forms
- Store employee and travel information
- Generate printable forms
- Database storage with SQLite
- User-friendly web interface

## Deployment to Render.com

### Prerequisites

- A GitHub account
- Your code pushed to a GitHub repository

### Deployment Steps

1. **Push your code to GitHub**
   - Create a new repository on GitHub
   - Push your code to the repository

2. **Sign up for Render.com**
   - Go to [Render.com](https://render.com/) and sign up or log in
   - Connect your GitHub account

3. **Create a new Web Service**
   - Click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Configure the following settings:

4. **Configuration Details**
   - **Name**: Choose a unique name for your service
   - **Region**: Select the closest region to your users
   - **Branch**: main (or your preferred branch)
   - **Runtime**: Node
   - **Build Command**: npm install
   - **Start Command**: npm start
   - **Health Check Path**: /healthz

5. **Select Instance Type**
   - Choose the Free instance (512 MB RAM, 0.1 CPU)

6. **Create Web Service**
   - Click "Create Web Service"

7. **Access Your Deployed Application**
   - Once deployment is complete, your application will be available at the URL provided by Render

## Local Development

```bash
# Install dependencies
npm install

# Start the server
npm start
```

The server will run on port 3000 by default (http://localhost:3000).

## Important Notes for Render Deployment

- The free tier has some limitations, including:
  - The service will spin down after 15 minutes of inactivity
  - Limited to 750 hours of usage per month
  - Database stored on disk will be reset when the service is rebuilt
  - Consider using a managed database service for production use

- If you need to store persistent data, consider:
  - Using Render's PostgreSQL service instead of SQLite
  - Implementing data export/import functionality 