# Stock Backend API

A professional stock trading backend system that provides IPO data scraping, security management, and order processing with email confirmations.

## 🚀 Features

- **Stock/Security Data Management** - Fetch and manage stock security information from JSON files
- **IPO Data Scraping** - Automated web scraping for IPO data using Python + Selenium
- **Order Processing** - Place trading orders with PDF email confirmations
- **File-based Storage** - JSON file storage for securities and IPO data
- **Email Notifications** - Professional PDF order confirmations via SMTP

## 📁 Project Structure

```
Stock_Backend/
├── backend/
│   ├── server.js              # Main Express API server
│   ├── package.json           # Node.js dependencies
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables
│   ├── data/                  # JSON data storage
│   │   ├── Security.json     # Security names data
│   │   └── ipo.json          # IPO data
│   ├── routes/                # API route handlers
│   │   ├── stockRoutes.js    # Stock/security endpoints
│   │   ├── ipoRoutes.js      # IPO endpoints
│   │   ├── orderRoutes.js    # Order placement endpoints
│   │   └── scraperRoutes.js  # Scraper trigger endpoints
│   ├── services/              # Business logic services
│   │   ├── dataService.js    # Data file operations
│   │   └── emailService.js   # Email & PDF generation
│   └── scripts/               # Python scripts
│       └── scraper.py         # Web scraping script
├── vercel.json                # Vercel deployment config
└── README.md                  # This file
```

## 🛠️ Technologies

**Backend:**
- Node.js + Express.js
- Nodemailer + PDFKit
- File-based JSON storage

**Web Scraping:**
- Python + Selenium
- Pandas for data processing
- Chrome WebDriver automation

**Deployment:**
- Vercel platform

## 🔧 API Endpoints

| Method | Endpoint                | Description                      |
| ------ | ----------------------- | -------------------------------- |
| GET    | `/backend/hello`        | Health check                     |
| GET    | `/backend/stock`        | Get all security names           |
| GET    | `/backend/ipo`          | Get all IPO data                 |
| POST   | `/backend/placeOrder`   | Place trading order + send email |
| POST   | `/backend/ipo_security` | Trigger Python scraper           |

## 🚀 Quick Start

1. **Install Dependencies:**

   ```bash
   cd backend
   npm install
   pip install -r requirements.txt
   ```

2. **Set Environment Variables:**

   Create a `.env` file in the `backend` directory:

   ```bash
   EMAIL_USER=your_smtp_email
   EMAIL_PASS=your_smtp_password
   PORT=3001
   NODE_ENV=development
   ```

3. **Start Server:**
   ```bash
   npm start
   ```

## 📧 Order Processing Flow

1. Receive order data via `/backend/placeOrder`
2. Validate order information
3. Generate professional PDF confirmation
4. Send email with PDF attachment
5. Return success/failure response

## 🕷️ Web Scraping System

The Python scraper automatically:

- Downloads financial data from websites
- Processes CSV files with Pandas
- Saves data to JSON files in `data/` folder
- Runs in headless mode for production

### Scraper Modes

The scraper supports different modes:

- `ipo` - Scrape IPO data only
- `securities` - Scrape BSE securities (downloads CSV only)
- `process_securities` - Process existing SecurityList.csv
- `process_equity` - Convert Equity.csv to Security.json

## 📝 Environment Variables

- `EMAIL_USER` - SMTP email username
- `EMAIL_PASS` - SMTP email password
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)

## 🌐 Deployment

Configured for Vercel deployment with automatic routing to the Express server.

## 📂 Data Storage

All data is stored in JSON files within the `backend/data/` directory:

- `Security.json` - Contains all security names
- `ipo.json` - Contains IPO listing data

Both files include metadata about creation time and record counts.

---

**Author:** Parsh Jain  
**License:** ISC
