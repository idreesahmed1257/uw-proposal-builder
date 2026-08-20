
# DevNauts Upwork Proposal Builder

An AI-powered internal proposal generation platform built during an internship at DevNauts.

The system takes an Upwork client brief, retrieves relevant portfolio evidence and a similar past proposal for tone reference, and uses an LLM to generate a tailored proposal grounded in DevNauts' actual project experience.

## Live Demo

https://uw-proposal-builder.vercel.app/

## GitHub Repository

https://github.com/idreesahmed1257/uw-proposal-builder

---

## Overview

Writing proposals for different Upwork clients can become repetitive and time-consuming. Each job has different requirements, technologies, industries, and client expectations, while the most relevant portfolio experience may be difficult to identify manually.

The DevNauts Proposal Builder was developed to streamline this workflow.

Instead of generating a proposal directly from an LLM, the system first retrieves relevant information from DevNauts' portfolio and a curated collection of previous proposals. This retrieved context is then provided to the LLM so that the generated proposal is relevant to the specific job while following the desired writing style.

### Basic Workflow

Client Brief
↓
Query Understanding
↓
Portfolio Retrieval
↓
Hybrid Re-scoring
↓
Tone Example Retrieval
↓
LLM Generation
↓
Proposal Draft

---

## Key Features

- AI-powered Upwork proposal generation
- ChatGPT-style chat interface
- JWT-based authentication
- Admin panel for managing portfolio projects
- Portfolio project CRUD operations
- Automatic MongoDB and Pinecone synchronization
- Semantic portfolio search
- Hybrid retrieval using semantic similarity and metadata/tag matching
- Structured query understanding
- Separate portfolio and tone-example Pinecone namespaces
- Curated tone matching using previous proposals
- Low-confidence retrieval detection
- Prompt-based hallucination and grounding controls
- User profile links for GitHub, portfolio, and LinkedIn
- Chat history and proposal management
- Cloud deployment with Vercel and Railway

---

## Tech Stack

### Frontend

- React 18
- Vite
- React Router
- Axios
- JavaScript / JSX
- CSS

### Backend

- Node.js
- Express 5
- Mongoose
- MongoDB Atlas
- JWT
- bcryptjs
- Axios
- dotenv

### AI / RAG

- Groq API
- Llama-based language models
- Pinecone
- Pinecone integrated embeddings
- Custom hybrid retrieval and re-scoring
- Prompt engineering
- Query understanding

> Note: LangChain packages are present in the backend dependencies, but the current implementation uses custom retrieval logic rather than LangChain-based orchestration.

---

## System Architecture

The application consists of a React frontend and an Express backend.

### 1. Frontend

The React application provides:

- Authentication
- Chat interface
- Proposal generation
- Chat history
- Admin panel
- Portfolio management
- Profile link management

The frontend communicates with the backend through REST APIs using Axios.

### 2. Backend

The Express backend handles:

- Authentication
- User management
- Chat and message management
- Portfolio management
- Query understanding
- Pinecone retrieval
- Tone-example retrieval
- Proposal generation

MongoDB is used as the main application database, while Pinecone is used for vector search.

---

## Proposal Generation Pipeline

When a user submits a client brief, the backend follows several steps.

### Step 1: Store the User Message

The client brief is stored as a message inside the current chat.

The complete conversation history is then available to the retrieval pipeline.

### Step 2: Query Understanding

A separate Groq LLM call analyzes the conversation and converts it into a structured query profile.

The profile contains:

- `clean_query`
- `tech_stack`
- `functional_signals`
- `project_type`
- `industry_guess`
- `core_requirements`

The query-understanding prompt also instructs the model to treat the job description as data rather than instructions, helping reduce the effect of prompt injection attempts inside client job descriptions.

### Step 3: Portfolio Retrieval

The cleaned query is sent to Pinecone.

Portfolio projects are stored in the:

`portfolio-projects`

namespace.

The system initially retrieves a wider candidate pool and then re-scores those candidates.

### Step 4: Hybrid Re-scoring

The final ranking combines multiple signals:

- 60% semantic similarity
- 35% keyword/tag overlap
- 5% industry match

The keyword component compares the query's technologies, functional signals, and project type against normalized project tags.

This helps the system avoid relying only on embedding similarity.

### Step 5: Tone Retrieval

A separate Pinecone namespace contains curated previous proposals:

`tone-examples`

The system retrieves the closest matching past proposal and uses it as a writing-style reference.

There are currently 6 curated tone examples.

If the tone match is below the confidence threshold, the system falls back to a predefined tone/style guide.

### Step 6: Proposal Generation

