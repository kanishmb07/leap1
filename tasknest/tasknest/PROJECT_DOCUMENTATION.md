# 1. TaskNest — Personal To-Do and Task Manager

## 2. Abstract

TaskNest is a REST-backed personal task manager. It lets users create an account, organize tasks into lists, set task priorities and due dates, track completion, and review task totals on a dashboard. The application uses a plain HTML/CSS/JavaScript frontend and a Spring Boot API backed by MySQL. JWT bearer tokens identify the user for protected operations.

## 3. Problem Statement

Manually maintained task lists can become scattered across notes, files, and reminders. This makes it harder to keep due dates visible, distinguish priorities, track completion, search existing work, or summarize progress. Shared or incorrectly selected records can also create ownership mistakes unless operations are scoped to the correct user.

## 4. Objectives

TaskNest is implemented to provide:

- User registration and password-based login.
- BCrypt password hashing and JWT-protected APIs.
- User-owned task-list creation, listing, renaming, and deletion.
- User-owned task creation, editing, deletion, and completion changes.
- LOW, MEDIUM, and HIGH task priorities.
- Required due dates and today/overdue views.
- Case-insensitive title search and priority filtering.
- Per-user dashboard statistics.
- Request validation, response DTOs, and centralized error handling.

## 5. Existing System

Traditional task management commonly relies on handwritten lists or independent notes. These approaches do not automatically aggregate work, enforce consistent fields, filter by priority, or ensure that operations apply to the intended account. Their effectiveness depends on manual updates and review.

## 6. Proposed System

TaskNest stores users, task lists, and tasks in MySQL through Spring Data JPA. A user owns task lists; each task belongs to one task list. The frontend uses REST requests for CRUD and views. Login issues a signed JWT, and protected endpoints derive the current user from that token before reading or modifying owned data.

## 7. System Architecture

### Request/data flow

```text
Frontend (HTML/CSS/JavaScript)
        ↓ fetch() with JSON and optional Bearer token
REST API
        ↓
Controller
        ↓
Service
        ↓
Repository (Spring Data JPA)
        ↓
JPA / Hibernate
        ↓
MySQL
```

### Authentication flow

```text
POST /api/auth/login
        ↓
AuthService loads user by email and verifies BCrypt with PasswordEncoder.matches
        ↓
JwtService signs token containing email subject and userId claim
        ↓
Frontend stores token in localStorage
        ↓
apiRequest() sends Authorization: Bearer <token>
        ↓
JwtAuthenticationFilter verifies signature and expiry
        ↓
AuthenticatedUser is placed in Spring Security context
        ↓
Controllers/services use the authenticated user identity for ownership checks
```

## 8. Technologies Used

| Technology | Purpose |
|---|---|
| Java 17 | Backend language configured in Maven |
| Spring Boot 4.1.1 | Application bootstrap and dependency management |
| Maven | Dependency management and build |
| Spring Web MVC | REST controllers and HTTP request handling |
| Spring Data JPA | Repository abstraction and derived queries |
| Hibernate | JPA persistence provider and ORM |
| MySQL | Relational database |
| Jakarta Validation | DTO/request validation |
| Spring Security | Stateless request authorization and BCrypt integration |
| JJWT 0.12.6 | JWT signing and parsing |
| HTML | Frontend page structure |
| CSS | Frontend styling and responsive layout |
| JavaScript | Form behavior and REST calls using Fetch API |
| Postman | Suitable manual API testing client; no Postman collection is included in the project |
| Visual Studio Code | Development environment, not an application runtime dependency |

## 9. Database Design

The entities map to the `users`, `task_lists`, and `tasks` tables. IDs use generated identity values. The configured Hibernate setting is `spring.jpa.hibernate.ddl-auto=update`; it is not set to `create` or `create-drop`.

| Entity/table | Important fields | Relationships |
|---|---|---|
| `User` / `users` | `id`, `name`, unique non-null `email`, `password` (stored as BCrypt hash) | One user has many task lists through `TaskList.user` |
| `TaskList` / `task_lists` | `id`, `name`, `user_id` | Many-to-one owner `User`; one-to-many tasks with `CascadeType.ALL` |
| `Task` / `tasks` | `id`, `title`, `dueDate`, `priority`, `completed`, `task_list_id` | Many-to-one `TaskList`; priority is stored as enum text |

```text
User 1 ───── * TaskList 1 ───── * Task
                   user_id          task_list_id
```

Deleting a task list uses the entity's cascade configuration and therefore also removes tasks in that list. There is no separate dashboard table; dashboard counts are derived from task rows.

