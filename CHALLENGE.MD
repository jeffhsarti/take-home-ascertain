# Full Stack: Take Home

# **Healthcare Dashboard**

## **Overview**

Build a modern, scalable React (TypeScript) healthcare dashboard with a FastAPI backend and PostgreSQL database. This assessment evaluates your architectural decisions, technical choices, and ability to create maintainable and performant full-stack applications.

**Context**: You're building a patient management dashboard for a medical practice. The application will grow over time to include multiple user types, complex workflows, and real-time features.

**Time Estimate:** We recommend spending no more than 2-4 hours on this exercise. Complete as many core tasks and stretch goals as possible within that timeframe.

**Submission Requirements**:

- Either share a public GitHub repository or send a zipped file.
- Comprehensive yet succinct `README.md`, with instructions to run locally.
- A functioning `docker-compose.yml` that can be used to launch the service easily.

---

## **Evaluation Criteria**

We'll assess your submission based on:

- Technical decision-making: architecture, library choices, state management, performance optimizations
- Code quality and employing best practices in software development
- API design and error handling
- Documentation and ease of local setup
- Correctness and completeness of each part
- Capability of understanding and applying requirements

---

## **Part 1: Project Foundation & Architecture**

Create a new React application and FastAPI backend from scratch, establishing your architectural foundation.

**Frontend Tasks:**

1. **Initialize your project,** preferably using Vite.
2. **Choose and configure your core dependencies**:
   - UI framework/component library
   - State management solution
   - Routing solution
   - Styling approach
3. **Set up development tooling**:
   - Linting and formatting
   - TypeScript configuration

**Backend Tasks:**

1. **Initialize a FastAPI application** with a health-check endpoint (`GET /health`) returning `{"status": "ok"}`.
2. **Set up PostgreSQL** with a schema for storing patients. Ensure another developer can easily recreate this database (migrations or init scripts).
3. **Seed the database** with realistic sample data (15-20 patients minimum) on startup.

---

## **Part 2: Core Dashboard Implementation**

Build the main dashboard with basic navigation and a patient list loading data from the backend.

**Tasks:**

1. **Implement patient CRUD endpoints**:
   - `GET /patients` — List patients with pagination
   - `GET /patients/{id}` — Get a specific patient
   - `POST /patients` — Create a patient
   - `PUT /patients/{id}` — Update a patient
   - `DELETE /patients/{id}` — Delete a patient
2. **Create a responsive layout** with:
   - Header with navigation
   - Sidebar
   - Main content area
3. **Implement a PatientList component** that displays:
   - Patient cards/rows with: name, age, last visit, status
   - Search/filter functionality
   - Sorting capabilities
   - Pagination or infinite scroll
4. **Add routing** for:
   - Dashboard home (/)
   - Patient list (/patients)
   - Individual patient view (/patients/:id)
   - 404 page

**Requirements:**

- List should handle 100+ patients efficiently
- Search should be non-blocking
- The application should be responsive for lower resolution screens
- Implement proper input validation and error handling with appropriate HTTP status codes

---

## **Part 3: Patient Notes**

Add the ability to attach clinical notes to patients.

**Backend Tasks:**

1. **Create endpoints for patient notes**:
   - `POST /patients/{id}/notes` — Add a note (accepts timestamp and text content)
   - `GET /patients/{id}/notes` — List all notes for a patient
   - `DELETE /patients/{id}/notes/{note_id}` — Delete a note
2. **Create a summary endpoint** (`GET /patients/{id}/summary`) that synthesizes a human-readable summary from the patient's profile and notes. The summary should include:
   - Basic patient identifiers (name, age, blood type)
   - A coherent narrative generated from the notes
   - Key clinical information (conditions, allergies)

   _Hint: an LLM can be helpful here, but a simple template-based approach is also acceptable._

**Frontend Tasks:**

1. **Add a notes section** to the patient detail view:
   - Display existing notes with timestamps
   - Form to add new notes
   - Delete functionality
2. **Add a summary view** that displays the generated patient summary.

---

## **Part 4: State & Form Management**

Add patient creation/editing with form handling.

**Tasks:**

1. **Build a patient form** with:
   - Personal information (name, DOB, contact, address)
   - Medical information (allergies, conditions, blood type, status)
2. **Implement form features**:
   - Client-side and server-side validation
   - Meaningful error messages displayed to the user
3. **Error handling** for:
   - Network failures
   - Validation errors

---

## **Part 5: Containerization**

Package everything for easy local development.

**Tasks:**

1. Create a `Dockerfile` for the FastAPI backend.
2. Create a `Dockerfile` for the React frontend (or serve via the backend).
3. Create a `docker-compose.yml` that starts:
   - Backend API
   - PostgreSQL database
   - Frontend
4. Include `.env.example` with required environment variables.

---

## **Stretch Goals (Choose Based on Time & Strengths)**

Choose 1-2 individual features from the list below that best demonstrate your expertise and/or interests:

### **Performance Optimization**

- Implement virtualization for large patient lists
- Add code splitting and lazy loading
- Optimize re-renders with memoization

### **Advanced Backend**

- Add sorting/filtering query parameters to list endpoint
- Implement request logging middleware
- Add database migrations with Alembic

### **Advanced UI/UX**

- Dark/light theme switching
- Advanced search with filters
- Data visualization (patient status chart)

### **Testing & Quality**

- Unit tests for API endpoints
- Component tests for critical UI
- E2E tests for main user journeys

### **Developer Experience**

- Set up CI/CD pipeline configuration
- Hot reloading in Docker for both frontend and backend
