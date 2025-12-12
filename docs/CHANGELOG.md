# Changelog

## [0.5.0] - 2025-12-12

### Added
- Multi-platform deployment support (Cloudflare Pages, Vercel, Netlify)
- ModelScope provider integration
- Provider-first model selection with per-provider token storage
- API usage examples (cURL, JavaScript, Python) in documentation

### Changed
- Updated deployment configurations for all platforms
- Enhanced API documentation with multi-provider support
- Improved README with deployment badges

### Fixed
- Cloudflare Pages Functions configuration
- Vercel Edge Functions timeout documentation
- Various TypeScript import issues

## [0.4.1] - 2025-12-09

### Changed
- Renamed project to "Zenith Image Generator"
- Restructured README for cleaner presentation
- Moved technical details to dedicated docs
  - `docs/DEPLOYMENT.md` - Deployment guides
  - `docs/API.md` - API reference and security
- Added `CONTRIBUTING.md` with local development guide
- Added LAN access documentation for multi-device testing

## [0.4.0] - 2025-12-07

### Added
- Custom `useImageGenerator` hook for centralized state management
- Modular component architecture with feature-based organization
- Blur toggle state persistence to localStorage
- Project guidance documentation (`CLAUDE.md`)

### Changed
- **Major refactoring**: Split `ImageGenerator` into modular components
  - `Header` - App title and branding
  - `ApiConfigAccordion` - API provider and credentials
  - `PromptCard` - Prompt input and generation settings
  - `ImageResultCard` - Image display with floating toolbar
  - `StatusCard` - Generation status and progress
- Extracted constants and types to `lib/constants.ts`
- Reduced main component from 913 to 115 lines (87% reduction)
- Improved code maintainability and reusability

## [0.3.0] - 2025-12-06

### Added
- Multiple API providers: Gitee AI, HF Z-Image Turbo, HF Qwen Image
- HF Spaces API endpoints (`/api/generate-hf`, `/api/upscale`)
- 4x image upscaling via RealESRGAN
- Floating toolbar with blur, info, download, delete actions
- Image info panel showing size, API provider, upscale status
- HF Token support for extra quota

### Changed
- API provider dropdown with frosted glass effect (backdrop-blur)
- UHD switch styling improvements

## [0.2.0] - 2025-12-05

### Added
- Redesigned image generator UI
- Settings persistence to localStorage
- Last generated image persistence

### Changed
- UI polish for switch, slider and prompt textarea

## [0.1.0] - 2025-12-04

### Added
- Dark mode Gradio-style UI
- Text-to-image generation via Gitee AI API
- Multiple aspect ratio presets (1:1, 16:9, 9:16, 4:3, 3:4)
- Adjustable inference steps and dimensions
- AES-256-GCM encryption for API key storage
- Cloudflare Pages deployment support
- Chinese README documentation
