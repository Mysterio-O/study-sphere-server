# StudySphere Server API Documentation

## Overview
StudySphere is a comprehensive educational platform server that provides APIs for user management, post creation, study planning, quiz generation, and more. This server is built with Node.js, Express, and MongoDB.

## Base URL
```text
https://your-server-domain.com
```

# API Endpoints  

## Support & Subscription APIs  

### 1. Send Support Message  
**Endpoint:** `POST /send-support-message`  
**Description:** Send a support message  
**Body:** Message data object  
**Response:** `201 Created` or error  

### 2. Subscribe to Newsletter  
**Endpoint:** `POST /subscribe`  
**Query Parameters:**  
- `email` - Subscriber email  
**Response:** `201 Created` or error  

---

## User Management APIs  

### 1. Create User  
**Endpoint:** `POST /create-user`  
**Body:** User data including email, username, institution details  
**Response:** `201 Created`, `409 Conflict` if email exists  

### 2. Upload Cover Photo  
**Endpoint:** `PATCH /upload-cover`  
**Authentication:** Required  
**Query Parameters:**  
- `email` - User email  
**Body:**  
```json
{ "coverUrl": "url" }
```
**Response:** `201 Created` or error  

### 3. Get Cover Photo

**Endpoint:** `GET /cover-photo`
**Query Parameters:**

`email` - User email
**Response:** Cover URL string

### 4. Get User Details

**Endpoint:** `GET /user-details`
**Authentication:** Required
**Query Parameters:**

`email `- User email
**Response:** User object

### 5. Update Profile

**Endpoint:** `PATCH /update-profile`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Body:** Profile update data
**Response:**200 OK with update status

### 6. Delete User

**Endpoint:** `DELETE /delete-user`
**Authentication**: Required
**Query Parameters:**

`email` - User email
**Response**: 201 Created or error

### 8. Check Profile Verification

**Endpoint:** `GET /check-profile-verified`
**Authentication**: Required
**Query Parameters:**

`email` - User email
**Response:**
```json
{ "isVerified": boolean }
```


## Post Management APIs

### 1. Create Post

**Endpoint:** `POST /create-post`
**Authentication:** Required
**Query Parameters:**

`email` - Author email
**Body:**
```json
{ "postData": postObject }
```
**Response:** `201 Created or error`

### 2. Get User Posts

**Endpoint:** `GET /my-posts`
**Authentication:** Required
**Query Parameters:**

`email, page, limit`
**Response:** Paginated posts with metadata

### 3. Update Post

**Endpoint:** `PATCH /update-post`
**Authentication:** Required
**Query Parameters:**

`email` - User email
Body:
```json
{ "data": { "id", "newImageUrl", "newText" } }
```
**Response:** 201 Created or error

### 4. Delete Post

**Endpoint:** `DELETE /delete-post`
**Authentication:** Required
**Query Parameters:**

`id, email`
**Response:** 204 No Content or error

### 5. Manage Like/Unlike

**Endpoint:** `PATCH /manage-like`
**Authentication:** Required
**Query Parameters:**

`id, email`
**Response:** 201 Created or error

### 6. Get Total Likes

**Endpoint:** `GET /total-likes`
**Authentication:** Required
**Query Parameters:**

`id` - Post ID
**Response:** Array of user emails who liked

### 7. Get Comments

**Endpoint:** `GET /all-comments`
**Authentication:** Required
**Query Parameters:**

`id` - Post ID
**Response:** Array of comments

### 8. Add Comment

**Endpoint:** `POST /add-comment`
**Authentication:** Required
**Query Parameters:**

`id` - Post ID
**Body:** Comment data
**Response:** 201 Created or error

### 9. Edit Comment

**Endpoint:** `PATCH /edit-comment`
**Authentication:** Required
**Query Parameters:**

`postId` - Post ID
**Body:** Comment data with id and editedText
**Response:** 201 Created or error

### 10. Delete Comment

**Endpoint:** DELETE /delete-comment
**Authentication:** Required
**Query Parameters:**

`postId, commentId`
**Response:** 201 Created or error



## Subject Management APIs

### 1. Add Subjects

**Endpoint:** `POST /add-subjects`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Body:** Subjects data
**Response:** 201 Created or error

### 2. Get User Subjects

**Endpoint:** `GET /my-subjects`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Response:** User's subjects with count

### 3. Delete Subject

**Endpoint:** `DELETE /delete-subject`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Body:** Subject data to delete
**Response:** 201 Created or error

### 4. Update Subject

**Endpoint:** `PATCH /update-subject`
`Authentication:` Required
**Query Parameters:**

`email` - User email
**Body:**
```json
{ "data": { "oldData", "newData" } }
```

**Response:** 201 Created or error


## Schedule Management APIs

### 1. Add Schedule

**Endpoint:** `POST /add-schedule`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Body:** Schedule details
**Response:** 201 Created or error

### 2. Get User Schedules

**Endpoint:** `GET /my-schedules`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Response:** Array of schedules

### 3. Delete Schedule

**Endpoint:** `DELETE /delete-schedule`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Body:** Schedule data to delete
**Response:** 201 Created or error


## AI-Powered Quiz APIs
### 1. Generate Questions

**Endpoint:** `POST /question-generator`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Body:**
```json
{ "data": { "questionType", "topic", "questionNumbers", "difficulty" } }
```

**Response:** Generated questions

### 2. Verify Answers

**Endpoint:** `POST /verify-answers`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Body:**
```json
{ "data": [ { "question", "userAnswer" } ] }
```

**Response:** Verified results with correctness



## Quiz Progress APIs

### 1. Save Quiz Progress

**Endpoint:** `POST /save-quiz-progress`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Body:**
```json
{ "quizType", "topic", "difficulty", "questions" }
```

**Response:** 201 Created or error

### 2. Get Quiz Progression

**Endpoint:** `GET /my-quiz-progression`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Response:** User's quiz progression data


## Study Planner APIs
### 1. Create Study Plan

**Endpoint:** `POST /study-plans`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Body:** Study plan data
**Response:** 201 Created or error

### 2. Get Study Plans

**Endpoint:** `GET /study-plans`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Response:** Array of study plans

### 3. Update Study Plan

**Endpoint:** `PUT /study-plans/:id`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Params:** `id - Plan ID`
**Body:** Update data
**Response:** 201 Created or error

### 4. Delete Study Plan

**Endpoint:** `DELETE /study-plans/:id`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Params**: `id - Plan ID`
**Response:** 201 Created or error


## Wallet Management APIs
### 1. Add Income

**Endpoint:** `POST /wallet/income`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Body:**
```json
{ "amount", "source", "date" }
```

**Response:** 201 Created or error

### 2. Get Wallet Data

**Endpoint:** `GET /wallet`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Response:** Wallet data with income/expense history

### 3. Add Expense

**Endpoint:** `POST /wallet/expense`
**Authentication:** Required
**Query Parameters:**

`email` - User email
**Body:**
```json
{ "amount", "category", "date" }
```

**Response:** 201 Created or error


## Newsfeed API
1. Get All Posts

**Endpoint:** `GET /all-posts`
**Query Parameters:**

`page, limit`
**Response:** Paginated posts with total pages


### Error Responses

**All endpoints may return these common error responses:**

`400 Bad Request - Missing parameters or invalid data`

`401 Unauthorized - Missing or invalid authentication`

`404 Not Found - Resource not found`

`409 Conflict - Resource already exists`

`500 Internal Server Error - Server error`