<?php
declare(strict_types=1);

class WPMB_Assets
{
    private WPMB_Options $options;

    public function __construct(WPMB_Options $options)
    {
        $this->options = $options;
    }

    public function enqueue_admin_assets(string $hook_suffix): void
    {
        if (! function_exists('get_current_screen')) {
            return;
        }

        $screen = get_current_screen();
        if (! $screen || WPMB_CPT::POST_TYPE !== $screen->post_type) {
            return;
        }

        wp_enqueue_style(
            'wpmb-admin',
            WPMB_PLUGIN_URL . 'public/css/admin.css',
            [],
            WPMB_PLUGIN_VERSION
        );

        wp_enqueue_script(
            'wpmb-admin',
            WPMB_PLUGIN_URL . 'public/js/admin.js',
            [],
            WPMB_PLUGIN_VERSION,
            true
        );

        $token = $this->options->get_token();

        $config = [
            'accessToken' => $token,
            'i18n'        => [
                'geocoderNoResults'   => __('Aucun résultat pour cette recherche.', '17b-map'),
                'geocoderError'       => __('Erreur lors de la recherche d’adresse. Réessaie plus tard.', '17b-map'),
                'geocoderMissingToken'=> __('Renseigne ton Mapbox Access Token dans les réglages du plugin pour utiliser la recherche d’adresse.', '17b-map'),
            ],
        ];

        wp_localize_script('wpmb-admin', 'wpmbAdminConfig', $config);
    }

    /**
     * Assets pour la prévisualisation des cartes dans l’éditeur de blocs.
     */
    public function enqueue_block_editor_assets(): void
    {
        // Charge les données pour toutes les cartes afin de permettre
        // un changement de sélection de carte en direct dans le bloc.
        $map_posts = get_posts(
            [
                'post_type'      => WPMB_CPT::POST_TYPE,
                'posts_per_page' => -1,
                'post_status'    => 'publish',
                'fields'         => 'ids',
            ]
        );

        if (empty($map_posts)) {
            return;
        }

        $maps = [];

        foreach ($map_posts as $map_id) {
            $map_id = (int) $map_id;

            $lat  = (float) get_post_meta($map_id, '_wpmb_lat', true);
            $lng  = (float) get_post_meta($map_id, '_wpmb_lng', true);

            if (0.0 === $lat && 0.0 === $lng) {
                continue;
            }

            $zoom           = (float) get_post_meta($map_id, '_wpmb_zoom', true);
            $style_url      = (string) get_post_meta($map_id, '_wpmb_style_url', true);
            $marker_enabled = '1' === get_post_meta($map_id, '_wpmb_marker_enabled', true);
            $marker_title   = (string) get_post_meta($map_id, '_wpmb_marker_title', true);
            $marker_text    = (string) get_post_meta($map_id, '_wpmb_marker_text', true);
            $marker_color   = (string) get_post_meta($map_id, '_wpmb_marker_color', true);

            $markers_raw = (string) get_post_meta($map_id, '_wpmb_markers', true);
            $markers     = [];

            if ('' !== $markers_raw) {
                $decoded = json_decode($markers_raw, true);
                if (is_array($decoded)) {
                    foreach ($decoded as $marker) {
                        $m_lat   = isset($marker['lat']) ? (float) $marker['lat'] : 0.0;
                        $m_lng   = isset($marker['lng']) ? (float) $marker['lng'] : 0.0;
                        $m_title = isset($marker['title']) ? (string) $marker['title'] : '';
                        $m_text  = isset($marker['text']) ? (string) $marker['text'] : '';
                        $m_color = isset($marker['color']) ? (string) $marker['color'] : '';

                        if (0.0 === $m_lat && 0.0 === $m_lng) {
                            continue;
                        }

                        $markers[] = [
                            'lat'   => $m_lat,
                            'lng'   => $m_lng,
                            'title' => $m_title,
                            'text'  => $m_text,
                            'color' => $m_color,
                        ];
                    }
                }
            }

            if ($zoom <= 0.0) {
                $zoom = 10.0;
            }

            if ('' === $style_url) {
                $style_url = 'mapbox://styles/mapbox/streets-v11';
            }

            $maps[$map_id] = [
                'id'     => $map_id,
                'lat'    => $lat,
                'lng'    => $lng,
                'zoom'   => $zoom,
                'style'  => $style_url,
                'marker' => [
                    'enabled' => $marker_enabled,
                    'title'   => $marker_title,
                    'text'    => $marker_text,
                    'color'   => $marker_color,
                ],
                'markers' => $markers,
            ];
        }

        if (empty($maps)) {
            return;
        }

        $token = $this->options->get_token();

        wp_enqueue_style(
            'mapbox-gl',
            'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css',
            [],
            '2.15.0'
        );

        wp_enqueue_script(
            'mapbox-gl',
            'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js',
            [],
            '2.15.0',
            true
        );

        wp_enqueue_style(
            'wpmb-public',
            WPMB_PLUGIN_URL . 'public/css/public.css',
            [],
            WPMB_PLUGIN_VERSION
        );

        // Styles d’admin (prévisualisation du bloc).
        wp_enqueue_style(
            'wpmb-admin',
            WPMB_PLUGIN_URL . 'public/css/admin.css',
            [],
            WPMB_PLUGIN_VERSION
        );

        wp_enqueue_script(
            'wpmb-editor-preview',
            WPMB_PLUGIN_URL . 'public/js/editor-preview.js',
            ['mapbox-gl'],
            WPMB_PLUGIN_VERSION,
            true
        );

        $config = [
            'accessToken' => $token,
            'maps'        => $maps,
        ];

        wp_localize_script('wpmb-editor-preview', 'wpmbEditorConfig', $config);
    }

