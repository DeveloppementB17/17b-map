<?php
declare(strict_types=1);

class WPMB_Admin
{
    private WPMB_Meta_Boxes $meta_boxes;

    public function __construct()
    {
        $this->meta_boxes = new WPMB_Meta_Boxes();
    }

    public function register_meta_boxes(): void
    {
        $this->meta_boxes->register_meta_boxes();
    }

    /**
     * Sauvegarde des métadonnées de la carte.
     *
     * @param int     $post_id Identifiant du post.
     * @param WP_Post $post    Objet post.
     */
    public function save_post(int $post_id, WP_Post $post): void
    {
        if (WPMB_CPT::POST_TYPE !== $post->post_type) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (! isset($_POST['wpmb_map_nonce'])) {
            return;
        }

        if (! wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['wpmb_map_nonce'])), 'wpmb_save_map_meta')) {
            return;
        }

        if (! current_user_can('edit_post', $post_id)) {
            return;
        }

        $this->meta_boxes->save_meta($post_id, $_POST);
    }
}

