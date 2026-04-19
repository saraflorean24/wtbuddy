# WTBuddy

WTBuddy is a social platform for Work & Travel program participants to find travel buddies, organize trips, join events, and connect with others working in the same area.

---

## Tech Stack

| Layer    | Technology                              |
|----------|-----------------------------------------|
| Backend  | Java 21, Spring Boot 3.5, Spring Security (JWT) |
| Database | PostgreSQL 13 + PostGIS                 |
| ORM      | Spring Data JPA + Flyway migrations     |
| Frontend | React 18 + Vite, Tailwind CSS           |
| Email    | MailTrap (sandbox SMTP)                 |
| Docs     | SpringDoc OpenAPI (Swagger UI)          |

---

## Prerequisites

- Java 21+
- Node.js 18+
- Docker & Docker Compose
- Maven 3.9+

---

## Setup & Running

### 1. Clone the repository

```bash
git clone <https://github.com/saraflorean24/wtbuddy.git>
cd wtbuddy
```

### 2. Start the database

The project uses PostgreSQL with the PostGIS extension. Start it with Docker:

```bash
docker-compose up -d wtbuddy-db
```

This creates a PostgreSQL instance on port `5432` with:
- Database: `wtbuddy`
- Username: `wtbuddy`
- Password: `wtbuddy123`

Flyway will automatically run all migrations and seed data on first backend startup.

### 3. Configure environment variables

The backend requires two environment variables. Set them before running:

```bash
export JWT_SECRET=your_base64_encoded_secret_key_minimum_32_chars
export JWT_EXPIRATION=86400000
```

> `JWT_EXPIRATION` is in milliseconds. `86400000` = 24 hours.

On Windows (Command Prompt):
```cmd
set JWT_SECRET=your_base64_encoded_secret_key_minimum_32_chars
set JWT_EXPIRATION=86400000
```

### 4. Run the backend

```bash
cd backend
mvn spring-boot:run
```

The backend starts on **http://localhost:8080**

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on **http://localhost:5173**

---

## API Documentation (Swagger)

Once the backend is running, open:

```
http://localhost:8080/swagger-ui/index.html
```

To test authenticated endpoints:
1. Call `POST /api/auth/login` to get a JWT token
2. Click **Authorize** (lock icon, top right)
3. Enter `Bearer <your-token>`
4. All subsequent requests will include the token

---

## Default Accounts

You can register new accounts via `POST /api/auth/register` or through the registration page.

To create an admin account, register normally and then update the user's role directly in the database:

```sql
UPDATE "user" SET role = 'ADMIN' WHERE email = 'your@email.com';
```

---

## Running with Docker Compose (full stack)

To run both the backend and database together:

```bash
docker-compose up --build
```

> Note: the Docker Compose setup does not include JWT environment variables by default. Add them to `docker-compose.yml` under `wtbuddy-backend.environment` before running.

---

## Project Structure

```
wtbuddy/
├── backend/                  # Spring Boot application
│   └── src/main/
│       ├── java/com/wtbuddy/wtbuddy/
│       │   ├── controller/   # REST controllers
│       │   ├── service/      # Business logic
│       │   ├── repository/   # JPA repositories
│       │   ├── entity/       # JPA entities
│       │   ├── dto/          # Request/Response DTOs
│       │   ├── security/     # JWT auth & Spring Security config
│       │   ├── enums/        # Enums (Role, Status, etc.)
│       │   └── exception/    # Global exception handling
│       └── resources/
│           ├── application.yaml
│           └── db/migration/ # Flyway SQL migrations
└── frontend/                 # React + Vite application
    └── src/
        ├── pages/            # Page components
        ├── components/       # Shared components
        ├── api/              # Axios API clients
        └── context/          # Auth context
```

---

## Email Notifications (MailTrap)

The app sends email notifications for:
- Friend requests sent/accepted
- Trip join requests approved/declined
- Event join confirmations

Emails are sent via MailTrap sandbox. Check your inbox at [https://mailtrap.io](https://mailtrap.io).