**Database verification note:** Entity mappings specify the relationships above. Live MySQL table and foreign-key metadata were not inspected for this report because no database-tool connection was available. Run the application against the configured database to confirm its current schema and data.

## 10. Modules

### A. Authentication Module

`AuthController` exposes login. `AuthService` loads by email, compares the request password to the stored BCrypt hash, and returns user-safe fields plus a JWT. Unknown email and incorrect password use the same invalid-credentials response.

### B. User Module

Public registration validates `UserRequest` and hashes the password in `UserService` before saving. Protected user reads return `UserResponse`, not the entity. `GET /api/users` returns a list containing the current user's record; `GET /api/users/{id}` only allows the current user's ID.

### C. Task List Module

Task lists are created for the authenticated user. Listing verifies the URL `userId` matches the token principal. Updating and deleting verify ownership using `findByIdAndUserId`.

### D. Task Module

Tasks are created only in a task list owned by the current user. Reads, updates, deletes, complete/incomplete operations, search, priority filtering, today, and overdue queries are scoped to that user. Update changes title, due date, priority, and requires the selected task list to be the task's existing list; it does not directly change completion status or owner.

### E. Dashboard Module

`DashboardService` verifies that the user exists, then calculates totals, completion status, overdue incomplete tasks, and per-priority counts for that user.

### F. Search and Filter Module

Title search uses a case-insensitive JPA derived query. Priority filter accepts the `Priority` enum. Empty query results are returned as an empty list by the controller.

### G. Security Module

`SecurityConfig` sets stateless sessions, disables CSRF/form/basic login, permits registration/login and OPTIONS preflight, and requires authentication for other routes. The JWT filter runs before `UsernamePasswordAuthenticationFilter`. CORS allows the configured local frontend origins.

## 11. API Documentation

All routes are under `/api`. `POST /api/users` and `POST /api/auth/login` are public; other listed routes require a valid bearer token. A client-supplied ID in a compatibility URL is checked against the authenticated principal and does not grant access to another user.

| Method | Endpoint | Purpose | Authentication | Expected status |
|---|---|---|---|---|
| POST | `/api/users` | Register user; response omits password | Public | 201; 400 invalid request |
| POST | `/api/auth/login` | Verify credentials and return JWT | Public | 200; 400 invalid request; 401 invalid credentials |
| GET | `/api/users` | Return current user's safe profile in a list | Required | 200; 401 |
| GET | `/api/users/{id}` | Return own profile; mismatched ID is denied | Required | 200; 401; 403; 404 |
| POST | `/api/task-lists` | Create a list for current user | Required | 201; 400; 401 |
| GET | `/api/task-lists/user/{userId}` | List current user's task lists; path ID must match principal | Required | 200; 401; 403 |
| PUT | `/api/task-lists/{taskListId}` | Rename owned task list | Required | 200; 400; 401; 404 |
| DELETE | `/api/task-lists/{taskListId}` | Delete owned task list and cascaded tasks | Required | 204; 401; 404 |
| POST | `/api/tasks` | Create task in an owned list | Required | 201; 400; 401; 404 |
| GET | `/api/tasks/list/{taskListId}` | List tasks for an owned list | Required | 200; 401; 404 |
| GET | `/api/tasks/user/{userId}/list/{taskListId}` | Compatibility route; verifies URL user ID and list ownership | Required | 200; 401; 403; 404 |
| PUT | `/api/tasks/{taskId}` | Update title/date/priority in its existing owned list | Required | 200; 400; 401; 404 |
| DELETE | `/api/tasks/{taskId}` | Delete owned task | Required | 204; 401; 404 |
| PUT | `/api/tasks/{taskId}/complete` | Mark owned task complete | Required | 200; 401; 404 |
| PUT | `/api/tasks/{taskId}/incomplete` | Mark owned task incomplete | Required | 200; 401; 404 |
| GET | `/api/tasks/today` | Current user's tasks due today | Required | 200; 401 |
| GET | `/api/tasks/overdue` | Current user's incomplete tasks due before today | Required | 200; 401 |
| GET | `/api/tasks/search?title={text}` | Search current user's titles, case-insensitive | Required | 200; 401 |
| GET | `/api/tasks/filter?priority={LOW\|MEDIUM\|HIGH}` | Filter current user's tasks by priority | Required | 200; 400 invalid enum; 401 |
| GET | `/api/dashboard` | Current user's dashboard statistics | Required | 200; 401 |
| GET | `/api/dashboard/{userId}` | Compatibility route; ID must match authenticated user | Required | 200; 401; 403; 404 |