The retrieved information is passed to the Groq LLM together with the client brief and generation instructions.

The prompt contains grounding rules designed to prevent the model from inventing:

- Portfolio projects
- Technologies
- Clients
- Metrics
- URLs
- Results
- Experience

The generated proposal is then saved to MongoDB and returned to the frontend.

---

## RAG Architecture

The project uses two separate knowledge areas.

### Portfolio Knowledge

`portfolio-projects`

Contains factual information about DevNauts projects.

Each project is represented as a single Pinecone vector containing information such as:

- Project title
- Role
- Description
- Skills and deliverables
- Industry
- Tags
- Project URL

The system uses **one vector per project** rather than splitting each project into multiple chunks.

This keeps small, self-contained project records together during retrieval.

### Tone Knowledge

`tone-examples`

Contains 6 curated past proposal examples.

Each example contains:

- Job brief
- Previous proposal response
- Platform information
- Document ID

The job brief is used for vector retrieval, while the corresponding proposal response is used as the style reference during generation.

Keeping these namespaces separate prevents writing-style examples from being confused with factual portfolio evidence.

---

## MongoDB and Pinecone Synchronization

Portfolio projects are managed through the admin panel.

When a project is:

- Created → MongoDB is updated and the project is added to Pinecone
- Updated → MongoDB is updated and the corresponding Pinecone record is synchronized
- Deleted → MongoDB and the corresponding Pinecone vector are both updated

This keeps the vector knowledge base aligned with the portfolio data maintained by the team.

---

## Admin Panel

The admin panel allows authorized administrators to manage the information used by the proposal-generation system.

### Portfolio Management

Administrators can:

- Create projects
- Edit projects
- Delete projects
- View existing projects
- Manage project descriptions
- Manage technologies and skills
- Manage tags
- Manage industries
- Manage project URLs

### Profile Management

The system also supports storing:

- GitHub URL
- Portfolio URL
- LinkedIn URL

These links can be included in generated proposals when relevant.

### Admin Accounts

Administrators can create additional admin accounts through the backend API.

---

## Authentication

Authentication is implemented using:

- JWT
- bcryptjs
- Express middleware

The system supports two user roles:

- `member`
- `admin`

Passwords are hashed using bcrypt before being stored.

JWT tokens are used to authenticate API requests.

Protected backend routes verify the token before allowing access, while portfolio-management endpoints additionally require the admin role.

---

## Chat System

The application provides a persistent chat-style interface.

Users can:

- Create new chats
- View previous chats
- Rename chats
- Delete chats
- Send client briefs
- Generate proposals
- View generated responses

Messages and chat history are stored in MongoDB.

Generated messages also store information about the retrieved portfolio sources and retrieval scores, allowing the system to expose the evidence used during generation.

---

## Grounding and Hallucination Controls

One of the main engineering goals was to prevent the LLM from freely inventing portfolio experience.

The generation prompt contains explicit rules requiring the model to use only supplied portfolio evidence.

It prevents unsupported claims involving:

- Projects
- Clients
- Technologies
- Metrics
- URLs
- Results
- Previous experience

Portfolio URLs must come from the retrieved project data rather than being generated by the model.

The system also uses retrieval confidence thresholds so that weak portfolio matches can be flagged instead of being presented as strong evidence.

These controls are implemented primarily through retrieval logic and prompt engineering rather than a separate automated fact-checking model.

---

## Low-Confidence Retrieval

The system includes confidence thresholds for both retrieval paths.

### Portfolio Retrieval

A combined score below `0.22` is treated as low confidence.

### Tone Retrieval

A tone similarity score below `0.45` is treated as low confidence.

This allows the generation layer to distinguish between strong retrieved evidence and cases where the system does not have a reliable matching example.

---

## Repository Structure

