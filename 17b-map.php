<?php
declare(strict_types=1);

/**
 * Plugin Name: 17b Map - Mapbox Integration
 * Description: Plugin personnalisé pour gérer des cartes Mapbox via un Custom Post Type et les intégrer dans l’éditeur WordPress.
 * Author:      17b
 * Version:     0.1.0
 * Text Domain: 17b-map
 */

if (! defined('ABSPATH')) {
    exit;
}

define('WPMB_PLUGIN_FILE', __FILE__);
define('WPMB_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('WPMB_PLUGIN_URL', plugin_dir_url(__FILE__));
define('WPMB_PLUGIN_VERSION', '0.1.0');

require_once WPMB_PLUGIN_DIR . 'includes/class-wpmb-plugin.php';
require_once WPMB_PLUGIN_DIR . 'includes/class-wpmb-cpt.php';
require_once WPMB_PLUGIN_DIR . 'includes/class-wpmb-assets.php';
require_once WPMB_PLUGIN_DIR . 'includes/class-wpmb-options.php';
require_once WPMB_PLUGIN_DIR . 'includes/class-wpmb-blocks.php';
require_once WPMB_PLUGIN_DIR . 'admin/class-wpmb-admin.php';
require_once WPMB_PLUGIN_DIR . 'admin/class-wpmb-meta-boxes.php';
require_once WPMB_PLUGIN_DIR . 'public/class-wpmb-frontend.php';

if (! function_exists('wpmb_run_plugin')) {
    /**
     * Lance le plugin.
     */
    function wpmb_run_plugin(): void
    {
        $plugin = WPMB_Plugin::instance();
        $plugin->init();
    }
}

add_action('plugins_loaded', 'wpmb_run_plugin');

