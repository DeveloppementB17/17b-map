<?php
declare(strict_types=1);

class WPMB_Frontend
{
    private WPMB_Assets $assets;

    public function __construct(WPMB_Assets $assets)
    {
        $this->assets = $assets;
    }

    public function register_shortcodes(): void
    {
        add_shortcode('mapbox_map', [$this, 'render_shortcode']);
    }

    /**
     * Rendu du shortcode [mapbox_map id="XX"].
     *
     * @param array<string,mixed> $atts Attributs du shortcode.
     */
    public function render_shortcode(array $atts = []): string
    {
        $atts = shortcode_atts(
            [
                'id' => 0,
            ],
            $atts,
            'mapbox_map'
        );

        $post_id = absint((string) $atts['id']);
        if ($post_id <= 0) {
            return '';
        }

        $show_listing = '1' === get_post_meta($post_id, '_wpmb_show_listing', true);
        $cpt_enabled  = '1' === get_post_meta($post_id, '_wpmb_cpt_enabled', true);

        if ($show_listing && $cpt_enabled) {
            return $this->render_listing_layout($post_id);
        }

        return sprintf(
            '<div class="wpmb-map" data-map-id="%d"></div>',
            $post_id
        );
    }

    /**
     * Génère le layout deux colonnes : listing cards + carte.
     */
    private function render_listing_layout(int $map_id): string
    {
        $markers = $this->assets->get_cpt_markers($map_id);

        $cards_html = '';
        foreach ($markers as $index => $m) {
            // Les champs title et text sont déjà filtrés par wp_kses_post() dans get_cpt_markers().
            // On utilise wp_strip_all_tags() pour le titre (affiché en élément d'interface)
            // et on restitue le texte tel quel pour la popup (géré côté JS).
            $title = isset($m['title']) ? wp_strip_all_tags((string) $m['title']) : '';
            $url   = isset($m['url']) ? (string) $m['url'] : '';
            $image = isset($m['image']) ? (string) $m['image'] : '';
            $lat   = isset($m['lat']) ? (float) $m['lat'] : 0.0;
            $lng   = isset($m['lng']) ? (float) $m['lng'] : 0.0;

            // Ligne d'en-tête : vignette + titre
            $header = '';
            if ('' !== $image) {
                $header .= sprintf(
                    '<img class="wpmb-card__thumb" src="%s" alt="%s" loading="lazy" width="64" height="64">',
                    esc_attr($image),
                    esc_attr($title)
                );
            }
            $header .= sprintf(
                '<span class="wpmb-card__title">%s</span>',
                esc_html($title)
            );

            // Ligne d'actions : bouton localiser + lien fiche
            $actions = sprintf(
                '<button type="button" class="wpmb-card-locate">%s</button>',
                esc_html__('Localiser sur la carte', '17b-map')
            );
            if ('' !== $url) {
                $actions .= sprintf(
                    '<a class="wpmb-card__link" href="%s">%s</a>',
                    esc_url($url),
                    esc_html__('Voir la fiche', '17b-map')
                );
            }

            $cards_html .= sprintf(
                '<div class="wpmb-card" data-marker-index="%d" data-lat="%s" data-lng="%s">'
                . '<div class="wpmb-card__header">%s</div>'
                . '<div class="wpmb-card__actions">%s</div>'
                . '</div>',
                $index,
                esc_attr((string) $lat),
                esc_attr((string) $lng),
                $header,
                $actions
            );
        }

        if ('' === $cards_html) {
            $cards_html = sprintf(
                '<p class="wpmb-listing-empty">%s</p>',
                esc_html__('Aucune fiche à afficher.', '17b-map')
            );
        }

        return sprintf(
            '<div class="wpmb-layout wpmb-layout--listing" data-map-id="%1$d">'
            . '<div class="wpmb-listing-col" aria-label="%2$s">%3$s</div>'
            . '<div class="wpmb-map-col"><div class="wpmb-map" data-map-id="%1$d"></div></div>'
            . '</div>',
            $map_id,
            esc_attr__('Liste des fiches', '17b-map'),
            $cards_html
        );
    }
}
