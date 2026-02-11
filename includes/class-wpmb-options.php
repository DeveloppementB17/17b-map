<?php
declare(strict_types=1);

class WPMB_Options
{
    private const OPTION_KEY = 'wpmb_mapbox_access_token';

    public function add_settings_page(): void
    {
        add_submenu_page(
            'edit.php?post_type=' . WPMB_CPT::POST_TYPE,
            __('Réglages 17b Map', '17b-map'),
            __('Réglages', '17b-map'),
            'manage_options',
            'wpmb-settings',
            [$this, 'render_settings_page']
        );
    }

    public function register_settings(): void
    {
        register_setting(
            'wpmb_settings_group',
            self::OPTION_KEY,
            [
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                'default'           => '',
            ]
        );

        add_settings_section(
            'wpmb_main_section',
            __('Mapbox', '17b-map'),
            '__return_false',
            'wpmb-settings'
        );

        add_settings_field(
            'wpmb_mapbox_access_token',
            __('Mapbox Access Token', '17b-map'),
            [$this, 'render_token_field'],
            'wpmb-settings',
            'wpmb_main_section'
        );
    }

    public function render_token_field(): void
    {
        $token = get_option(self::OPTION_KEY, '');
        ?>
        <input
            type="text"
            class="regular-text"
            id="wpmb_mapbox_access_token"
            name="<?php echo esc_attr(self::OPTION_KEY); ?>"
            value="<?php echo esc_attr((string) $token); ?>"
        />
        <p class="description">
            <?php esc_html_e('Collez ici votre Mapbox Access Token (sk_ ou pk_).', '17b-map'); ?>
        </p>
        <?php
    }

    public function render_settings_page(): void
    {
        if (! current_user_can('manage_options')) {
            return;
        }
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('Réglages 17b Map', '17b-map'); ?></h1>
            <form action="options.php" method="post">
                <?php
                settings_fields('wpmb_settings_group');
                do_settings_sections('wpmb-settings');
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }

    public function get_token(): string
    {
        $token = get_option(self::OPTION_KEY, '');

        return is_string($token) ? $token : '';
    }
}