The app's controllers set 201 for creates, 200 for reads/updates, and 204 for deletes. Empty search/filter/date/list results are normal 200 responses with `[]`.

## 12. Validation

- **User registration:** name non-blank; email non-blank and valid format; password non-blank and at least 6 characters.
- **Login:** email non-blank and valid format; password non-blank.
- **Task list:** name non-blank. `TaskListRequest.userId` remains optional for compatibility; controllers take ownership from the JWT and ignore it.
- **Task:** task-list ID, title, due date, and priority are required; title cannot be blank. Due date must parse as `LocalDate`, but no future-date-only rule is implemented. Priority is the `LOW`, `MEDIUM`, or `HIGH` enum; invalid JSON/enum values result in request parsing errors.
- Method validation errors and malformed JSON are handled as HTTP 400. No validation rule currently prohibits a past due date.

## 13. Security

- New user passwords are encoded with BCrypt before persistence.
- Login uses `PasswordEncoder.matches(rawPassword, storedHash)`; the password is not returned in user/login DTOs.
- JWT contains email as subject and a `userId` claim, plus issue/expiry timestamps. The configured expiry defaults to 86400000 milliseconds.
- JWT signing key and database password are required environment variables (`JWT_SECRET`, `DB_PASSWORD`); URL and username have local defaults and may be overridden with `DB_URL` and `DB_USERNAME`.
- Authentication is stateless (`SessionCreationPolicy.STATELESS`); tokens use the Bearer authorization header.
- User, list, task, and dashboard operations derive ownership from the authenticated principal. Compatibility path IDs are equality-checked.
- CORS allows `http://localhost:3000`, `http://localhost:5500`, `http://127.0.0.1:5500`, and `http://localhost:5173`; methods are GET/POST/PUT/DELETE/OPTIONS and headers are Authorization/Content-Type. No wildcard origin is configured.
- Frontend stores the token and safe user details in localStorage. This is browser-side storage and remains susceptible to XSS; HTTPS and a stricter token-storage strategy are appropriate for production.

## 14. Exception Handling

| Condition | Implemented behavior |
|---|---|
| 400 validation | `MethodArgumentNotValidException` returns `status`, `error`, and field errors |
| 400 malformed JSON | `HttpMessageNotReadableException` returns a malformed-request message |
| 401 invalid login | `InvalidCredentialsException`; same generic message for missing user and wrong password |
| 401 missing/invalid JWT | Spring Security authentication entry point returns JSON |
| 403 authenticated but forbidden | Spring Security access-denied handler and controller `AccessDeniedException` handling return JSON |
| 404 missing resource | `ResourceNotFoundException` handler returns JSON |
| 500 unexpected exception | No custom catch-all handler; Spring Boot's default error handling applies |

The application does not classify every `RuntimeException` as 404.

## 15. Frontend

The `tasknest-frontend/` directory is served separately from Spring Boot; backend `static/` and `templates/` directories are empty.

- `index.html`: landing page with register/login links.
- `register.html`: name/email/password form; validation feedback comes from the browser and backend.
- `login.html`: login form; stores the returned JWT and safe user fields only.
- `dashboard.html`: statistics, task lists, task controls, dialogs, filters, and navigation.
- `js/api.js`: central API base, `apiRequest()`, bearer token, JSON headers, and common error mapping.
- `js/auth.js`: registration/login form behavior.
- `js/dashboard.js`: task/list CRUD, dashboard loading, search/filter/date views, status actions, and logout.
- `css/style.css`: responsive styling and visual states.

## 16. Complete Application Workflow

1. The user opens the frontend landing page.
2. The user registers with name, email, and password.
3. Spring validation checks the request.
4. `UserService` BCrypt-encodes the password.
5. The user is stored in MySQL.
6. The user logs in with email/password.
7. `AuthService` loads by email and verifies the BCrypt hash.
8. `JwtService` issues a signed, expiring JWT.
9. The frontend stores the token and safe profile fields, not the password.
10. The dashboard calls protected APIs with the Bearer token.
11. The user creates an owned task list.
12. The user creates tasks in an owned list.
13. The user updates task completion or edits/deletes tasks.
14. The user searches and filters, or opens Today/Overdue.
15. The dashboard refreshes its server-calculated statistics after mutations.
16. Logout clears local token/profile and returns to login.

## 17. Testing

The only checked-in JUnit test is `TasknestApplicationTests.contextLoads`. The workspace Maven build tool reported a successful build during the audit. Runtime tests below were not executed against a live database/API during documentation preparation; therefore they are marked **TO BE VERIFIED**, not PASS.

