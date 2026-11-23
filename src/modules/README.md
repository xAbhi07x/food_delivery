# Domain modules

Application logic is organised by domain module (SRS §7.3), not by technical layer.
Each module owns its logic and exposes a small interface. Route files and components
stay thin and call into modules.

Modules are created in the phase that needs them. Do not add empty ones ahead of time.
**`auth` exists (Phase 2).** The rest are planned:

| Module          | Planned phase |
| --------------- | ------------- |
| `auth`          | 2             |
| `catalog`       | 3             |
| `customisation` | 3             |
| `cart`          | 4             |
| `checkout`      | 4             |
| `orders`        | 4             |
| `riders`        | 5             |
| `assignment`    | 5             |
| `notifications` | 5             |
| `tracking`      | 7             |
| `admin`         | 3, 8          |
| `reporting`     | 8             |

Shared, non-domain code lives in `src/lib/` (environment validation, utilities, generated
database types). Reusable UI primitives live in `src/components/ui/` (shadcn/ui).
