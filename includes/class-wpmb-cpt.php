<?php
declare(strict_types=1);

class WPMB_CPT
{
    public const POST_TYPE = 'mapbox_map';

    public function register(): void
    {
        $labels = [
            'name'               => __('Cartes Mapbox', '17b-map'),
            'singular_name'      => __('Carte Mapbox', '17b-map'),
            'add_new'            => __('Ajouter une nouvelle', '17b-map'),
            'add_new_item'       => __('Ajouter une nouvelle carte', '17b-map'),
            'edit_item'          => __('Modifier la carte', '17b-map'),
            'new_item'           => __('Nouvelle carte', '17b-map'),
            'view_item'          => __('Voir la carte', '17b-map'),
            'search_items'       => __('Rechercher des cartes', '17b-map'),
            'not_found'          => __('Aucune carte trouvée', '17b-map'),
            'not_found_in_trash' => __('Aucune carte dans la corbeille', '17b-map'),
            'all_items'          => __('Toutes les cartes', '17b-map'),
            'menu_name'          => __('Cartes Mapbox', '17b-map'),
        ];

        $args = [
            'labels'             => $labels,
            'public'             => false,
            'publicly_queryable' => false,
            'exclude_from_search'=> true,
            'show_ui'            => true,
            'show_in_menu'       => true,
            'show_in_nav_menus'  => false,
            'supports'           => ['title'],
            'has_archive'        => false,
            'show_in_rest'       => true,
            'menu_position'      => 20,
            'menu_icon'          => 'dashicons-location',
        ];

        register_post_type(self::POST_TYPE, $args);
    }
}

