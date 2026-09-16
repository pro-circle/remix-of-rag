# Remix of RAG

Build an Enterprise-Grade Advanced RAG Application

Build a production-quality Advanced Retrieval-Augmented Generation (RAG) web application for querying user-provided PDF, DOCX, and TXT documents.

The application must be more than a basic “upload → embeddings → LLM” RAG demo. It must visibly demonstrate the complete retrieval pipeline:

Document → Parsing → Cleaning → Structural Analysis → Semantic Chunking → Embeddings → Hybrid Retrieval → Reranking → Context Selection → LLM Generation → Citations → Token Usage + Latency

The UI should make the retrieval process understandable and observable.

1. Core Goal

Create a simple but technically advanced RAG system where a user can:

Open the application.

See preloaded sample documents.

Upload PDF, DOCX, or TXT files.

View the uploaded document in the dashboard.

Ask questions about the selected knowledge base.

Watch the retrieval workflow.

Inspect which document chunks were retrieved.

See reranking scores.

See the final context supplied to the LLM.

Receive a cited answer.

See token consumption for every query.

See latency and retrieval statistics.

Choose between gpt-oss-20b and gpt-oss-120b.

Stream the final answer to the UI.

The application should have a clean, modern, professional interface without unnecessary visual complexity.

2. Required Technology Stack

Backend

Use:

Python 3.11+

FastAPI

Uvicorn

Pydantic

python-multipart

httpx

Document Processing

Use:

pypdf for PDF extraction

python-docx for DOCX extraction

Python standard library for TXT

Design the document ingestion layer so another parsing library can be added later.

Embeddings

Use a local/open-source embedding model through sentence-transformers.

The embedding implementation must be isolated behind an interface such as:

class EmbeddingProvider:
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        ...

    def embed_query(self, text: str) -> list[float]:
        ...


Do not hard-code embedding logic into retrieval code.

Vector Database

Use ChromaDB initially.

The vector database layer must also use an abstraction:

class VectorStore:
    def add_documents(...):
        ...

    def search(...):
        ...

    def delete_document(...):
        ...

    def get_document_chunks(...):
        ...


This should make it possible to replace ChromaDB with another vector database later.

Lexical Search

Implement BM25 lexical retrieval.

Use a suitable Python BM25 library such as rank-bm25.

Reranking

Implement cross-encoder reranking using a Sentence Transformers-compatible reranker such as:

BAAI/bge-reranker-large


Make the reranker configurable through environment variables.

LLM

Use Groq's API.

Support:

openai/gpt-oss-20b
openai/gpt-oss-120b


Do not hard-code the API key.

Read:

GROQ_API_KEY=
GROQ_MODEL_20B=openai/gpt-oss-20b
GROQ_MODEL_120B=openai/gpt-oss-120b


The exact currently supported Groq model identifiers should be configurable rather than embedded throughout the code.

Frontend

Use:

HTML5

CSS3

Vanilla JavaScript

Do not require React or another frontend framework for this version.

Use responsive CSS.

The UI should work on desktop and tablet.

3. Environment Configuration

Create:

.env


with:

GROQ_API_KEY=

GROQ_MODEL_20B=openai/gpt-oss-20b
GROQ_MODEL_120B=openai/gpt-oss-120b

EMBEDDING_MODEL=
RERANKER_MODEL=

CHROMA_PATH=./data/chroma

UPLOAD_DIR=./data/uploads
PROCESSED_DIR=./data/processed

TOP_K_VECTOR=30
TOP_K_BM25=30
TOP_K_RERANK=8

SEMANTIC_THRESHOLD_PERCENTILE=95


Create:

.env.example


with the same variable names but no secrets.

Never expose API keys to the browser.

4. Application Architecture

Implement the system using these layers:

Browser UI
   ↓
FastAPI
   ↓
API Layer
   ↓
RAG Orchestrator
   ├── Query Analyzer
   ├── Hybrid Retriever
   ├── Reranker
   ├── Context Builder
   └── LLM Generator
   ↓
Storage / Model Services


For ingestion:

Upload
   ↓
File Type Detection
   ↓
Document Parser
   ↓
Text Cleaning
   ↓
Structure Detection
   ↓
Semantic Chunking
   ↓
Metadata Generation
   ↓
Embedding
   ↓
ChromaDB
   +
BM25 Index


5. Supported Documents

Support:

.pdf
.docx
.txt


Reject unsupported extensions with a clear UI error.

Maximum upload size should be configurable.

Validate:

file extension

MIME type where available

file size

empty documents

unreadable documents

