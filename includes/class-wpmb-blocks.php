<?php
declare(strict_types=1);

class WPMB_Blocks
{
    public function register(): void
    {
        if (! function_exists('register_block_type')) {
            return;
        }

        wp_register_script(
            'wpmb-blocks-editor',
            WPMB_PLUGIN_URL . 'public/js/blocks.js',
            [
                'wp-blocks',
                'wp-element',
                'wp-components',
                'wp-data',
                'wp-block-editor',
            ],
            WPMB_PLUGIN_VERSION,
            true
        );

        register_block_type(
            'wpmb/mapbox-map',
            [
                'editor_script'   => 'wpmb-blocks-editor',
                'render_callback' => [$this, 'render_map_block'],
                'supports'        => [
                    'align'      => ['wide', 'full'],
                    'spacing'    => [
                        'margin'  => true,
                        'padding' => true,
                    ],
                    'dimensions' => [
                        'minHeight' => true,
                    ],
                ],
                'attributes'      => [
                    'mapId' => [
                        'type'    => 'integer',
                        'default' => 0,
                    ],
                ],
            ]
        );
    }

    /**
     * Rendu dynamique du bloc.
     *
     * @param array<string,mixed> $attributes Attributs du bloc.
     */
    public function render_map_block(array $attributes, string $content = '', $block = null): string
    {
        $map_id = isset($attributes['mapId']) ? absint((string) $attributes['mapId']) : 0;

        if ($map_id <= 0) {
            return '';
        }

        $wrapper_attributes = get_block_wrapper_attributes();
        $html               = do_shortcode('[mapbox_map id="' . $map_id . '"]');

        return sprintf('<div %s>%s</div>', $wrapper_attributes, $html);
    }
}

