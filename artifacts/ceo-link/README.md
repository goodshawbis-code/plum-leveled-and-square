# CEO-Link Pod: Best of Both Merger

## Architecture
This module merges the Neural Masonry Count AI engine and Labor Force Sync hooks
from the Plumb Leveled & Square vault into the CEO-Link production pod.

### Multi-Target Support
- **iPad**: Construction Control Center (split-panel, 320px sidebar)
- **iPhone**: Responsive mobile-first layout with touch-optimized controls
- **Watch**: Foreman Watch companion (3-screen overview/crew/progress)

### Color Palette (Preserved)
- Solid Gold: `#D4A84B`
- Navy: `#14181B`
- Navy Light: `#1C2127`

### AI Engine
- Neural Masonry Count: CMU, Brick, Stone calculations with Oregon regional pricing
- Material presets with configurable waste percentages
- Opening deductions for doors/windows

### Labor Force Sync
- Real-time segment tracking (pending → in_progress → completed)
- Crew assignment and status monitoring
- Field notes and photo upload hooks
- Blueprint-scoped segment management

### 3-Second UI Buffer
The `copilot` health endpoint verifies zero startup conflicts and confirms
the 3-second initialization buffer is respected across all targets.

### Endpoints
- `GET /api/masonry/presets` - All material presets
- `POST /api/masonry/calc/cmu` - CMU block calculation
- `POST /api/masonry/calc/brick` - Brick calculation
- `POST /api/masonry/calc/stone` - Stone calculation
- `GET /api/blueprints/:id/segments` - List segments
- `POST /api/blueprints/:id/segments` - Create segment
- `GET /api/segments/:id` - Get segment
- `PATCH /api/segments/:id` - Update segment
- `PATCH /api/segments/:id/field` - Update field data
- `DELETE /api/segments/:id` - Delete segment
- `GET /api/crew` - List crew
- `GET /api/health/copilot` - Copilot verification