Never trust only the filename extension.

6. Document Ingestion Pipeline

Create separate parsers:

backend/app/ingestion/
    pdf_parser.py
    docx_parser.py
    txt_parser.py
    cleaner.py
    structure.py


Each parser should return a normalized internal representation.

Example:

DocumentPage(
    page_number=1,
    text="...",
    sections=[],
    tables=[],
)


For DOCX:

Extract:

headings

paragraphs

tables

lists where reasonably possible

For PDF:

Extract:

page number

text

detected headings where possible

Attempt to reduce common PDF extraction problems:

repeated headers

repeated footers

excessive whitespace

broken line wrapping

repeated page numbers

Do not aggressively alter original document meaning.

Preserve page/section metadata.

7. Document Structure

Build a hierarchical representation:

Document
 ├── Page
 │    ├── Section
 │    │     ├── Paragraph
 │    │     └── Table
 │    └── ...
 └── ...


Every final chunk must contain metadata such as:

{
  "document_id": "doc_001",
  "document_name": "security_policy.pdf",
  "chunk_id": "chunk_023",
  "page": 14,
  "section": "4.2 Authentication",
  "parent_section": "Security",
  "chunk_type": "paragraph",
  "token_count": 384
}


8. Semantic Chunking

Do not use only fixed-size chunking.

Implement semantic chunking based on sentence embedding similarity/distance.

Process:

Document
 ↓
Paragraphs
 ↓
Sentences
 ↓
Sentence embeddings
 ↓
Consecutive semantic distance
 ↓
Boundary detection
 ↓
Semantic chunks


Use percentile-based thresholding as the initial implementation.

The threshold must be configurable.

Do not blindly split every document at the same threshold.

Also enforce safety limits:

minimum chunk length

maximum token/chars per chunk

optional overlap

prevent huge chunks

preserve paragraph/section boundaries where possible

The chunker should favor coherent ideas.

Example:

Definition
+
Explanation
+
Supporting details


should ideally remain together.

9. Chunk Metadata

Each chunk stored in the vector database must include:

{
  "document_id": "...",
  "document_name": "...",
  "chunk_id": "...",
  "page": 10,
  "section": "...",
  "parent_section": "...",
  "chunk_type": "...",
  "position": 12,
  "token_count": 342
}


Do not store only the raw text.

Metadata must be used for citations and UI retrieval visualization.

10. Embeddings

Create an embedding service.

Example:

class LocalEmbeddingProvider:
    def embed_documents(self, texts):
        ...

    def embed_query(self, text):
        ...


Batch embeddings when possible.

Normalize vectors where appropriate for the selected similarity metric.

Store embeddings in ChromaDB.

Do not regenerate embeddings for unchanged chunks unnecessarily.

11. Hybrid Retrieval

Do NOT use vector search alone.

Implement:

Dense Vector Retrieval
+
BM25 Retrieval
↓
Candidate Fusion
↓
Deduplication
↓
Reranking


Initial retrieval:

Vector search → top 30
BM25 search   → top 30


Combine candidates.

Use a simple configurable fusion strategy such as reciprocal rank fusion.

Example:

Vector candidates
BM25 candidates
      ↓
RRF
      ↓
30–50 unique candidates


Deduplicate identical chunks.

12. Query Analyzer

Before retrieval, create a lightweight query-analysis step.

The query analyzer should determine:

intent

keywords

possible entities

whether comparison is needed

whether multiple sections may be required

estimated retrieval depth

expected answer type

Example result:

{
  "intent": "fact_extraction",
  "keywords": [
    "authentication",
    "security risks"
  ],
  "multi_hop": false,
  "retrieval_depth": 5,
  "answer_style": "explanation"
}


The analyzer can use deterministic heuristics initially.

Do not force an LLM call for every trivial query if it is unnecessary.

13. Dynamic Retrieval Depth

Do not always return exactly 3 chunks.

Use dynamic selection.

Example:

Simple question       → 3–4 chunks
Normal question       → 5–6 chunks
Multi-hop question    → 8–12 chunks


Make these values configurable.

14. Cross-Encoder Reranking

After hybrid retrieval:

Candidate Pool
      ↓
Cross Encoder
      ↓
Score Every Candidate
      ↓
Sort Descending
      ↓
Top N


Return:

{
  "chunk_id": "...",
  "rerank_score": 0.91
}


The UI must display the reranking score.

Make the model configurable.

15. Context Selection

Do not blindly send the full retrieved chunks.

Create a context builder.

The context builder should:

remove duplicates

prioritize top-ranked chunks

