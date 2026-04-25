# 🏛️ The Archive Room: Product Vision & Specification
**Mission**: Transforming Abstract Knowledge into a Spatial Second Brain.
**Motto**: "Spatial Knowledge Mastery"

---

## 🛑 Project Identity: THE NON-GAME VETO
This project is NOT a simulation, a game, or a toy. It is a **High-Utility Visual Productivity System.**
The goal is to build a **Visual Memory Palace** where users organize, store, and retrieve real-world information spatially. 

> "It is the Visual Notion—a workspace that remembers where you put your ideas so you don't have to."

---

## 1. The Method: Spatial Encoding (Method of Loci)
Human memory is evolved to remember **Places** better than **Lists**. 
*   **The Archive Room** exploits this by allowing users to "anchor" digital information (PDFs, Notes, Links) to specific physical coordinates in a 2D virtual office.
*   **Retrieval** becomes a matter of "walking" to the information, which triggers stronger neural recall than clicking through nested folders.

---

## 2. Functional Ecosystem

### 📚 The Knowledge Archives (Bookshelves)
*   **Role**: The Persistent Data Layer.
*   **Mechanism**: Each bookshelf is a "bucket" for related information. 
*   **Features**:
    *   **Drag-and-Drop Planting**: Drop a file onto a shelf to associate it with that location.
    *   **Visual Indexing**: Hovering shows a manifest of stored snippets.
    *   **The Librarian**: An agent tasked with fetching specific data from these archives when queried.

### 📝 The Synthesis Canvas (Whiteboard)
*   **Role**: The Logic & Reasoning Layer.
*   **Mechanism**: A workspace for "Active Thought."
*   **Features**:
    *   **Knowledge Linking**: Visually connect two notes from different shelves to create a new insight.
    *   **AI Brainstorming**: The "Analyst" agent uses the whiteboard to sketch plans, mind maps, or code architectures derived from your archives.

### 💻 The Output Terminal (PC Desks)
*   **Role**: The Execution Layer.
*   **Mechanism**: The bridge to your real-world files/clipboard.
*   **Features**:
    *   **Drafting Station**: The final result of a "Research + Think" sequence is typed here.
    *   **Live Sync**: Direct integration with local `.md` or `.ts` files.

---

## 3. The Specialist Team (Utility Agents)
Agents are not "NPCs"; they are **Background Workers** that handle your data:
1.  **Librarian (Retrieval Specialist)**: Optimized for fast searching of the "Archives."
2.  **Analyst (Reasoning Specialist)**: Optimized for summarizing and "Whiteboarding" complex tasks.
3.  **Executor (Production Specialist)**: Optimized for "PC Desk" tasks like code generation and drafting.

---

## 🛠️ Technical Implementation Strategy

### A. The Data Nexus (Storage)
*   **Local-First**: All "Planted" knowledge is stored in a local `knowledge_map.json`. 
*   **Privacy**: Your notes never leave your machine unless you explicitly connect a cloud LLM.
*   **Structure**: `{"furniture_uid": "shelf_01", "notes": [{"id": "1", "content": "...", "source": "local_file.md"}]}`

### B. The Spatial Bridge (Control)
*   **Event-Driven**: The UI sends events like `FURNITURE_CLICKED` to the backend.
*   **Instructional AI**: The backend (Python/Node) processes the user query and sends back a sequence of **Spatial Commands**:
    1. `WALK_TO(shelf_A)`
    2. `READ_NOTE(note_01)`
    3. `WALK_TO(whiteboard_B)`
    4. `SYNTHESIZE(summary_01)`

---

## 📅 High-Utility Roadmap

### Phase 1: The "Planting" Engine (High Priority)
*   **Visual File Mapping**: UI for attaching notes to shelves.
*   **Persistence**: Saving/Loading the Knowledge Map from disk.
*   **Inspector HUD**: A side-panel to view and edit notes inside a selected bookshelf.

### Phase 2: Spatial Intelligence
*   **Glow-Search**: Typing a keyword highlights the correct bookshelf in the room.
*   **Multi-Agent Coordination**: Seeing the "Librarian" and "Analyst" work together on a single query.

### Phase 3: Total Workspace Integration
*   **VS Code Mirroring**: Seeing your active file status reflected in the room.
*   **Web Clipping**: A browser extension that "shoots" a website directly into a bookshelf.

---

## 📖 A Day in the Life (How you will use it)

1.  **Morning (Planting)**: You read an interesting article. You drag the link onto your "Ideas" bookshelf. An agent walks over and "stores" it.
2.  **Afternoon (Researching)**: You need to remember that idea. You type a keyword. The camera zooms to the bookshelf, and the Librarian pulls out the note for you.
3.  **Evening (Synthesizing)**: You ask the room to summarize all your "Idea" notes. The Librarian gathers them, the Analyst goes to the Whiteboard to create a summary, and the Executor sits at the PC to draft your final blog post.

**Simple Goal**: Turn your computer screen from a mess of windows into a calm, organized room where you know exactly where everything is.
