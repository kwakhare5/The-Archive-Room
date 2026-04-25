# 🏛️ The Archive Room (Memory Palace UI)

> **A Spatial Second Brain.** Stop organizing by lists. Start remembering by location.

![Archive Room Demo](./public/archive-room-preview.png)

*Transform abstract knowledge into a physical, spatial workspace using the Method of Loci. Built for high-utility visual productivity.*

## 🌟 The Vision

The Archive Room is not a game or a simulation—it is a **High-Utility Visual Productivity System**. Human memory evolved to remember *places* better than *lists*. This project exploits spatial encoding to allow users to anchor digital information (PDFs, Notes, Links) to specific physical coordinates in a 2D virtual office. 

Retrieving information becomes a matter of "walking" to it, triggering stronger neural recall than clicking through nested folders. It is the Visual Notion—a workspace that remembers where you put your ideas so you don't have to.

## 🚀 Tech Stack (The Elite Standard)

- **Frontend Core**: Next.js 14 (App Router) + TypeScript
- **Rendering Engine**: Custom 2D Canvas Matrix Engine (`ArchiveEngine`)
- **State & Bridge**: `apiBridge.ts` syncing with FastAPI (Python) backend
- **Styling**: Tailwind CSS v4 + Framer Motion (Micro-animations)
- **Pathfinding**: Optimized A* multi-tile navigation algorithms

## 🏗️ Architectural Deep Dive

The Archive Room operates on a **Feature-Based Domain-Driven Architecture**, designed for scale to handle 10,000+ DAU without thread blocking.

### The Facade Pattern: `ArchiveEngine`
To prevent monolithic memory leaks and logic entanglement, the spatial rendering layer has been strictly decomposed:
1. **`LayoutManager`**: Handles all furniture grid mapping, placement validation, and collision boundaries.
2. **`CharacterManager`**: Controls agent state, autonomous routing, matrix despawn effects, and hit-detection.
3. **`CameraManager`**: Orchestrates viewport transformations, screen-to-world math, and smooth target tracking.

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