preserve document structure

enforce a context budget

keep source metadata

optionally perform contextual compression

The selected context should be traceable back to its original chunks.

16. Prompt Construction

Use a strong RAG system prompt.

The model must:

answer using supplied context

avoid unsupported claims

explicitly say when information is unavailable

distinguish document facts from inference

cite sources

avoid pretending to have read content that was not retrieved

Example source format:

[Source 1]
Document: security_policy.pdf
Page: 14
Section: 4.2 Authentication
Chunk ID: chunk_104
Content:
...


Then instruct the model to cite:

[1]
[2]


The backend should map citations back to the corresponding metadata.

17. Hallucination Protection

If retrieved evidence is insufficient:

Return something such as:

I could not find sufficient evidence in the uploaded documents to answer this reliably.


Do not fabricate a document citation.

Implement a configurable relevance threshold.

18. Groq Generation

Create:

backend/app/models/groq_client.py


Support:

gpt-oss-20b
gpt-oss-120b


The user can manually select:

Fast
Reasoning


or the actual model name.

The UI should display the selected model.

Implement streaming response support using FastAPI streaming/SSE.

The answer should progressively appear in the UI.

19. Token Consumption

This is a REQUIRED feature.

For every query, capture and display token usage.

Track:

Query Tokens
System Prompt Tokens
Retrieved Context Tokens
LLM Input Tokens
LLM Output Tokens
Total LLM Tokens


Where the provider/API exposes authoritative token usage, use that actual value.

For application-side components where provider usage is unavailable, use a tokenizer or clearly label the number as an estimate.

Never present an estimate as an authoritative provider-reported count.

20. Token Usage UI

Add a Query Usage panel.

Example:

┌───────────────────────────────┐
│ Query Usage                   │
├───────────────────────────────┤
│ Query tokens          42      │
│ Context tokens      2,936     │
│ Input tokens        3,114     │
│ Output tokens         642     │
│ Total tokens        3,756     │
│                               │
│ Model: gpt-oss-120b           │
└───────────────────────────────┘


Also display:

Latency
Retrieval latency
Reranking latency
LLM latency
Total latency


21. Session Usage

Show aggregate session statistics.

Example:

Session Usage

Queries:       12
Total tokens:  38,421
Avg/query:      3,201


Update automatically after every query.

Persist these statistics only for the current application session unless persistent analytics are explicitly implemented.

22. Retrieval Visualization

The UI MUST visibly show the retrieval workflow.

Example:

Question
   ↓
Query Analysis
   ↓
Vector Search
   ↓
BM25 Search
   ↓
Hybrid Fusion
   ↓
Reranking
   ↓
Top Chunks
   ↓
Context
   ↓
LLM
   ↓
Answer


Each stage should have:

status

duration

counts where useful

Example:

Vector Search       ✓ 30 candidates
BM25 Search         ✓ 30 candidates
Hybrid Fusion       ✓ 42 unique
Reranking           ✓ 42 → 8
Context Builder     ✓ 5 chunks
Generation          ✓ streaming


23. Retrieved Content Pane

Create a pane showing retrieved chunks.

For every selected chunk display:

Document
Page
Section
Chunk ID
Vector/BM25 relevance
Reranker score
Token count


Example:

security_policy.pdf
Page 14
§4.2 Authentication

Reranker score: 0.91
Tokens: 284

"...retrieved content..."


Allow expanding/collapsing each chunk.

Highlight the most relevant chunks.

24. Document Preview

The dashboard must show uploaded documents.

For PDF:

show document name

page count

selectable page list

basic preview

page number associated with retrieved content

For DOCX/TXT:

render extracted text in a readable document pane

show section structure where available

Do not require a full complex document viewer for the MVP.

25. Main UI Layout

Create a clean dashboard approximately like:

┌────────────────────────────────────────────────────────────┐
│ Advanced RAG                                               │
│ Documents | Model | Session Tokens                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌────────────────┐  ┌────────────────────────────────────┐ │
│ │ Documents      │  │ Ask the knowledge base             │ │
│ │                │  │                                    │ │
│ │ 📄 policy.pdf  │  │ What are the authentication risks? │ │
│ │ 📄 guide.docx  │  │                                    │ │
│ │ 📄 notes.txt   │  │ [ Ask ]                            │ │
│ │                │  └────────────────────────────────────┘ │
│ │ [Upload]       │                                         │
│ └────────────────┘                                         │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ Retrieval Workflow                                         │
│                                                            │
│ Query → Search → Hybrid → Rerank → Context → LLM         │
│                                                            │
├─────────────────────────────┬──────────────────────────────┤
│ Retrieved Content           │ Answer                      │
│                             │                              │
│ Chunk 1                     │ Streaming answer...         │
│ Chunk 2                     │                              │
│ Chunk 3                     │ Sources [1] [2] [3]         │
│                             │                              │
├─────────────────────────────┴──────────────────────────────┤
│ Query Usage                                                 │
│ Input: 3114 | Output: 642 | Total: 3756 | 1.84 sec       │
└────────────────────────────────────────────────────────────┘