    public function enqueue_public_assets(): void
    {
        if (! is_singular()) {
            return;
        }

        global $post;

        if (! $post instanceof WP_Post) {
            return;
        }

        $has_shortcode = has_shortcode($post->post_content, 'mapbox_map');
        $has_block     = function_exists('has_block') && has_block('wpmb/mapbox-map', $post);

        if (! $has_shortcode && ! $has_block) {
            return;
        }

        $map_id = 0;
        if ($has_shortcode && preg_match('/\[mapbox_map\s+[^]]*id="(\d+)"/', $post->post_content, $matches)) {
            $map_id = (int) $matches[1];
        } elseif ($has_block && preg_match('/"mapId":\s*(\d+)/', $post->post_content, $matches)) {
            $map_id = (int) $matches[1];
        }

        if ($map_id <= 0) {
            return;
        }

        $lat  = (float) get_post_meta($map_id, '_wpmb_lat', true);
        $lng  = (float) get_post_meta($map_id, '_wpmb_lng', true);
        $zoom           = (float) get_post_meta($map_id, '_wpmb_zoom', true);
        $style_url      = (string) get_post_meta($map_id, '_wpmb_style_url', true);
        $marker_enabled = '1' === get_post_meta($map_id, '_wpmb_marker_enabled', true);
        $marker_title   = (string) get_post_meta($map_id, '_wpmb_marker_title', true);
        $marker_text    = (string) get_post_meta($map_id, '_wpmb_marker_text', true);
        $marker_color   = (string) get_post_meta($map_id, '_wpmb_marker_color', true);

        $markers_raw = (string) get_post_meta($map_id, '_wpmb_markers', true);
        $markers     = [];

        if ('' !== $markers_raw) {
            $decoded = json_decode($markers_raw, true);
            if (is_array($decoded)) {
                foreach ($decoded as $marker) {
                    $m_lat   = isset($marker['lat']) ? (float) $marker['lat'] : 0.0;
                    $m_lng   = isset($marker['lng']) ? (float) $marker['lng'] : 0.0;
                    $m_title = isset($marker['title']) ? (string) $marker['title'] : '';
                    $m_text  = isset($marker['text']) ? (string) $marker['text'] : '';
                    $m_color = isset($marker['color']) ? (string) $marker['color'] : '';

                    if (0.0 === $m_lat && 0.0 === $m_lng) {
                        continue;
                    }

                    $markers[] = [
                        'lat'   => $m_lat,
                        'lng'   => $m_lng,
                        'title' => $m_title,
                        'text'  => $m_text,
                        'color' => $m_color,
                    ];
                }
            }
        }

        if (0.0 === $lat && 0.0 === $lng) {
            return;
        }

        if ($zoom <= 0.0) {
            $zoom = 10.0;
        }

        $token = $this->options->get_token();

        wp_enqueue_style(
            'mapbox-gl',
            'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css',
            [],
            '2.15.0'
        );

        wp_enqueue_script(
            'mapbox-gl',
            'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js',
            [],
            '2.15.0',
            true
        );

        wp_enqueue_style(
            'wpmb-public',
            WPMB_PLUGIN_URL . 'public/css/public.css',
            [],
            WPMB_PLUGIN_VERSION
        );

        wp_enqueue_script(
            'wpmb-public',
            WPMB_PLUGIN_URL . 'public/js/public.js',
            ['mapbox-gl'],
            WPMB_PLUGIN_VERSION,
            true
        );

        if ('' === $style_url) {
            $style_url = 'mapbox://styles/mapbox/streets-v11';
        }

        $config = [
            'accessToken' => $token,
            'map'         => [
                'id'     => $map_id,
                'lat'    => $lat,
                'lng'    => $lng,
                'zoom'   => $zoom,
                'style'  => $style_url,
                'marker' => [
                    'enabled' => $marker_enabled,
                    'title'   => $marker_title,
                    'text'    => $marker_text,
                    'color'   => $marker_color,
                ],
                'markers' => $markers,
            ],
        ];

        wp_localize_script('wpmb-public', 'wpmbMapConfig', $config);
    }
}