```text
uw-proposal-builder/
│
├── backend/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── chatController.js
│   │   ├── messageController.js
│   │   └── portfolioController.js
│   │
│   ├── data/
│   │   └── proposals-top6-clean.jsonl
│   │
│   ├── middleware/
│   │   └── authMiddleware.js
│   │
│   ├── models/
│   │   ├── Chat.js
│   │   ├── Message.js
│   │   ├── PastProposal.js
│   │   ├── PortfolioProject.js
│   │   └── User.js
│   │
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── chatRoutes.js
│   │   └── portfolioRoutes.js
│   │
│   ├── scripts/
│   │   ├── ingestPastProposals.js
│   │   ├── ingestPortfolio.js
│   │   ├── testGeneration.js
│   │   ├── testJobDescriptions.js
│   │   ├── testQueryUnderstanding.js
│   │   ├── testRetrieval.js
│   │   ├── testToneRetrieval.js
│   │   └── ...
│   │
│   ├── seed/
│   │   ├── seedPortfolio.js
│   │   └── seedPastProposals.js
│   │
│   ├── services/
│   │   ├── generationService.js
│   │   ├── pineconeService.js
│   │   ├── queryUnderstandingService.js
│   │   ├── retrievalService.js
│   │   ├── tagNormalization.js
│   │   ├── toneExampleService.js
│   │   └── toneRetrievalService.js
│   │
│   ├── utils/
│   │   └── generateToken.js
│   │
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── api/
    │   │   ├── client.js
    │   │   ├── chats.js
    │   │   └── portfolio.js
    │   │
    │   ├── components/
    │   │   ├── ChatWindow.jsx
    │   │   ├── Composer.jsx
    │   │   └── Sidebar.jsx
    │   │
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   │
    │   ├── pages/
    │   │   ├── AdminPage.jsx
    │   │   └── AuthPage.jsx
    │   │
    │   ├── App.jsx
    │   └── main.jsx
    │
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── .env.example
````

---

## Environment Variables

The application uses environment variables for database, authentication, AI, and Pinecone configuration.

### Backend

Create:

```text
backend/.env
```

based on:

```text
backend/.env.example
```

Typical configuration includes:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=your_pinecone_index

GROQ_API_KEY=your_groq_api_key
GROQ_API_KEY2=your_second_groq_api_key

GROQ_EXTRACTION_MODEL=your_extraction_model
```

The exact variables should be taken from the repository's `.env.example` file.

### Frontend

Create:

```text
frontend/.env
```

based on:

```text
frontend/.env.example
```

The frontend uses:

```env
VITE_API_URL=your_backend_api_url
```

Do not commit real API keys or secrets to GitHub.

---

## Local Development

### Clone the repository

```bash
git clone https://github.com/idreesahmed1257/uw-proposal-builder.git
cd uw-proposal-builder
```

### Backend

```bash
cd backend
npm install
npm run dev
```

The backend runs on the configured port, typically:

```text
http://localhost:5000
```

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server typically runs on:

```text
http://localhost:5173
```

Make sure MongoDB, Pinecone, and Groq environment variables are configured before using proposal generation.

---

## Deployment

The current application is deployed as:

* **Frontend:** Vercel
* **Backend:** Railway

Live application:

[https://uw-proposal-builder.vercel.app/](https://uw-proposal-builder.vercel.app/)

---

## Engineering Challenges

### Retrieval Accuracy

A major challenge was ensuring that the system retrieved the right portfolio evidence for a specific client brief.

Pure semantic search was not always sufficient because technically similar projects could still differ in important requirements.

The solution was a hybrid retrieval approach combining semantic similarity, technology/functionality tag overlap, and industry matching.

### Avoiding Hallucinated Portfolio Claims

An LLM can produce convincing but unsupported claims when it does not have enough factual context.

The system therefore separates factual portfolio retrieval from tone retrieval and uses strict prompt instructions to prevent invented projects, technologies, metrics, URLs, or experience.

### Tone Matching

A proposal can contain technically correct information while still sounding unlike the company's existing proposals.

To address this, six curated past proposals were stored separately and the most relevant example is retrieved dynamically as a style reference.

### Data Synchronization

Because portfolio information can change through the admin panel, the MongoDB records and Pinecone vectors need to remain synchronized.

Create, update, and delete operations therefore trigger corresponding Pinecone synchronization.

---

## Project Outcome

The result is a fully functional proposal-generation platform that turns an Upwork client brief into a grounded proposal draft through a combination of:

* React
* Node.js
* Express
* MongoDB
* Pinecone
* Groq
* Semantic retrieval
* Hybrid scoring
* Prompt engineering
* Tone matching

The application was deployed to the cloud and made available through a ChatGPT-style interface with an administrative portfolio-management system.

---

## Collaboration

This project was developed collaboratively during our internship at **DevNauts**.

I worked with **Ahmad Bilal** on the implementation, testing, debugging, and integration of the system.

The project involved working across frontend development, backend services, retrieval architecture, AI integration, prompt engineering, and deployment.

---

## Key Takeaways

The most important lesson from this project was that building a useful LLM application is not just about generating text.

The quality of the final output depends heavily on:

1. Providing the model with the right information.
2. Retrieving relevant evidence.
3. Separating factual knowledge from stylistic examples.
4. Controlling unsupported claims.
5. Designing prompts around the actual business workflow.

The project provided practical experience in building an end-to-end AI-powered product around RAG, vector search, LLM integration, and full-stack development.

---

## License

This project was developed as an internal internship project for DevNauts.

```

