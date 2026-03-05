# Bitespeed Identity Reconciliation Service

A backend web service that identifies and keeps track of a customer's identity across multiple purchases, even when different contact information (email/phone) is used.

## 🚀 Live Endpoint

**Base URL:** `https://bitespeed-identity-fzhc.onrender.com`

**POST** `https://bitespeed-identity-fzhc.onrender.com/identify`

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** SQLite (via better-sqlite3)

## How It Works

The service maintains a `Contact` table where:
- The **oldest** contact is always the **primary**
- All related contacts are linked as **secondary** to the primary
- Contacts are linked if they share either an email or phone number
- When two separate primary contact groups are found to belong to the same person, the newer primary is converted to secondary

## API Usage

### POST `/identify`

**Request Body (JSON):**
```json
{
  "email": "doc@hillvalley.edu",
  "phoneNumber": "123456"
}
```

**Response:**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["doc@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": []
  }
}
```

## Local Development

### Prerequisites
- Node.js 18+
- npm

### Setup
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The server runs on `http://localhost:3000` by default.

### Test with cURL
```bash
# Create a new contact
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "lorraine@hillvalley.edu", "phoneNumber": "123456"}'

# Link with same phone, different email
curl -X POST http://localhost:3000/identify \
  -H "Content-Type: application/json" \
  -d '{"email": "mcfly@hillvalley.edu", "phoneNumber": "123456"}'
```

## Project Structure

```
├── src/
│   ├── index.ts        # Express server & /identify endpoint
│   ├── database.ts     # SQLite database setup & Contact table
│   └── identify.ts     # Core identity reconciliation logic
├── tsconfig.json
├── package.json
└── README.md
```

## Author

**Nidhi Kanwar**  
- GitHub: [@Nikanwar3](https://github.com/Nikanwar3)
- LinkedIn: [nidhiikanwar](https://www.linkedin.com/in/nidhiikanwar/)
