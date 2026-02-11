<?php
declare(strict_types=1);

class WPMB_Frontend
{
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

        $div = sprintf(
            '<div class="wpmb-map" data-map-id="%d"></div>',
            $post_id
        );

        return $div;
    }
}

