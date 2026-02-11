<?php
declare(strict_types=1);

class WPMB_Meta_Boxes
{
    public function register_meta_boxes(): void
    {
        add_meta_box(
            'wpmb_map_settings',
            __('Paramètres de la carte', '17b-map'),
            [$this, 'render_main_meta_box'],
            WPMB_CPT::POST_TYPE,
            'normal',
            'default'
        );
    }

    /**
     * Affiche la meta box principale.
     *
     * @param WP_Post $post Objet post courant.
     */
    public function render_main_meta_box(WP_Post $post): void
    {
        $lat  = get_post_meta($post->ID, '_wpmb_lat', true);
        $lng  = get_post_meta($post->ID, '_wpmb_lng', true);
        $zoom = get_post_meta($post->ID, '_wpmb_zoom', true);
        $style_url      = get_post_meta($post->ID, '_wpmb_style_url', true);
        $marker_enabled = get_post_meta($post->ID, '_wpmb_marker_enabled', true);
        $marker_title   = get_post_meta($post->ID, '_wpmb_marker_title', true);
        $marker_text    = get_post_meta($post->ID, '_wpmb_marker_text', true);
        $marker_color   = get_post_meta($post->ID, '_wpmb_marker_color', true);

        $raw_markers = get_post_meta($post->ID, '_wpmb_markers', true);
        $markers     = [];

        if (is_string($raw_markers) && '' !== $raw_markers) {
            $decoded = json_decode($raw_markers, true);
            if (is_array($decoded)) {
                $markers = $decoded;
            }
        }

        if (empty($markers)) {
            $markers = [
                [
                    'lat'   => '',
                    'lng'   => '',
                    'title' => '',
                    'text'  => '',
                    'color' => '',
                ],
            ];
        }

        wp_nonce_field('wpmb_save_map_meta', 'wpmb_map_nonce');
        ?>
        <div class="wpmb-meta-sections wpmb-meta-sections--accordion">
            <div class="wpmb-section" data-section="general">
                <button
                    type="button"
                    class="wpmb-section-header"
                    aria-expanded="true"
                    aria-controls="wpmb-section-general"
                >
                    <span class="wpmb-section-title">
                        <?php esc_html_e('Général', '17b-map'); ?>
                    </span>
                </button>
                <div
                    id="wpmb-section-general"
                    class="wpmb-section-body"
                >
                    <p>
                        <label for="wpmb_lat"><?php esc_html_e('Latitude', '17b-map'); ?></label><br>
                        <input
                            type="text"
                            id="wpmb_lat"
                            name="wpmb_lat"
                            value="<?php echo esc_attr((string) $lat); ?>"
                            class="large-text"
                        />
                    </p>
                    <p>
                        <label for="wpmb_lng"><?php esc_html_e('Longitude', '17b-map'); ?></label><br>
                        <input
                            type="text"
                            id="wpmb_lng"
                            name="wpmb_lng"
                            value="<?php echo esc_attr((string) $lng); ?>"
                            class="large-text"
                        />
                    </p>
                    <p>
                        <label for="wpmb_zoom"><?php esc_html_e('Zoom', '17b-map'); ?></label><br>
                        <input
                            type="number"
                            id="wpmb_zoom"
                            name="wpmb_zoom"
                            value="<?php echo esc_attr((string) $zoom); ?>"
                            class="small-text"
                            min="0"
                            max="24"
                        />
                    </p>
                    <div class="wpmb-geocoder">
                        <p>
                            <label for="wpmb_geocode_query">
                                <?php esc_html_e('Recherche d’adresse', '17b-map'); ?>
                            </label><br>
                            <input
                                type="text"
                                id="wpmb_geocode_query"
                                class="regular-text"
                                autocomplete="off"
                                placeholder="<?php echo esc_attr__('Saisis une adresse, un lieu...', '17b-map'); ?>"
                            />
                        </p>
                        <p class="description" id="wpmb_geocode_notice">
                            <?php esc_html_e('Renseigne ton Mapbox Access Token dans les réglages du plugin pour activer la recherche d’adresse.', '17b-map'); ?>
                        </p>
                        <ul class="wpmb-geocoder-results" id="wpmb_geocode_results" aria-label="<?php esc_attr_e('Résultats de la recherche d’adresse', '17b-map'); ?>"></ul>
                    </div>
                </div>
            </div>

            <div class="wpmb-section" data-section="main-marker">
                <button
                    type="button"
                    class="wpmb-section-header"
                    aria-expanded="false"
                    aria-controls="wpmb-section-main-marker"
                >
                    <span class="wpmb-section-title">
                        <?php esc_html_e('Marker principal', '17b-map'); ?>
                    </span>
                </button>
                <div
                    id="wpmb-section-main-marker"
                    class="wpmb-section-body"
                >
                    <p>
                        <label class="wpmb-toggle">
                            <input
                                type="checkbox"
                                name="wpmb_marker_enabled"
                                value="1"
                                <?php checked('1', (string) $marker_enabled); ?>
                            />
                            <span class="wpmb-toggle-slider" aria-hidden="true"></span>
                            <span class="wpmb-toggle-label">
                                <?php esc_html_e('Afficher un marker au centre de la carte', '17b-map'); ?>
                            </span>
                        </label>
                    </p>
                    <p>
                        <label for="wpmb_marker_title"><?php esc_html_e('Titre du marker', '17b-map'); ?></label><br>
                        <input
                            type="text"
                            id="wpmb_marker_title"
                            name="wpmb_marker_title"
                            value="<?php echo esc_attr((string) $marker_title); ?>"
                            class="large-text"
                        />
                    </p>
                    <p>
                        <label for="wpmb_marker_text"><?php esc_html_e('Texte du marker (adresse, description...)', '17b-map'); ?></label><br>
                        <textarea
                            id="wpmb_marker_text"
                            name="wpmb_marker_text"
                            rows="3"
                            class="large-text"
                        ><?php echo esc_textarea((string) $marker_text); ?></textarea>
                        <span class="description">
                            <?php esc_html_e('Optionnel. Les retours à la ligne seront conservés dans la popup.', '17b-map'); ?>
                        </span>
                    </p>
                    <p>
                        <label for="wpmb_marker_color"><?php esc_html_e('Couleur du marker', '17b-map'); ?></label><br>
                        <input
                            type="color"
                            id="wpmb_marker_color"
                            name="wpmb_marker_color"
                            value="<?php echo esc_attr((string) ($marker_color ?: '#ff0000')); ?>"
                        />
                    </p>
                </div>
            </div>

            <div class="wpmb-section" data-section="multiple-markers">
                <button
                    type="button"
                    class="wpmb-section-header"
                    aria-expanded="false"
                    aria-controls="wpmb-section-multiple-markers"
                >
                    <span class="wpmb-section-title">
                        <?php esc_html_e('Markers multiples', '17b-map'); ?>
                    </span>
                </button>
                <div
                    id="wpmb-section-multiple-markers"
                    class="wpmb-section-body"
                >
                    <p class="description">
                        <?php esc_html_e('Ajoute plusieurs markers supplémentaires avec titre, description et couleur. La couleur par défaut est celle du marker principal.', '17b-map'); ?>
                    </p>
                    <div id="wpmb-marker-repeater">
                        <?php foreach ($markers as $index => $marker) : ?>
                            <?php
                            $m_lat   = isset($marker['lat']) ? (string) $marker['lat'] : '';
                            $m_lng   = isset($marker['lng']) ? (string) $marker['lng'] : '';
                            $m_title = isset($marker['title']) ? (string) $marker['title'] : '';
                            $m_text  = isset($marker['text']) ? (string) $marker['text'] : '';
                            $m_color = isset($marker['color']) ? (string) $marker['color'] : '';
                            ?>
                            <div class="wpmb-marker-row" data-index="<?php echo esc_attr((string) $index); ?>">
                                <div class="wpmb-marker-row-fields">
                                    <div class="wpmb-marker-col wpmb-marker-col-coords">
                                        <p>
                                            <label><?php esc_html_e('Latitude', '17b-map'); ?></label><br>
                                            <input
                                                type="text"
                                                name="wpmb_markers[<?php echo esc_attr((string) $index); ?>][lat]"
                                                value="<?php echo esc_attr($m_lat); ?>"
                                                class="large-text"
                                            />
                                        </p>
                                        <p>
                                            <label><?php esc_html_e('Longitude', '17b-map'); ?></label><br>
                                            <input
                                                type="text"
                                                name="wpmb_markers[<?php echo esc_attr((string) $index); ?>][lng]"
                                                value="<?php echo esc_attr($m_lng); ?>"
                                                class="large-text"
                                            />
                                        </p>
                                        <p>
                                            <label><?php esc_html_e('Couleur du marker', '17b-map'); ?></label><br>
                                            <input
                                                type="color"
                                                name="wpmb_markers[<?php echo esc_attr((string) $index); ?>][color]"
                                                value="<?php echo esc_attr($m_color); ?>"
                                            />
                                        </p>
                                    </div>
                                    <div class="wpmb-marker-col wpmb-marker-col-meta">
                                        <p>
                                            <label><?php esc_html_e('Titre', '17b-map'); ?></label><br>
                                            <input
                                                type="text"
                                                name="wpmb_markers[<?php echo esc_attr((string) $index); ?>][title]"
                                                value="<?php echo esc_attr($m_title); ?>"
                                                class="large-text"
                                            />
                                        </p>
                                        <p>
                                            <label><?php esc_html_e('Texte (adresse, description...)', '17b-map'); ?></label><br>
                                            <textarea
                                                name="wpmb_markers[<?php echo esc_attr((string) $index); ?>][text]"
                                                rows="2"
                                                class="large-text"
                                            ><?php echo esc_textarea($m_text); ?></textarea>
                                        </p>
                                    </div>
                                </div>
                                <div class="wpmb-marker-row-actions">
                                    <button type="button" class="button wpmb-remove-marker">
                                        <?php esc_html_e('Supprimer ce marker', '17b-map'); ?>
                                    </button>
                                </div>
                                <hr>
                            </div>
                        <?php endforeach; ?>
                    </div>
                    <p>
                        <button type="button" class="button" id="wpmb-add-marker">
                            <?php esc_html_e('Ajouter un marker', '17b-map'); ?>
                        </button>
                    </p>
                </div>
            </div>

            <div class="wpmb-section" data-section="advanced">
                <button
                    type="button"
                    class="wpmb-section-header"
                    aria-expanded="false"
                    aria-controls="wpmb-section-advanced"
                >
                    <span class="wpmb-section-title">
                        <?php esc_html_e('Options avancées', '17b-map'); ?>
                    </span>
                </button>
                <div
                    id="wpmb-section-advanced"
                    class="wpmb-section-body"
                >
                    <p>
                        <label for="wpmb_style_url"><?php esc_html_e('Style URL Mapbox', '17b-map'); ?></label><br>
                        <?php
                        $styles = [
                            '' => __('Par défaut (Streets)', '17b-map'),
                            'mapbox://styles/mapbox/streets-v11'          => __('Mapbox Streets', '17b-map'),
                            'mapbox://styles/mapbox/outdoors-v12'        => __('Outdoors', '17b-map'),
                            'mapbox://styles/mapbox/satellite-streets-v12' => __('Satellite + rues', '17b-map'),
                            'mapbox://styles/mapbox/light-v11'           => __('Light', '17b-map'),
                            'mapbox://styles/mapbox/dark-v11'            => __('Dark', '17b-map'),
                        ];
                        ?>
                        <select id="wpmb_style_url" name="wpmb_style_url">
                            <?php foreach ($styles as $value => $label) : ?>
                                <option
                                    value="<?php echo esc_attr($value); ?>"
                                    <?php selected((string) $style_url, $value); ?>
                                >
                                    <?php echo esc_html($label); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                        <span class="description">
                            <?php esc_html_e('Choisis un style Mapbox prédéfini. Le style par défaut utilise Streets.', '17b-map'); ?>
                        </span>
                    </p>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Sauvegarde les métadonnées de la carte.
     *
     * @param int   $post_id Identifiant du post.
     * @param array $data    Données brutes (ex: $_POST).
     */
    public function save_meta(int $post_id, array $data): void
    {
        $lat           = isset($data['wpmb_lat']) ? (string) $data['wpmb_lat'] : '';
        $lng           = isset($data['wpmb_lng']) ? (string) $data['wpmb_lng'] : '';
        $zoom          = isset($data['wpmb_zoom']) ? (string) $data['wpmb_zoom'] : '';
        $style_url      = isset($data['wpmb_style_url']) ? (string) $data['wpmb_style_url'] : '';
        $marker_enabled = isset($data['wpmb_marker_enabled']) ? '1' : '0';
        $marker_title   = isset($data['wpmb_marker_title']) ? (string) $data['wpmb_marker_title'] : '';
        $marker_text    = isset($data['wpmb_marker_text']) ? (string) $data['wpmb_marker_text'] : '';
        $marker_color   = isset($data['wpmb_marker_color']) ? (string) $data['wpmb_marker_color'] : '';
        $markers_input  = isset($data['wpmb_markers']) && is_array($data['wpmb_markers']) ? $data['wpmb_markers'] : [];

        $lat       = filter_var($lat, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
        $lng       = filter_var($lng, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
        $zoom      = sanitize_text_field($zoom);
        $style_url      = sanitize_text_field($style_url);
        $marker_enabled = sanitize_text_field($marker_enabled);
        $marker_title   = sanitize_text_field($marker_title);
        $marker_text    = sanitize_textarea_field($marker_text);
        $marker_color   = sanitize_hex_color($marker_color) ?: '';

        $markers = [];
        foreach ($markers_input as $marker) {
            $m_lat   = isset($marker['lat']) ? (string) $marker['lat'] : '';
            $m_lng   = isset($marker['lng']) ? (string) $marker['lng'] : '';
            $m_title = isset($marker['title']) ? (string) $marker['title'] : '';
            $m_text  = isset($marker['text']) ? (string) $marker['text'] : '';
            $m_color = isset($marker['color']) ? (string) $marker['color'] : '';

            $m_lat  = filter_var($m_lat, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
            $m_lng  = filter_var($m_lng, FILTER_SANITIZE_NUMBER_FLOAT, FILTER_FLAG_ALLOW_FRACTION);
            $m_title = sanitize_text_field($m_title);
            $m_text  = sanitize_textarea_field($m_text);
            $m_color = sanitize_hex_color($m_color) ?: '';

            if ('' === $m_lat || '' === $m_lng) {
                continue;
            }

            $markers[] = [
                'lat'   => (float) $m_lat,
                'lng'   => (float) $m_lng,
                'title' => $m_title,
                'text'  => $m_text,
                'color' => $m_color,
            ];
        }

        update_post_meta($post_id, '_wpmb_lat', $lat);
        update_post_meta($post_id, '_wpmb_lng', $lng);
        update_post_meta($post_id, '_wpmb_zoom', $zoom);
        update_post_meta($post_id, '_wpmb_style_url', $style_url);
        update_post_meta($post_id, '_wpmb_marker_enabled', $marker_enabled);
        update_post_meta($post_id, '_wpmb_marker_title', $marker_title);
        update_post_meta($post_id, '_wpmb_marker_text', $marker_text);
        update_post_meta($post_id, '_wpmb_marker_color', $marker_color);

        if (! empty($markers)) {
            update_post_meta($post_id, '_wpmb_markers', wp_json_encode($markers));
        } else {
            delete_post_meta($post_id, '_wpmb_markers');
        }
    }
}