| Test Case | Input | Expected Result | Status |
|---|---|---|---|
| Maven build | Workspace Maven build | Build succeeds | PASS |
| Registration | Valid name/email/password | 201, safe response, BCrypt password stored | TO BE VERIFIED |
| Invalid registration | Empty name, invalid email, short/empty password | 400 | TO BE VERIFIED |
| Login | Existing user's valid credentials | 200, user fields and JWT; no password | TO BE VERIFIED |
| Invalid login | Wrong password/nonexistent email | Generic 401 | TO BE VERIFIED |
| JWT protected endpoint | Missing, invalid, and expired token | 401 | TO BE VERIFIED |
| Create task list | Name with Bearer token | 201; list owned by token user | TO BE VERIFIED |
| List task lists | Current user route | Only current user's lists | TO BE VERIFIED |
| Update/delete task list | Owned list ID | 200 update; 204 delete | TO BE VERIFIED |
| Create task | Owned task-list ID, title/date/priority | 201; incomplete and linked correctly | TO BE VERIFIED |
| Update task | Owned task ID and original list | 200; editable fields change, status unchanged | TO BE VERIFIED |
| Complete/incomplete | Owned task ID | 200; completion flag toggles | TO BE VERIFIED |
| Delete task | Owned task ID | 204; task removed | TO BE VERIFIED |
| Search | Mixed-case title substring | Case-insensitive matches; no matches returns `[]` | TO BE VERIFIED |
| Priority filter | HIGH, MEDIUM, LOW | Only requested priority | TO BE VERIFIED |
| Today | Current user's due-today tasks | Only tasks whose due date is today | TO BE VERIFIED |
| Overdue | Past due, incomplete task | Returned; completed overdue task excluded | TO BE VERIFIED |
| Dashboard | User with mixed task states/priorities | Per-user totals satisfy documented formulas | TO BE VERIFIED |
| Ownership | User A requests User B's list/task/profile/dashboard | 403 or 404, no cross-user data | TO BE VERIFIED |

## 18. Advantages

- Uses explicit request/response DTOs for API boundaries.
- Passwords are not returned and are BCrypt-hashed before storage.
- JWT-protected APIs are stateless and scope data to a user.
- Search and task summaries are computed by backend repository/service logic.
- Existing Java/Spring and browser-native technologies keep the deployment shape straightforward.

## 19. Limitations

- No automated service/controller integration suite currently covers the API workflows; the checked-in test is only a context-load test.
- Live database tables, current foreign keys, CRUD behavior, and cross-user scenarios were not verified during this report.
- No refresh-token or token-revocation mechanism is implemented; token validity ends at expiry or key change.
- Browser localStorage is vulnerable if an XSS issue is introduced.
- Task updates keep the task in its existing list; moving a task to another list is not supported by the current service.
- Due dates are required but may be in the past; the backend does not enforce future dates.
- No pagination, recurring tasks, reminders, or audit history are implemented.
- User registration has no email verification or password-reset flow.

## 20. Future Enhancements

These are future possibilities, not current features: email reminders, push notifications, recurring tasks, calendar integration, file attachments, a mobile application, advanced analytics, and cloud deployment. Other production follow-ups could include automated integration tests, refresh/revocation strategy, and stronger browser token storage.

## 21. Conclusion

TaskNest currently provides a layered Spring Boot/MySQL REST API and a plain HTML/CSS/JavaScript client for personal task management. Its implemented features include BCrypt registration, JWT login, user-scoped task/list operations, filtering/search, date views, and a dashboard. The source and Maven build are present; live MySQL/API behavior still requires an environment-configured run and integration testing.

## 22. Project File Structure

Generated build output (`target/`) is omitted below. `src/main/resources/static/` and `templates/` are currently empty. The `com/tasknest/tasknest/` package directory is also empty.