26. Model Selector

Add:

Model

○ gpt-oss-20b
○ gpt-oss-120b


Display a short description:

20B
Fast response / standard questions

120B
More reasoning capacity / complex questions


Do not make unsupported claims about benchmark superiority.

The backend must validate the selected model against the configured allowed model list.

27. API Endpoints

Implement at least:

GET  /
GET  /api/health

POST /api/documents/upload
GET  /api/documents
GET  /api/documents/{document_id}

DELETE /api/documents/{document_id}

POST /api/query
POST /api/query/stream

GET /api/query/{query_id}

GET /api/session/usage


The query request should support:

{
  "query": "What are the security risks?",
  "document_ids": ["doc_001"],
  "model": "openai/gpt-oss-120b"
}


28. Query Response Schema

Return structured information.

Example:

{
  "query_id": "q_001",
  "answer": "...",
  "citations": [
    {
      "index": 1,
      "document": "security_policy.pdf",
      "page": 14,
      "section": "4.2 Authentication",
      "chunk_id": "chunk_104"
    }
  ],
  "retrieval": {
    "vector_candidates": 30,
    "bm25_candidates": 30,
    "hybrid_candidates": 42,
    "reranked": 8,
    "selected_context": 5
  },
  "usage": {
    "query_tokens": 42,
    "context_tokens": 2936,
    "input_tokens": 3114,
    "output_tokens": 642,
    "total_tokens": 3756
  },
  "latency": {
    "retrieval_ms": 120,
    "rerank_ms": 340,
    "llm_ms": 1380,
    "total_ms": 1840
  },
  "model": "openai/gpt-oss-120b"
}


29. Streaming

Use Server-Sent Events or another simple HTTP streaming mechanism.

Stream events such as:

query_started
query_analyzed
vector_search_complete
bm25_search_complete
hybrid_search_complete
reranking_complete
context_built
generation_started
token
generation_complete
usage
query_complete


The frontend must update the workflow visualization as events arrive.

30. Error Handling

Handle:

invalid uploads

oversized files

corrupted documents

parser failures

embedding failures

vector DB failures

reranker failures

Groq API failures

model unavailable

rate limits

timeouts

malformed LLM responses

Never expose raw API keys, stack traces, or secrets.

Show readable errors to the user.

Log detailed errors on the backend.

31. Logging and Observability

Use structured backend logging.

Every query should have:

request_id
query_id
timestamp
document_ids
model
retrieval counts
token usage
latency
error status


Do not log sensitive document content unnecessarily.

32. Security

Implement basic production security practices:

API keys only in environment variables

no keys in frontend JavaScript

validate uploads

restrict accepted extensions

configurable maximum upload size

sanitize filenames

store uploads outside executable directories

prevent path traversal

never execute uploaded files

validate API inputs with Pydantic

avoid leaking source file contents into logs

do not expose internal server paths to users

33. Storage

Use:

data/
├── uploads/
├── processed/
└── chroma/


Store document metadata separately from raw upload data when necessary.

For MVP, simple local persistence is acceptable.

Do not introduce a relational database unless necessary.

Design interfaces so PostgreSQL or another persistent store can be added later.

34. Sample Data

Include at least 2–3 fictional sample documents for demonstration.

They must contain no real personal information.

Use realistic technical content such as:

Security Policy
Developer Handbook
System Architecture Guide


Make them rich enough to demonstrate:

semantic retrieval

exact keyword retrieval

multi-section questions

citations

reranking

comparison queries

The sample documents should be included in a clearly identified sample-data directory.

35. Example Queries

Include example query buttons:

What are the main authentication requirements?

What security risks are mentioned?

Which sections discuss access control?

Compare authentication and authorization requirements.

What does the document say about incident response?

Summarize the security recommendations.


Clicking an example should populate the query box.

36. Advanced Query Example

The system should support questions such as:

Compare the authentication requirements with the incident-response requirements and identify any relationship between them.


The retrieval system should be able to retrieve relevant chunks from multiple sections.

