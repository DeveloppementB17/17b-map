<?php
declare(strict_types=1);

class WPMB_Assets
{
    private WPMB_Options $options;

    public function __construct(WPMB_Options $options)
    {
        $this->options = $options;
    }

    /**
     * Récupère les markers issus d'un CPT configuré sur la carte.
     *
     * @return array<int, array{lat: float, lng: float, title: string, text: string, url: string}>
     */
    public function get_cpt_markers(int $map_id): array
    {
        $enabled   = '1' === get_post_meta($map_id, '_wpmb_cpt_enabled', true);
        $cpt       = (string) get_post_meta($map_id, '_wpmb_cpt_post_type', true);
        $lat_key   = (string) get_post_meta($map_id, '_wpmb_cpt_lat_meta', true);
        $lng_key   = (string) get_post_meta($map_id, '_wpmb_cpt_lng_meta', true);
        $text_key       = (string) get_post_meta($map_id, '_wpmb_cpt_description_meta', true);
        $show_thumbnail = '1' === get_post_meta($map_id, '_wpmb_cpt_show_thumbnail', true);
        $color_key      = (string) get_post_meta($map_id, '_wpmb_cpt_color_meta', true);
        $icon_key       = (string) get_post_meta($map_id, '_wpmb_cpt_icon_meta', true);

        if (! $enabled || '' === $cpt || '' === $lat_key || '' === $lng_key) {
            return [];
        }

        $cpt       = sanitize_key($cpt);
        $lat_key   = sanitize_key($lat_key);
        $lng_key   = sanitize_key($lng_key);
        $text_key  = sanitize_key($text_key);
        $color_key = sanitize_key($color_key);
        $icon_key  = sanitize_key($icon_key);

        if ('' === $cpt || '' === $lat_key || '' === $lng_key) {
            return [];
        }

        $posts = get_posts([
            'post_type'      => $cpt,
            'posts_per_page' => -1,
            'post_status'    => 'publish',
            'meta_query'     => [
                [
                    'key'     => $lat_key,
                    'compare' => 'EXISTS',
                ],
                [
                    'key'     => $lng_key,
                    'compare' => 'EXISTS',
                ],
            ],
        ]);

        $markers = [];
        foreach ($posts as $cpt_post) {
            $m_lat = (float) get_post_meta($cpt_post->ID, $lat_key, true);
            $m_lng = (float) get_post_meta($cpt_post->ID, $lng_key, true);

            if (0.0 === $m_lat && 0.0 === $m_lng) {
                continue;
            }

            $text = (string) $cpt_post->post_excerpt;
            if ('' !== $text_key) {
                $custom_text = get_post_meta($cpt_post->ID, $text_key, true);
                if (is_scalar($custom_text) && (string) $custom_text !== '') {
                    $text = (string) $custom_text;
                }
            }

            $image = '';
            if ($show_thumbnail) {
                $thumb = get_the_post_thumbnail_url($cpt_post->ID, 'medium');
                if (false !== $thumb && '' !== $thumb) {
                    $image = esc_url($thumb);
                }
            }

            $color = '';
            if ('' !== $color_key) {
                $raw_color = get_post_meta($cpt_post->ID, $color_key, true);
                if (is_scalar($raw_color) && (string) $raw_color !== '') {
                    $color = sanitize_hex_color((string) $raw_color) ?: '';
                }
            }

            $icon_url = '';
            if ('' !== $icon_key) {
                $raw_icon = get_post_meta($cpt_post->ID, $icon_key, true);
                if (is_scalar($raw_icon) && (string) $raw_icon !== '') {
                    $icon_url = esc_url((string) $raw_icon);
                }
            }

            $marker_entry = [
                'lat'   => $m_lat,
                'lng'   => $m_lng,
                'title' => wp_kses_post((string) $cpt_post->post_title),
                'text'  => wp_kses_post($text),
                'url'   => esc_url((string) get_permalink($cpt_post)),
            ];

            if ('' !== $image) {
                $marker_entry['image'] = $image;
            }
            if ('' !== $color) {
                $marker_entry['color'] = $color;
            }
            if ('' !== $icon_url) {
                $marker_entry['iconUrl'] = $icon_url;
            }

            $markers[] = $marker_entry;
        }

        return $markers;
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

        wp_enqueue_media();

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
            'ajaxUrl'     => admin_url('admin-ajax.php'),
            'nonce'       => wp_create_nonce('wpmb_admin_nonce'),
            'i18n'        => [
                'geocoderNoResults'    => __('Aucun résultat pour cette recherche.', '17b-map'),
                'geocoderError'        => __('Erreur lors de la recherche d’adresse. Réessaie plus tard.', '17b-map'),
                'geocoderMissingToken' => __('Renseigne ton Mapbox Access Token dans les réglages du plugin pour utiliser la recherche d’adresse.', '17b-map'),
                'metaKeyChoose'        => __('— Choisir une meta key —', '17b-map'),
                'metaKeyCustom'        => __('Saisir manuellement…', '17b-map'),
                'metaKeyLoading'       => __('Chargement…', '17b-map'),
                'metaKeyNoType'        => __('Sélectionne d’abord un type de post', '17b-map'),
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
            $map_id     = (int) $map_id;
            $map_config = $this->build_map_config($map_id);
            if (null !== $map_config) {
                $maps[$map_id] = $map_config;
            }
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

    /**
     * Construit la config d'une carte à partir de ses metas.
     * Retourne null si la carte n'a pas de coordonnées valides.
     *
     * @return array<string,mixed>|null
     */
    private function build_map_config(int $map_id): ?array
    {
        $lat = (float) get_post_meta($map_id, '_wpmb_lat', true);
        $lng = (float) get_post_meta($map_id, '_wpmb_lng', true);

        if (0.0 === $lat && 0.0 === $lng) {
            return null;
        }

        $zoom             = (float) get_post_meta($map_id, '_wpmb_zoom', true);
        $style_url        = (string) get_post_meta($map_id, '_wpmb_style_url', true);
        $style_custom_url = (string) get_post_meta($map_id, '_wpmb_style_custom_url', true);
        $fit_bounds       = '1' === get_post_meta($map_id, '_wpmb_fit_bounds', true);
        $geocoder_enabled = '1' === get_post_meta($map_id, '_wpmb_geocoder_enabled', true);
        $marker_enabled   = '1' === get_post_meta($map_id, '_wpmb_marker_enabled', true);
        $marker_title     = (string) get_post_meta($map_id, '_wpmb_marker_title', true);
        $marker_text      = (string) get_post_meta($map_id, '_wpmb_marker_text', true);
        $marker_color     = (string) get_post_meta($map_id, '_wpmb_marker_color', true);
        $marker_icon_url  = (string) get_post_meta($map_id, '_wpmb_marker_icon_url', true);
        $marker_icon_size = (int) get_post_meta($map_id, '_wpmb_marker_icon_size', true);
        $show_nav_control   = '1' === get_post_meta($map_id, '_wpmb_show_nav_control', true);
        $clustering_enabled = '1' === get_post_meta($map_id, '_wpmb_clustering_enabled', true);
        $show_listing       = '1' === get_post_meta($map_id, '_wpmb_show_listing', true);

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

        if ('custom' === $style_url) {
            $style_url = '' !== $style_custom_url ? $style_custom_url : 'mapbox://styles/mapbox/streets-v11';
        } elseif ('' === $style_url) {
            $style_url = 'mapbox://styles/mapbox/streets-v11';
        }

        return [
            'id'             => $map_id,
            'lat'            => $lat,
            'lng'            => $lng,
            'zoom'           => $zoom,
            'style'          => $style_url,
            'showNavControl' => $show_nav_control,
            'marker'         => [
                'enabled'  => $marker_enabled,
                'title'    => $marker_title,
                'text'     => $marker_text,
                'color'    => $marker_color,
                'iconUrl'  => $marker_icon_url,
                'iconSize' => $marker_icon_size >= 16 && $marker_icon_size <= 128 ? $marker_icon_size : 40,
            ],
            'clustering'      => $clustering_enabled,
            'fitBounds'       => $fit_bounds,
            'geocoderEnabled' => $geocoder_enabled,
            'showListing'     => $show_listing,
            'markers'         => $markers,
            'cpt_markers'     => $this->get_cpt_markers($map_id),
        ];
    }

    /**
     * Extrait récursivement les mapId de tous les blocs wpmb/mapbox-map.
     *
     * @param  array<int,mixed> $blocks Résultat de parse_blocks().
     * @return int[]
     */
    private function extract_map_ids_from_blocks(array $blocks): array
    {
        $ids = [];
        foreach ($blocks as $block) {
            if ('wpmb/mapbox-map' === ($block['blockName'] ?? '')) {
                $id = isset($block['attrs']['mapId']) ? (int) $block['attrs']['mapId'] : 0;
                if ($id > 0) {
                    $ids[] = $id;
                }
            }
            if (! empty($block['innerBlocks'])) {
                $ids = array_merge($ids, $this->extract_map_ids_from_blocks($block['innerBlocks']));
            }
        }
        return $ids;
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

        $raw_ids = [];

        if ($has_block && function_exists('parse_blocks')) {
            $blocks  = parse_blocks($post->post_content);
            $raw_ids = array_merge($raw_ids, $this->extract_map_ids_from_blocks($blocks));
        }

        if ($has_shortcode) {
            preg_match_all('/\[mapbox_map\s+[^\]]*id="(\d+)"/i', $post->post_content, $sc_matches);
            foreach ($sc_matches[1] as $sc_id) {
                $raw_ids[] = (int) $sc_id;
            }
        }

        $map_ids = array_values(array_unique(array_filter($raw_ids)));

        if (empty($map_ids)) {
            return;
        }

        $maps = [];
        foreach ($map_ids as $map_id) {
            $map_config = $this->build_map_config($map_id);
            if (null !== $map_config) {
                $maps[$map_id] = $map_config;
            }
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

        wp_enqueue_script(
            'wpmb-public',
            WPMB_PLUGIN_URL . 'public/js/public.js',
            ['mapbox-gl'],
            WPMB_PLUGIN_VERSION,
            true
        );

        $config = [
            'accessToken' => $token,
            'maps'        => $maps,
        ];

        wp_localize_script('wpmb-public', 'wpmbMapsConfig', $config);
    }
}

