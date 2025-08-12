# Alive Home Backend API Documentation

## Overview
This document provides comprehensive documentation for the Developer and HomeOwner profile APIs in the Alive Home Backend system.

## Base URL
```
http://localhost:9000/api/v1
```

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Developer Profile APIs

### 1. Create Developer Profile
**POST** `/developers`

Creates a new developer profile for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "companyName": "ABC Developers Ltd",
  "cacRegNumber": "CAC123456789",
  "yearsInBusiness": 5,
  "projectsCompleted": 25,
  "websiteUrl": "https://abcdevelopers.com",
  "officeAddress": "123 Business Street, Victoria Island, Lagos",
  "companyLogoUrl": "https://cloudinary.com/logo.jpg",
  "cloudinary_id": "cloudinary_id_here"
}
```

**Response (201 Created):**
```json
{
  "data": {
    "developerId": "uuid-here",
    "companyName": "ABC Developers Ltd",
    "cacRegNumber": "CAC123456789",
    "yearsInBusiness": 5,
    "projectsCompleted": 25,
    "websiteUrl": "https://abcdevelopers.com",
    "officeAddress": "123 Business Street, Victoria Island, Lagos",
    "companyLogoUrl": "https://cloudinary.com/logo.jpg",
    "isVerified": false,
    "user": {
      "userId": "user-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phoneNumber": "+2348012345678",
      "profilePictureUrl": "https://cloudinary.com/profile.jpg"
    }
  }
}
```

### 2. Get All Developers
**GET** `/developers`

Retrieves all developer profiles with pagination and search.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by company name

**Response (200 OK):**
```json
{
  "data": [
    {
      "developerId": "uuid-here",
      "companyName": "ABC Developers Ltd",
      "cacRegNumber": "CAC123456789",
      "yearsInBusiness": 5,
      "projectsCompleted": 25,
      "websiteUrl": "https://abcdevelopers.com",
      "officeAddress": "123 Business Street, Victoria Island, Lagos",
      "companyLogoUrl": "https://cloudinary.com/logo.jpg",
      "isVerified": false,
      "user": {
        "userId": "user-uuid",
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com",
        "phoneNumber": "+2348012345678",
        "profilePictureUrl": "https://cloudinary.com/profile.jpg"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalDevelopers": 1,
    "totalPages": 1
  }
}
```

### 3. Get My Developer Profile
**GET** `/developers/me`

Retrieves the authenticated user's developer profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": {
    "developerId": "uuid-here",
    "companyName": "ABC Developers Ltd",
    "cacRegNumber": "CAC123456789",
    "yearsInBusiness": 5,
    "projectsCompleted": 25,
    "websiteUrl": "https://abcdevelopers.com",
    "officeAddress": "123 Business Street, Victoria Island, Lagos",
    "companyLogoUrl": "https://cloudinary.com/logo.jpg",
    "isVerified": false,
    "user": {
      "userId": "user-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phoneNumber": "+2348012345678",
      "profilePictureUrl": "https://cloudinary.com/profile.jpg"
    }
  }
}
```

### 4. Get Developer Profile by ID
**GET** `/developers/:developerId`

Retrieves a specific developer profile by ID.

**Response (200 OK):**
```json
{
  "data": {
    "developerId": "uuid-here",
    "companyName": "ABC Developers Ltd",
    "cacRegNumber": "CAC123456789",
    "yearsInBusiness": 5,
    "projectsCompleted": 25,
    "websiteUrl": "https://abcdevelopers.com",
    "officeAddress": "123 Business Street, Victoria Island, Lagos",
    "companyLogoUrl": "https://cloudinary.com/logo.jpg",
    "isVerified": false,
    "user": {
      "userId": "user-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phoneNumber": "+2348012345678",
      "profilePictureUrl": "https://cloudinary.com/profile.jpg"
    }
  }
}
```

### 5. Update Developer Profile
**PUT** `/developers/:developerId`

Updates a developer profile. Only the profile owner or admin can update.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "companyName": "Updated ABC Developers Ltd",
  "yearsInBusiness": 6,
  "projectsCompleted": 30,
  "websiteUrl": "https://updated-abcdevelopers.com"
}
```

**Response (200 OK):**
```json
{
  "data": {
    "developerId": "uuid-here",
    "companyName": "Updated ABC Developers Ltd",
    "cacRegNumber": "CAC123456789",
    "yearsInBusiness": 6,
    "projectsCompleted": 30,
    "websiteUrl": "https://updated-abcdevelopers.com",
    "officeAddress": "123 Business Street, Victoria Island, Lagos",
    "companyLogoUrl": "https://cloudinary.com/logo.jpg",
    "isVerified": false,
    "user": {
      "userId": "user-uuid",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "phoneNumber": "+2348012345678",
      "profilePictureUrl": "https://cloudinary.com/profile.jpg"
    }
  }
}
```

### 6. Delete Developer Profile
**DELETE** `/developers/:developerId`

Deletes a developer profile. Only the profile owner or admin can delete.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": {
    "message": "Developer profile deleted successfully"
  }
}
```

### 7. Verify Developer (Admin Only)
**PATCH** `/developers/:developerId/verify`

Verifies or unverifies a developer. Only admins can perform this action.

**Headers:**
```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "verified": true
}
```

**Response (200 OK):**
```json
{
  "data": {
    "developerId": "uuid-here",
    "companyName": "ABC Developers Ltd",
    "isVerified": true,
    "message": "Developer verified successfully"
  }
}
```

## HomeOwner Profile APIs

### 1. Create HomeOwner Profile
**POST** `/homeowners`

Creates a new homeowner profile for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "primaryResidence": "456 Home Street, Lekki, Lagos",
  "preferredContactMethod": "EMAIL",
  "verificationDocsUrls": [
    "https://cloudinary.com/doc1.jpg",
    "https://cloudinary.com/doc2.jpg"
  ]
}
```

**Response (201 Created):**
```json
{
  "data": {
    "ownerId": "uuid-here",
    "primaryResidence": "456 Home Street, Lekki, Lagos",
    "ownershipVerified": false,
    "preferredContactMethod": "EMAIL",
    "verificationDocsUrls": [
      "https://cloudinary.com/doc1.jpg",
      "https://cloudinary.com/doc2.jpg"
    ],
    "user": {
      "userId": "user-uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phoneNumber": "+2348012345679",
      "profilePictureUrl": "https://cloudinary.com/profile.jpg"
    }
  }
}
```

### 2. Get All HomeOwners
**GET** `/homeowners`

Retrieves all homeowner profiles with pagination and search.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search by primary residence

**Response (200 OK):**
```json
{
  "data": [
    {
      "ownerId": "uuid-here",
      "primaryResidence": "456 Home Street, Lekki, Lagos",
      "ownershipVerified": false,
      "preferredContactMethod": "EMAIL",
      "verificationDocsUrls": [
        "https://cloudinary.com/doc1.jpg",
        "https://cloudinary.com/doc2.jpg"
      ],
      "user": {
        "userId": "user-uuid",
        "firstName": "Jane",
        "lastName": "Smith",
        "email": "jane@example.com",
        "phoneNumber": "+2348012345679",
        "profilePictureUrl": "https://cloudinary.com/profile.jpg"
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalOwners": 1,
    "totalPages": 1
  }
}
```

### 3. Get My HomeOwner Profile
**GET** `/homeowners/me`

Retrieves the authenticated user's homeowner profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": {
    "ownerId": "uuid-here",
    "primaryResidence": "456 Home Street, Lekki, Lagos",
    "ownershipVerified": false,
    "preferredContactMethod": "EMAIL",
    "verificationDocsUrls": [
      "https://cloudinary.com/doc1.jpg",
      "https://cloudinary.com/doc2.jpg"
    ],
    "user": {
      "userId": "user-uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phoneNumber": "+2348012345679",
      "profilePictureUrl": "https://cloudinary.com/profile.jpg"
    }
  }
}
```

### 4. Get HomeOwner Profile by ID
**GET** `/homeowners/:ownerId`

Retrieves a specific homeowner profile by ID.

**Response (200 OK):**
```json
{
  "data": {
    "ownerId": "uuid-here",
    "primaryResidence": "456 Home Street, Lekki, Lagos",
    "ownershipVerified": false,
    "preferredContactMethod": "EMAIL",
    "verificationDocsUrls": [
      "https://cloudinary.com/doc1.jpg",
      "https://cloudinary.com/doc2.jpg"
    ],
    "user": {
      "userId": "user-uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phoneNumber": "+2348012345679",
      "profilePictureUrl": "https://cloudinary.com/profile.jpg"
    }
  }
}
```

### 5. Update HomeOwner Profile
**PUT** `/homeowners/:ownerId`

Updates a homeowner profile. Only the profile owner or admin can update.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "primaryResidence": "789 New Home Street, Ikoyi, Lagos",
  "preferredContactMethod": "PHONE",
  "verificationDocsUrls": [
    "https://cloudinary.com/new-doc1.jpg",
    "https://cloudinary.com/new-doc2.jpg"
  ]
}
```

**Response (200 OK):**
```json
{
  "data": {
    "ownerId": "uuid-here",
    "primaryResidence": "789 New Home Street, Ikoyi, Lagos",
    "ownershipVerified": false,
    "preferredContactMethod": "PHONE",
    "verificationDocsUrls": [
      "https://cloudinary.com/new-doc1.jpg",
      "https://cloudinary.com/new-doc2.jpg"
    ],
    "user": {
      "userId": "user-uuid",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@example.com",
      "phoneNumber": "+2348012345679",
      "profilePictureUrl": "https://cloudinary.com/profile.jpg"
    }
  }
}
```

### 6. Delete HomeOwner Profile
**DELETE** `/homeowners/:ownerId`

Deletes a homeowner profile. Only the profile owner or admin can delete.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "data": {
    "message": "Homeowner profile deleted successfully"
  }
}
```

### 7. Verify HomeOwner (Admin Only)
**PATCH** `/homeowners/:ownerId/verify`

Verifies or unverifies a homeowner. Only admins can perform this action.

**Headers:**
```
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "verified": true
}
```

**Response (200 OK):**
```json
{
  "data": {
    "ownerId": "uuid-here",
    "primaryResidence": "456 Home Street, Lekki, Lagos",
    "ownershipVerified": true,
    "message": "Homeowner verified successfully"
  }
}
```

### 8. Upload Verification Documents
**POST** `/homeowners/:ownerId/documents`

Uploads verification documents for a homeowner profile.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request Body:**
```
Form data with files
```

**Response (200 OK):**
```json
{
  "data": {
    "ownerId": "uuid-here",
    "verificationDocsUrls": [
      "https://cloudinary.com/doc1.jpg",
      "https://cloudinary.com/doc2.jpg",
      "https://cloudinary.com/new-doc3.jpg"
    ],
    "message": "Verification documents uploaded successfully"
  }
}
```

## Error Responses

### Authentication Errors
```json
{
  "error": "Authentication invalid. No token provided."
}
```

### Authorization Errors
```json
{
  "error": "Not authorized to access this route."
}
```

### Validation Errors
```json
{
  "error": "Company name already exists"
}
```

### Not Found Errors
```json
{
  "error": "Developer profile not found"
}
```

### Server Errors
```json
{
  "error": "An error occurred while creating developer profile"
}
```

## Status Codes

- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Notes

1. **Authentication**: Most endpoints require a valid JWT token in the Authorization header.
2. **Authorization**: Admin-only endpoints require admin role.
3. **Validation**: All input data is validated using Joi schemas.
4. **Pagination**: List endpoints support pagination with page and limit parameters.
5. **Search**: List endpoints support search functionality.
6. **File Uploads**: Document upload endpoints support multipart/form-data.
7. **Error Handling**: All endpoints return consistent error responses.
8. **Database**: Uses PostgreSQL with Sequelize ORM.
9. **Soft Deletes**: Profiles are soft deleted (paranoid mode).
10. **Relationships**: Profiles are linked to User models with proper associations.
