# 🏛️ The Archive Room (Memory Palace UI)

> **A Spatial Second Brain.** Stop organizing by lists. Start remembering by location.

![Archive Room Demo](./public/archive-room-preview.png)

*Transform abstract knowledge into a physical, spatial workspace using the Method of Loci. Built for high-utility visual productivity.*

## 🌟 The Vision

The Archive Room is not a game or a simulation—it is a **High-Utility Visual Productivity System**. Human memory evolved to remember *places* better than *lists*. This project exploits spatial encoding to allow users to anchor digital information (PDFs, Notes, Links) to specific physical coordinates in a 2D virtual office. 

Retrieving information becomes a matter of "walking" to it, triggering stronger neural recall than clicking through nested folders. It is the Visual Notion—a workspace that remembers where you put your ideas so you don't have to.

## 🚀 Tech Stack (The Elite Standard)

- **Frontend Core**: Next.js 16 (App Router) + TypeScript 5
- **Intelligence**: Gemini 2.0 Flash (Native RAG-Ready Integration)
- **Architecture**: **Clean Architecture** (Strict separation of Domain, Infrastructure, and Adapters)
- **Rendering Engine**: Custom 60FPS HTML5 Canvas Matrix Engine (`ArchiveEngine`)
- **Styling**: Tailwind CSS v4 + Framer Motion (Glassmorphism & Micro-animations)
- **Performance**: Optimized BFS spatial indexing and multi-tile collision detection

## 🏗️ Architectural Deep Dive

The Archive Room has been hardened with a **Clean Architecture** (Onion Architecture) to ensure 99.9% logical stability and zero-drift maintenance.

### Layer Separation:
1. **Domain Layer (The Core)**: Pure business logic (Agent Physics, WorldState, Use Cases) decoupled from any external frameworks.
2. **Infrastructure Layer**: Concrete implementations for the Canvas Renderer, Game Loop, and VS Code/Browser Persistence.
3. **Adapter Layer (Orchestration)**: The `ArchiveEngine` serves as the primary system Controller, bridging UI events to domain use cases.

## 🛠️ Local Development Setup

1. **Clone & Install**
   ```bash
   git clone https://github.com/kwakhare5/The-Archive-Room.git
   cd The-Archive-Room
   npm install
   ```

2. **Environment Configuration**
   Ensure your local FastAPI backend is running on `http://127.0.0.1:8765`.
   *(Note: The UI will gracefully fallback to local mock data if the backend is unreachable via the `isBrowserRuntime` flag).*

3. **Run the Development Server**
   ```bash
   npm run dev
   ```

4. **Access the Palace**
   Navigate to `http://localhost:3000` to enter your spatial second brain.

## 🧹 Maintenance: The Purge Protocol

This project adheres to strict cleanliness standards. 
- **No Dead Code**: Unused assets or "temp" variables are aggressively purged.
- **Strict Naming**: Variables must describe their exact intent (`normalizedPayload` over `data`).
- **No God Classes**: Complex systems must be decomposed into typed managers.

## 📄 License
Proprietary & Confidential. All rights reserved.
