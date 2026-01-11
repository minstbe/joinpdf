# PDF Split & Merge

A privacy-first, purely client-side PDF manipulation tool. Split pages, merge documents, and organize your PDF files directly in your browser without ever uploading data to a server.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Privacy](https://img.shields.io/badge/Privacy-100%25-green.svg)

## 🌟 Key Features

- **Privacy Focused**: Files are processed entirely in your browser's memory. No file is ever uploaded to any server.
- **Split PDF**: Extract specific pages (e.g., `1,3-5,10`) or reverse page order.
- **Merge PDFs**: Combine multiple PDF files. Drag and drop to reorder before merging.
- **Dark Mode**: Built-in dark/light theme toggle for comfortable viewing.
- **Responsive Design**: Works great on desktop and mobile devices.
- **No Dependencies**: Pure HTML/CSS/JS (uses `pdf-lib`).

## 🚀 Quick Start

### Option A: Run Locally (Recommended for testing)

You can run this project with any static file server.

**Using Python:**
```bash
# Run in the project directory
python3 -m http.server 5500
# Open http://localhost:5500 in your browser
```

**Using Node.js:**
```bash
npm install -g http-server
http-server -p 5500
```

**Just Open the File:**
Simply double-click `index.html` to open it in your browser.

### Option B: Docker Deployment

Easily deploy to your own server using Docker and Nginx.

1. **Create the Dockerfile**
   Create a file named `Dockerfile` in the project root:
   ```dockerfile
   FROM nginx:alpine
   COPY . /usr/share/nginx/html/
   ```

2. **Build and Run**
   ```bash
   # Build the image
   docker build -t pdf-split-merge .

   # Run the container (mapping port 80 to 80)
   docker run -d -p 80:80 --name pdf-tool pdf-split-merge
   ```

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3 (Variables, Flexbox/Grid), Vanilla JavaScript
- **PDF Processing**: [pdf-lib](https://pdf-lib.js.org/)
- **Backend (Optional)**: Python (Simple HTTP server included for development/feedback)

## 📂 Project Structure

- `index.html`: Main application entry point.
- `styles.css`: All styling and theming logic.
- `app.js`: Core logic for PDF manipulation and UI interaction.
- `server.py`: Optional simple backend server for handling feedback (requires SQLite).

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---
*Note: This project is designed to be lightweight and secure by default.*
