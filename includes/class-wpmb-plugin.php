<?php
declare(strict_types=1);

class WPMB_Plugin
{
    private static ?WPMB_Plugin $instance = null;

    private ?WPMB_CPT $cpt = null;

    private ?WPMB_Admin $admin = null;

    private ?WPMB_Frontend $frontend = null;

    private ?WPMB_Assets $assets = null;

    private ?WPMB_Options $options = null;

    private ?WPMB_Blocks $blocks = null;

    private function __construct()
    {
    }

    public static function instance(): self
    {
        if (null === self::$instance) {
            self::$instance = new self();
        }

        return self::$instance;
    }

    public function init(): void
    {
        $this->cpt     = new WPMB_CPT();
        $this->admin   = new WPMB_Admin();
        $this->options = new WPMB_Options();
        $this->assets  = new WPMB_Assets($this->options);
        $this->frontend = new WPMB_Frontend($this->assets);
        $this->blocks   = new WPMB_Blocks();

        $this->init_hooks();
    }

    private function init_hooks(): void
    {
        add_action('init', [$this->cpt, 'register']);
        add_action('init', [$this->frontend, 'register_shortcodes']);
        add_action('init', [$this->blocks, 'register']);

        if (is_admin()) {
            add_action('add_meta_boxes', [$this->admin, 'register_meta_boxes']);
            add_action('save_post_' . WPMB_CPT::POST_TYPE, [$this->admin, 'save_post'], 10, 2);

            add_action('admin_enqueue_scripts', [$this->assets, 'enqueue_admin_assets']);
            add_action('enqueue_block_editor_assets', [$this->assets, 'enqueue_block_editor_assets']);
            add_action('admin_menu', [$this->options, 'add_settings_page']);
            add_action('admin_init', [$this->options, 'register_settings']);

            add_action('wp_ajax_wpmb_get_meta_keys', [$this->admin, 'ajax_get_meta_keys']);
        }

        add_action('wp_enqueue_scripts', [$this->assets, 'enqueue_public_assets']);
    }
}

