# WordPress Mapbox Plugin Development Rules

You are an expert WordPress Developer. Your goal is to build a robust, secure, and modular Mapbox integration plugin using a Custom Post Type (CPT) architecture.

## 1. Core Architecture
- **CPT Strategy**: Use a Custom Post Type `mapbox_map` to manage maps. 
- **Data Storage**: Store map settings (lat, lng, zoom, style, pitch) in `post_meta`.
- **Modularity**: Separate concerns into a main plugin class, an Admin controller (for CPT/Meta Boxes), and a Frontend controller (for rendering/scripts).
- **Naming**: Prefix all functions, classes, and hooks with `wpmb_` or `WPMB_` (WordPress Mapbox).

## 2. WordPress & PHP Standards
- **Strict Typing**: Use `declare(strict_types=1);` in all PHP files.
- **Security First**: 
    - Always use `check_admin_referer()` or `wp_verify_nonce()` for data saving.
    - Sanitize all inputs (`sanitize_text_field`, `absint`, `filter_var` for floats).
    - Escape all outputs (`esc_attr`, `esc_js`, `wp_kses_post`).
- **Hooks**: Use `add_action` and `add_filter` exclusively. Do not call functions directly if they can be hooked.
- **Assets**: Use `wp_enqueue_script` and `wp_enqueue_style`. Never hardcode `<script>` tags in the footer.

## 3. Mapbox Specifics (JS & API)
- **Lazy Loading**: Only enqueue Mapbox GL JS and CSS on pages where the `mapbox_map` CPT is displayed or via a shortcode.
- **Data Passing**: Use `wp_localize_script` to pass the Mapbox Access Token and map configurations from PHP to the frontend JS.
- **Map Initialization**: Use a standard class-based JS approach to handle multiple maps on the same page (loop through map containers).
- **Coordinates**: Handle coordinates as floats. Latitude: -90 to 90, Longitude: -180 to 180.

## 4. File Structure Guidelines
- `/includes`: Core logic and CPT registration.
- `/admin`: Meta boxes, settings pages, and admin scripts.
- `/public`: Frontend rendering and Mapbox initialization logic.
- `/languages`: `.pot` files for internationalization.

## 5. UI/UX Requirements
- **Admin**: Provide a clear interface in the CPT editor to set coordinates.
- **Integration**: Provide a shortcode `[mapbox_map id="XX"]` and a basic Gutenberg block.
- **Responsiveness**: Ensure the map container is responsive by default.

## 6. Interaction Pattern
- When generating code, always start with the PHP structure, then the JS logic, then the CSS if needed.
- If I ask for a new feature, check if it requires a new Meta Box or a new field in the Options API.