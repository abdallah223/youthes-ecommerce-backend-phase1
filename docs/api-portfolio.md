# Youthes API Documentation

Portfolio-ready API documentation for the backend of the Youthes fashion e-commerce platform.

## Overview

- Architecture: REST API
- Base URL: `http://localhost:3000/api/v1`
- Stack: Node.js, Express, MongoDB, Mongoose
- Authentication: JWT bearer token
- Roles: `user`, `admin`
- Rate limit: `100` requests per `15` minutes on `/api`

This API supports the full customer and admin flow for an e-commerce store:

- authentication and profile management
- product catalog browsing and admin product management
- category and subcategory management
- shopping cart operations with price-change confirmation
- checkout and order lifecycle management
- testimonials moderation
- editable static content pages

## Authentication

Protected endpoints require:

```http
Authorization: Bearer <jwt-token>
```

Access control:

- Public: no token required
- Protected: any authenticated user
- User: authenticated customer or admin where the route allows both
- Admin: authenticated admin only

## Response Style

Most endpoints use this envelope:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": {}
}
```

List endpoints may also return pagination metadata:

```json
{
  "success": true,
  "message": "Orders fetched",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

The public products list is slightly different and returns `products` instead of `data`.

## Error Format

```json
{
  "success": false,
  "message": "Human readable message"
}
```

Typical status codes:

- `200` success
- `201` resource created
- `400` bad request or validation/business-rule failure
- `401` missing, invalid, or expired token
- `403` authenticated but not allowed
- `404` resource not found
- `500` internal server error

## Core Business Rules

- products are soft-deleted using `isDeleted`
- product image upload accepts `jpeg`, `jpg`, `png`, `webp` up to `2MB`
- cart totals include a configured shipping fee from environment variables
- order stock is deducted immediately when the order is placed
- stock is returned when an order is rejected or cancelled
- users can cancel only `Pending` orders
- testimonial submission is limited to one testimonial per user

## Endpoint Summary

### Auth

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | Public | Create account and return JWT |
| `POST` | `/auth/login` | Public | Authenticate and return JWT |
| `POST` | `/auth/logout` | Protected | Logout on client side |

### Products

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/products` | Public | List products with filters and pagination |
| `GET` | `/products/:slug` | Public | Get a single product by slug |
| `GET` | `/products/admin/all` | Admin | Get admin product listing including deleted items |
| `POST` | `/products` | Admin | Create product with multipart image upload |
| `PUT` | `/products/:id` | Admin | Update product and optionally replace image |
| `DELETE` | `/products/:id` | Admin | Soft delete product |

### Categories

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/categories` | Public | Get active categories and active subcategories |
| `GET` | `/categories/admin` | Admin | Get all categories and subcategories |
| `POST` | `/categories` | Admin | Create category |
| `PUT` | `/categories/:id` | Admin | Update category name |
| `DELETE` | `/categories/:id` | Admin | Delete category if unused |
| `POST` | `/categories/:id/subcategories` | Admin | Create subcategory |
| `PUT` | `/categories/:id/subcategories/:subId` | Admin | Update subcategory |
| `DELETE` | `/categories/:id/subcategories/:subId` | Admin | Delete subcategory if unused |

### Cart

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/cart` | Protected | Get enriched cart summary |
| `POST` | `/cart/items` | Protected | Add item to cart |
| `PUT` | `/cart/items/:productId` | Protected | Change quantity for an item |
| `DELETE` | `/cart/items/:productId` | Protected | Remove item from cart |
| `DELETE` | `/cart` | Protected | Clear entire cart |
| `POST` | `/cart/merge` | Protected | Merge guest cart into user cart |
| `PATCH` | `/cart/confirm-price/:productId` | Protected | Confirm latest product price, supports `all` |

### Orders

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `POST` | `/orders` | User/Admin | Create order from current cart |
| `GET` | `/orders/my` | Protected | Get current user's orders |
| `GET` | `/orders/my/:id` | Protected | Get a single current-user order |
| `PATCH` | `/orders/my/:id/cancel` | Protected | Cancel current-user order if pending |
| `GET` | `/orders/admin` | Admin | Get all orders with filters |
| `GET` | `/orders/admin/:id` | Admin | Get single order with user info |
| `PATCH` | `/orders/admin/:id/status` | Admin | Move order through workflow |
| `GET` | `/orders/admin/reports/sales` | Admin | Delivered-order sales report |
| `GET` | `/orders/admin/notifications` | Admin | Pending-order and out-of-stock counters |

Order status flow:

```text
Pending -> Prepared -> Shipped -> Delivered
Pending -> CancelledByUser
Pending/Prepared/Shipped -> CancelledByAdmin
Pending/Prepared/Shipped -> Rejected
```

### Users

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/users/me` | Protected | Get authenticated user profile |
| `PUT` | `/users/me` | Protected | Update profile fields |
| `POST` | `/users/me/change-password` | Protected | Change account password |
| `GET` | `/users` | Admin | List customer accounts with filters |
| `PATCH` | `/users/:id/toggle` | Admin | Activate/deactivate customer |

### Testimonials

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/testimonials/approved` | Public | Get approved testimonials |
| `POST` | `/testimonials` | User | Submit one testimonial |
| `GET` | `/testimonials/admin` | Admin | Moderate testimonials |
| `PATCH` | `/testimonials/admin/:id` | Admin | Update testimonial status |

### Static Pages

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/pages/:key` | Public | Get `about_us`, `faq`, or `contact_us` content |
| `PUT` | `/pages/admin/about_us` | Admin | Update About Us page |
| `PUT` | `/pages/admin/faq` | Admin | Update FAQ page |
| `PUT` | `/pages/admin/contact_us` | Admin | Update Contact Us page |

## Example Requests

### Register

```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "fullName": "Ahmed Mohamed",
  "email": "ahmed@example.com",
  "phone": "01012345678",
  "password": "Password1",
  "gender": "male",
  "address": "Cairo, Egypt"
}
```

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "ahmed@example.com",
  "password": "Password1"
}
```

### List Products With Filters

```http
GET /api/v1/products?page=1&limit=12&search=oversized%20shirt&sort=price_desc
```

### Create Product

```http
POST /api/v1/products
Authorization: Bearer <admin-token>
Content-Type: multipart/form-data
```

Form fields:

- `name`
- `description`
- `price`
- `stockCount`
- `category`
- `subcategory` optional
- `image` required on create

### Add To Cart

```http
POST /api/v1/cart/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "6804f6df8e2f1e4cbf30f001",
  "quantity": 2
}
```

### Place Order

```http
POST /api/v1/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "deliveryPhone": "01012345678",
  "deliveryAddress": "Nasr City, Cairo"
}
```

### Update Order Status

```http
PATCH /api/v1/orders/admin/6804f6df8e2f1e4cbf30f111/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "Prepared",
  "note": "Packed and ready"
}
```