37. UI Design

Use a professional enterprise-style visual design.

Recommended:

dark navy / blue-gray base

white cards

subtle blue accents

clean typography

compact information panels

clear status badges

restrained animations

Avoid:

excessive gradients

oversized decorative graphics

unnecessary dashboards

huge cards

excessive colors

clutter

The application is a technical RAG observability tool.

The retrieval process should be visually clear.

38. Loading States

Display:

Uploading...
Parsing...
Analyzing structure...
Chunking...
Generating embeddings...
Indexing...
Ready


For queries:

Analyzing query...
Searching vectors...
Searching keywords...
Merging candidates...
Reranking...
Building context...
Generating answer...


39. Performance

Use batching where possible.

Do not regenerate embeddings unnecessarily.

Cache reusable document processing where appropriate.

Avoid repeated model loading.

Load embedding and reranker models once during application startup.

Reuse HTTP connections for Groq requests.

Avoid blocking the FastAPI event loop with unnecessary synchronous work.

Where local model inference is CPU-heavy, isolate appropriately.

40. Code Organization

Use clean separation of responsibilities.

Example:

backend/
└── app/
    ├── main.py
    ├── config.py
    ├── api/
    ├── ingestion/
    ├── chunking/
    ├── embeddings/
    ├── retrieval/
    ├── reranking/
    ├── reasoning/
    ├── llm/
    ├── storage/
    ├── schemas/
    └── utils/


Do not put the entire application into one Python file.

41. Interfaces

Use interfaces/protocols for:

DocumentParser
EmbeddingProvider
VectorStore
LexicalRetriever
Reranker
LLMProvider


This must allow future replacement of:

ChromaDB
embedding model
reranker
Groq


without rewriting the complete application.

42. Testing

Include tests for:

Parsing

PDF parsing

DOCX parsing

TXT parsing

Chunking

semantic split detection

minimum/maximum chunk limits

metadata preservation

Retrieval

vector search

BM25

hybrid fusion

deduplication

Reranking

score ordering

top-N selection

Query

citation mapping

insufficient-context behavior

token accounting

Security

invalid file types

oversized upload

path traversal attempts

43. README

Create a complete README containing:

Project overview
Architecture
Tech stack
Installation
Environment setup
How to run
How to add documents
How retrieval works
How semantic chunking works
How hybrid retrieval works
How reranking works
How token usage is calculated
How citations work
API documentation
Troubleshooting
Future enhancements


Include a simple architecture diagram in ASCII or Mermaid.

44. Future-Ready Architecture

Do not implement all of these now, but structure the code so they can be added later:

Query rewriting
HyDE
Multi-query retrieval
Parent-child retrieval
Knowledge graph retrieval
Agentic retrieval
Conversation memory
Document-level access control
PostgreSQL
Redis
Object storage
Observability dashboards
RAG evaluation
Faithfulness scoring
Answer quality scoring


Do not add these features merely to make the code larger.

The current version should remain understandable and maintainable.

45. Important RAG Principles

Follow these principles:

Retrieval quality is more important than prompt length.

Preserve document structure.

Preserve source metadata.

Use hybrid retrieval.

Rerank candidates.

Dynamically select context size.

Never fabricate citations.

Track token usage.

Track latency.

Make the entire RAG process observable.

46. Final User Experience

A user should be able to understand the entire query lifecycle visually:

USER QUESTION
     ↓
QUERY ANALYSIS
     ↓
VECTOR SEARCH
     +
BM25 SEARCH
     ↓
HYBRID FUSION
     ↓
CROSS-ENCODER RERANKING
     ↓
TOP RELEVANT CHUNKS
     ↓
CONTEXT BUILDER
     ↓
GROQ / GPT-OSS
     ↓
STREAMING ANSWER
     ↓
CITATIONS
     +
TOKEN USAGE
     +
LATENCY


The application must feel like a real Advanced RAG engineering system, not a simple chatbot.

47. Deliverables

Generate the complete runnable project.

Provide:

backend source
frontend source
requirements.txt
.env.example
sample documents
tests
README
startup instructions


The generated application must run locally with:

pip install -r requirements.txt
uvicorn app.main:app --reload


or an equivalent clearly documented command.

Do not leave major functionality as pseudocode.

Implement the complete ingestion, indexing, hybrid retrieval, reranking, context construction, Groq generation, streaming, citations, token usage tracking, latency tracking, and UI visualization.

Prioritize a working end-to-end system over unnecessary extra features.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/24ea7938-bf43-4073-b06e-0e70398fb9d4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