```text
Tasknest/
├── .gitattributes
├── .github/
│   └── modernize/
│       └── java-upgrade/
├── .gitignore
├── .mvn/wrapper/maven-wrapper.properties
├── HELP.md
├── PROJECT_DOCUMENTATION.md
├── mvnw
├── mvnw.cmd
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/com/tasknest/
│   │   │   ├── TasknestApplication.java
│   │   │   ├── config/SecurityConfig.java
│   │   │   ├── controller/
│   │   │   │   ├── AuthController.java
│   │   │   │   ├── DashboardController.java
│   │   │   │   ├── package-info.java
│   │   │   │   ├── TaskController.java
│   │   │   │   ├── TaskListController.java
│   │   │   │   └── UserController.java
│   │   │   ├── dto/
│   │   │   │   ├── DashboardResponse.java
│   │   │   │   ├── LoginRequest.java
│   │   │   │   ├── LoginResponse.java
│   │   │   │   ├── package-info.java
│   │   │   │   ├── TaskListRequest.java
│   │   │   │   ├── TaskListResponse.java
│   │   │   │   ├── TaskRequest.java
│   │   │   │   ├── TaskResponse.java
│   │   │   │   ├── UserRequest.java
│   │   │   │   └── UserResponse.java
│   │   │   ├── entity/
│   │   │   │   ├── package-info.java
│   │   │   │   ├── Priority.java
│   │   │   │   ├── Task.java
│   │   │   │   ├── TaskList.java
│   │   │   │   └── User.java
│   │   │   ├── exception/
│   │   │   │   ├── GlobalExceptionHandler.java
│   │   │   │   ├── InvalidCredentialsException.java
│   │   │   │   ├── package-info.java
│   │   │   │   └── ResourceNotFoundException.java
│   │   │   ├── repository/
│   │   │   │   ├── package-info.java
│   │   │   │   ├── TaskListRepository.java
│   │   │   │   ├── TaskRepository.java
│   │   │   │   └── UserRepository.java
│   │   │   ├── security/
│   │   │   │   ├── AuthenticatedUser.java
│   │   │   │   ├── JwtAuthenticationFilter.java
│   │   │   │   └── JwtService.java
│   │   │   ├── service/
│   │   │   │   ├── AuthenticatedUserService.java
│   │   │   │   ├── AuthService.java
│   │   │   │   ├── DashboardService.java
│   │   │   │   ├── package-info.java
│   │   │   │   ├── TaskListService.java
│   │   │   │   ├── TaskService.java
│   │   │   │   └── UserService.java
│   │   │   └── tasknest/ (empty)
│   │   └── resources/
│   │       ├── application.properties
│   │       ├── static/ (empty)
│   │       └── templates/ (empty)
│   └── test/java/com/tasknest/TasknestApplicationTests.java
└── tasknest-frontend/
    ├── index.html
    ├── login.html
    ├── register.html
    ├── dashboard.html
    ├── css/style.css
    └── js/
        ├── api.js
        ├── auth.js
        └── dashboard.js
```

## 23. How to Run

### MySQL

Create the database if it does not already exist; this is non-destructive:

```sql
CREATE DATABASE IF NOT EXISTS tasknest;
```

The application defaults to `jdbc:mysql://localhost:3306/tasknest` and username `root`. Provide `DB_PASSWORD` in the environment. Override the URL/user with `DB_URL`/`DB_USERNAME` if necessary. Hibernate uses `ddl-auto=update` and does not request table recreation.

### Backend

Set the local DB password and generate a Base64-encoded 256-bit JWT signing key in the same PowerShell session, then run:

```powershell
$env:DB_PASSWORD = "<your-local-mysql-password>"
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
$rng.Dispose()
mvn clean
mvn spring-boot:run
```

For a packaged build, use `mvn clean package` before `mvn spring-boot:run`. The API listens on port 8080 by default. Set `JWT_EXPIRATION` in milliseconds to override the 24-hour default. Keep the key stable between runs if existing tokens should remain valid.

### Frontend

From the project root, serve the static frontend:

```powershell
py -m http.server 5500 --directory tasknest-frontend
```

Open `http://localhost:5500/index.html`. The frontend's default API base is `http://localhost:8080`.

## 24. Demo Flow

```text
Register
→ Login and receive JWT
→ Dashboard
→ Create Task List
→ Create Task
→ Mark Complete / Incomplete
→ Edit Task
→ Search / Priority Filter
→ Today / Overdue
→ Dashboard statistics refresh
→ Delete Task / Task List
→ Logout
```

## Project Documentation Status

- **Backend:** Layered Spring Boot source inspected; Maven build tool reported success.
- **Database:** Entity relationships and environment config documented; live schema/FK check not available because no DB client connection was configured.
- **Authentication:** BCrypt login and stateless protected routes are implemented in source; runtime behavior TO BE VERIFIED.
- **JWT:** Claims, expiry, filter, and Bearer flow inspected; live token acceptance/rejection TO BE VERIFIED.
- **Frontend:** Files and API call structure inspected; live browser-to-API flow TO BE VERIFIED.
- **APIs:** Endpoint table reflects controller mappings inspected in source.
- **Testing:** Maven build PASS; JUnit context test and API/database test cases TO BE VERIFIED.
- **Documentation:** This report is based on the inspected source and marks unexecuted checks clearly.
