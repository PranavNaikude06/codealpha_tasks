# E-Commerce Store

This is a Django-based e-commerce application structured with modular, self-contained apps. The backend exposes REST APIs using Django REST Framework (DRF), and the frontend serves dynamic templates styled with Tailwind CSS.

## Architecture

The project is organized into modular apps at the root directory:

* users: Handles authentication, session management, and custom user models.
* products: Manages the product catalog, category filters, search operations, and product seeding.
* cart: Handles cart creation, item additions, quantity modifications, and stock limit checks.
* orders: Manages checkout transactions, order snapshots, stock decrementing, and purchase history.
* ecommerce: The core project configuration package.
* layouts: Contains the base templates shared across the storefront.

## Database Integration

The application routes database traffic based on availability:

1. MySQL: The default option. settings.py checks if port 3306 is open on startup. If active, the app connects to MySQL using settings configured in the .env file.
2. PostgreSQL: Fallback option checked on port 5432 if MySQL is unavailable.
3. SQLite: Fallback option if no external SQL servers are active. Reads and writes directly to db.sqlite3 in the root directory.

## Setup Instructions

Follow these steps to run the application locally.

### 1. Environment Setup

Create a Python virtual environment and activate it:

```bash
python -m venv venv

# Windows
.\venv\Scripts\Activate.ps1

# macOS / Linux
source venv/bin/activate
```

Install the dependencies:

```bash
pip install -r requirements.txt
```

### 2. Configuration

Copy the example configuration file:

```bash
cp .env.example .env
```

Open the newly created .env file and update the database name, user, password, and port to match your local setup.

### 3. Database Initialization

Create your database schema (e.g. codealpha_1), then run migrations:

```bash
python manage.py migrate
```

Seed the product catalog:

```bash
python manage.py seed_products
```

Create an admin account to manage data:

```bash
python manage.py createsuperuser
```

### 4. Running the App

Start the development server:

```bash
python manage.py runserver
```

You can view the storefront at http://localhost:8000 and the admin portal at http://localhost:8000/admin.

## Testing

To run the complete test suite (25 integration tests covering auth, cart, stock limits, and checkout flows):

```bash
python manage.py test
```

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---|
| POST | /api/auth/register/ | Register a new account | No |
| POST | /api/auth/login/ | Login and receive JWT credentials | No |
| POST | /api/auth/logout/ | Logout and blacklist token | Yes |
| GET | /api/auth/me/ | Fetch profile details | Yes |
| POST | /api/auth/refresh/ | Renew expired access token | No |

### Catalog

| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---|
| GET | /api/products/ | List all catalog items | No |
| GET | /api/products/?category=name | Filter products by category | No |
| GET | /api/products/?search=term | Search catalog | No |
| GET | /api/products/id/ | Retrieve single product details | No |

### Cart

| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---|
| GET | /api/cart/ | View active cart | Yes |
| POST | /api/cart/add/ | Add item to cart | Yes |
| PATCH | /api/cart/update/id/ | Update item quantity | Yes |
| DELETE | /api/cart/remove/id/ | Remove item from cart | Yes |

### Orders

| Method | Endpoint | Description | Auth Required |
|:---|:---|:---|:---|
| POST | /api/orders/ | Checkout and place order | Yes |
| GET | /api/orders/list/ | View order history list | Yes |
| GET | /api/orders/id/ | View single order details | Yes |

## JWT Session Flow

The application uses JSON Web Tokens (JWT) for session management:

On successful login, the server returns an access token (expires in 30 minutes) and a refresh token (expires in 7 days). The frontend script (auth.js) stores these in sessionStorage.

Subsequent requests to protected routes pass the access token in the Authorization header: `Authorization: Bearer <access_token>`.

If a request fails with a 401 status due to an expired token, auth.js sends the refresh token to /api/auth/refresh/ to obtain a new access token, updates storage, and automatically retries the failed request.

On logout, the refresh token is sent to /api/auth/logout/ to be blacklisted on the server, and local session storage is cleared.
