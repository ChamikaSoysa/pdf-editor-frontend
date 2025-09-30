PDF Editor - Frontend
A React-based PDF editor that allows users to upload PDF files, add text overlays, edit metadata, and export to various formats.

------Project Structure-----------------------------------------------------------

PDF-EDITOR-FRONTEND/
├── src/
│   ├── api/
│   │   └── api.ts                 # Axios HTTP client configuration
│   ├── assets/
│   │   └── react.svg              # React logo and static assets
│   ├── App.css                    # Global application styles
│   ├── App.tsx                    # Main React application component
│   ├── main.tsx                   # Application entry point
│   └── pdf.worker.js              # PDF.js web worker for PDF processing
├── public/                        # Static public assets
├── node_modules/                  # NPM dependencies (auto-generated)
├── package.json                   # Project dependencies and scripts
├── package-lock.json              # Exact dependency versions
├── vite.config.ts                 # Vite build tool configuration
├── tailwind.config.js             # Tailwind CSS configuration
├── tsconfig.json                  # TypeScript configuration
├── tsconfig.app.json              # App-specific TypeScript settings
├── tsconfig.node.json             # Node.js TypeScript settings
├── postcss.config.js              # PostCSS processing configuration
├── eslint.config.js               # ESLint code quality rules
├── index.html                     # HTML entry point
└── README.md                      # Project documentation

--------------------------------------------------------------------------------------

Prerequisites ->

 Node.js 18+

 ---------------------------------------------------------------------------------------

Backend API running on https://localhost:7200

----------------------------------------------------------------------------------------

Installation ->

# Navigate to frontend directory
cd PDF-EDITOR-FRONTEND

# Install dependencies
npm install

# Start development server
npm run dev

# Access at: http://localhost:3000

----------------------------------------------------------------------------------------

Available Scripts ->

npm run dev - Start development server

npm run build - Build for production

npm run lint - Run ESLint for code quality

npm run preview - Preview production build

-----------------------------------------------------------------------------------------

Packages Used ->

Core Dependencies-------------------------

React 19.1.1 - Modern UI framework

Vite 7.1.7 - Fast build tool and dev server

TypeScript - Type safety

Tailwind CSS - Utility-first CSS framework

React PDF 10.1.0 - PDF rendering component

PDF.js 5.3.93 - PDF processing library

Axios 1.12.2 - HTTP client for API calls

File Saver 2.0.5 - File download functionality

Heroicons React 2.2.0 - Icon library

-----------------------------------------

Development Dependencies

@vitejs/plugin-react - Vite React plugin

@types/react - TypeScript definitions

eslint - Code linting

autoprefixer & postcss - CSS processing

----------------------------------------------------------------------------------------------------

📋 Features

   PDF Upload - Drag-and-drop or file selector upload

    Text Overlay - Click-to-place text on PDF pages

    Metadata Editing - Modify title, author, and subject

    Multi-format Export - Export to PDF, Word (DOCX), and Images (ZIP)

    Real-time Preview - Instant preview of edits

    Responsive Design - Works on desktop and mobile

-------------------------------------------------------------------------------------------------

Configuration

Vite Configuration (vite.config.ts)---------------------

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['pdfjs-dist'] // Prevent double-processing
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://localhost:7200',
        secure: false,
      },
    },
  },
});

----------------------------------------------------------

Tailwind CSS (tailwind.config.js)

module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}

-------------------------------------------------------------------------------------------------

Backend Integration
The frontend expects the backend to be running on https://localhost:7200 with these endpoints:

Method	Endpoint	Purpose
POST	/api/pdf/upload	Upload PDF file
POST	/api/pdf/preview	Get PDF preview
POST	/api/pdf/edit-text	Apply text edits
POST	/api/pdf/edit-metadata	Update metadata
GET	/api/pdf/export/{format}	Export to various formats

--------------------------------------------------------------------------------------------------

Key Components

Main Application (App.tsx)----------------------

Central state management for PDF operations

Drag-and-drop file upload handling

Text editing interface with coordinate system

Real-time preview rendering

-------------------------------------------------

API Client (src/api/api.ts)
Axios instance with base configuration

Error handling and request/response interceptors

Centralized API communication

---------------------------------------------------------------------------------------------------

Assumptions

Backend Integration-----------------------------------------

*Backend API available at https://localhost:7200

*All required endpoints implemented with consistent responses

*CORS properly configured for http://localhost:3000

*Backend handles 10MB file uploads

User Experience----------------------------------------------

*Users understand drag-and-drop functionality

*Users are familiar with PDF coordinate system for text placement

*Real-time preview expectations are reasonable

*Users differentiate between temporary edits and final download

Technical Environment-------------------------------------------

*Modern browsers with PDF.js support (Chrome, Firefox, Safari, Edge)

*Sufficient client memory for PDF rendering

*Stable internet connection for API calls

*JavaScript enabled in browsers

*Minimum 600px screen width for PDF viewing

Performance------------------------------------------------------

*PDF files under 10MB in size

*Reasonable number of text edits per page (<50)

*Users understand processing times for large files

-------------------------------------------------------------------------------------------------------

Troubleshooting

Common Issues----------------------------------------------------

PDF not loading - Check backend is running and CORS configured

Build errors - Verify Node.js version and dependency compatibility

Styling issues - Confirm Tailwind CSS configuration

API errors - Check backend server status

Development Notes-------------------------------------------------

PDF.js worker requires proper configuration

Text coordinates converted from display to PDF coordinate system

File operations handled through backend API

Minimal state maintained in frontend

--------------------------------------------------------------------------------------------------------------

🌐 Browser Support
Chrome (recommended)

--------------------------------------------------------------------------------------------------------------
