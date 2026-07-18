# Bitespeed Identity Reconciliation Service

A backend web service that identifies and keeps track of a customer's identity across multiple purchases, even when different contact information (email/phone) is used.

## 🚀 Live Endpoint

**Base URL:** `https://bitespeed-identity-fzhc.onrender.com`

**POST** `https://bitespeed-identity-fzhc.onrender.com/identify`

## Tech Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** SQLite (via better-sqlite3)
- **Containerization:** Docker (multi-stage build)
- **Testing:** Jest + ts-jest (in-memory SQLite)
- **CI/CD:** GitLab CI (build, unit-test, smoke-test, image push to Container Registry)

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

# Run the unit test suite (in-memory SQLite, no server required)
npm test
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

## Running with Docker

```bash
# Build the image
docker build -t bitespeed-identity .

# Run the container
docker run -p 3000:3000 bitespeed-identity
```

The image uses a multi-stage build — TypeScript is compiled in a build stage, and only the compiled output plus production dependencies are copied into the final runtime image, keeping it small. A container-level health check hits `GET /` to confirm the service is up.

## CI/CD

This repo ships with a GitLab CI pipeline (`.gitlab-ci.yml`) that runs on every push:

1. **build** — installs dependencies and type-checks/compiles the TypeScript source
2. **unit-test** — runs the Jest suite against the reconciliation logic in isolation, using an in-memory SQLite database
3. **smoke-test** — starts the compiled server and sends a real `POST /identify` request to confirm the endpoint actually works end-to-end
4. **docker-build** — builds the Docker image and pushes it to the GitLab Container Registry (only on the default branch)

## Project Structure

```
├── src/
│   ├── index.ts             # Express server & /identify endpoint
│   ├── database.ts          # SQLite database setup & Contact table
│   ├── identify.ts          # Core identity reconciliation logic
│   └── __tests__/
│       └── identify.test.ts # Jest unit tests (in-memory SQLite)
├── Dockerfile                # Multi-stage build for a production image
├── .dockerignore
├── .gitlab-ci.yml            # CI pipeline: build, unit-test, smoke-test, image push
├── jest.config.js
├── tsconfig.json
├── package.json
└── README.md
```

## Author

**Nidhi Kanwar**  
- GitHub: [@Nikanwar3](https://github.com/Nikanwar3)
- LinkedIn: [nidhiikanwar](https://www.linkedin.com/in/nidhiikanwar/)