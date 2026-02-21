(function () {
    document.addEventListener('DOMContentLoaded', function () {
        var adminConfig = window.wpmbAdminConfig || {};

        /**
         * Accordéon des sections de la meta box.
         */
        var sectionsContainer = document.querySelector('.wpmb-meta-sections');
        if (sectionsContainer) {
            var sections = sectionsContainer.querySelectorAll('.wpmb-section');
            sections.forEach(function (section, index) {
                var header = section.querySelector('.wpmb-section-header');
                var body = section.querySelector('.wpmb-section-body');

                if (!header || !body) {
                    return;
                }

                // Première section ouverte par défaut, les autres sont repliées.
                if (index > 0) {
                    section.classList.add('is-collapsed');
                    header.setAttribute('aria-expanded', 'false');
                } else {
                    header.setAttribute('aria-expanded', 'true');
                }

                header.addEventListener('click', function () {
                    var isCollapsed = section.classList.toggle('is-collapsed');
                    header.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
                });
            });
        }

        /**
         * Champs de markers multiples (répéteur).
         */
        var repeater = document.getElementById('wpmb-marker-repeater');
        var addButton = document.getElementById('wpmb-add-marker');

        if (repeater && addButton) {
            function getNextIndex() {
                var rows = repeater.querySelectorAll('.wpmb-marker-row');
                var max = -1;
                rows.forEach(function (row) {
                    var idx = parseInt(row.getAttribute('data-index') || '-1', 10);
                    if (!Number.isNaN(idx) && idx > max) {
                        max = idx;
                    }
                });
                return max + 1;
            }

            function bindRow(row) {
                var removeBtn = row.querySelector('.wpmb-remove-marker');
                if (removeBtn) {
                    removeBtn.addEventListener('click', function () {
                        var rows = repeater.querySelectorAll('.wpmb-marker-row');
                        if (rows.length <= 1) {
                            row.querySelectorAll('input, textarea').forEach(function (el) {
                                if (el.type === 'color') {
                                    return;
                                }
                                el.value = '';
                            });
                            return;
                        }
                        row.remove();
                    });
                }
            }

            repeater.querySelectorAll('.wpmb-marker-row').forEach(bindRow);

            addButton.addEventListener('click', function () {
                var template = repeater.querySelector('.wpmb-marker-row');
                if (!template) {
                    return;
                }

                var clone = template.cloneNode(true);
                var newIndex = getNextIndex();

                clone.setAttribute('data-index', String(newIndex));

                clone.querySelectorAll('input, textarea').forEach(function (el) {
                    if (el.name && el.name.indexOf('wpmb_markers[') === 0) {
                        el.name = el.name.replace(/wpmb_markers\[\d+]/, 'wpmb_markers[' + newIndex + ']');
                    }

                    if (el.type === 'color') {
                        el.value = el.value || '#ff0000';
                    } else {
                        el.value = '';
                    }
                });

                repeater.appendChild(clone);
                bindRow(clone);
            });
        }

        /**
         * Meta key selects dynamiques (Source CPT) via AJAX.
         */
        var ajaxUrl = adminConfig.ajaxUrl || '';
        var ajaxNonce = adminConfig.nonce || '';
        var i18nMeta = {
            choose:  (adminConfig.i18n && adminConfig.i18n.metaKeyChoose)  || '— Choisir une meta key —',
            custom:  (adminConfig.i18n && adminConfig.i18n.metaKeyCustom)  || 'Saisir manuellement\u2026',
            loading: (adminConfig.i18n && adminConfig.i18n.metaKeyLoading) || 'Chargement\u2026',
            noType:  (adminConfig.i18n && adminConfig.i18n.metaKeyNoType)  || 'S\u00e9lectionne d\u2019abord un type de post',
        };

        var cptPostTypeSelect = document.getElementById('wpmb_cpt_post_type');
        var metaKeyFields = document.querySelectorAll('.wpmb-meta-key-field');

        function wpmbSyncMetaKeyField(field, select) {
            var hidden = field.querySelector('input[type="hidden"]');
            var custom = field.querySelector('.wpmb-meta-key-custom');
            if (!hidden) { return; }

            if (select.value === '__custom__') {
                if (custom) {
                    custom.style.display = '';
                    hidden.value = custom.value;
                }
            } else {
                if (custom) { custom.style.display = 'none'; }
                hidden.value = select.value;
            }
        }

        function wpmbPopulateMetaKeySelects(metaKeys) {
            metaKeyFields.forEach(function (field) {
                var select = field.querySelector('.wpmb-meta-key-select');
                var hidden = field.querySelector('input[type="hidden"]');
                var custom = field.querySelector('.wpmb-meta-key-custom');
                if (!select || !hidden) { return; }

                var currentValue = hidden.value;

                // Reconstruire les options
                while (select.options.length) { select.remove(0); }
                select.add(new Option(i18nMeta.choose, ''));
                metaKeys.forEach(function (key) { select.add(new Option(key, key)); });
                select.add(new Option(i18nMeta.custom, '__custom__'));

                // Restaurer la valeur sauvegardée
                if (currentValue) {
                    var found = false;
                    for (var i = 0; i < select.options.length; i++) {
                        if (select.options[i].value === currentValue) {
                            select.selectedIndex = i;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        select.value = '__custom__';
                        if (custom) {
                            custom.value = currentValue;
                            custom.style.display = '';
                        }
                    } else if (custom) {
                        custom.style.display = 'none';
                    }
                }
            });
        }

        function wpmbSetMetaKeySelectsState(message) {
            metaKeyFields.forEach(function (field) {
                var select = field.querySelector('.wpmb-meta-key-select');
                if (!select) { return; }
                while (select.options.length) { select.remove(0); }
                select.add(new Option(message, ''));
            });
        }

        function wpmbFetchMetaKeys(postType) {
            if (!ajaxUrl || !ajaxNonce) { return; }
            if (!postType) {
                wpmbSetMetaKeySelectsState(i18nMeta.noType);
                return;
            }
            wpmbSetMetaKeySelectsState(i18nMeta.loading);

            var formData = new FormData();
            formData.append('action', 'wpmb_get_meta_keys');
            formData.append('nonce', ajaxNonce);
            formData.append('post_type', postType);

            fetch(ajaxUrl, { method: 'POST', body: formData })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data.success && Array.isArray(data.data.meta_keys)) {
                        wpmbPopulateMetaKeySelects(data.data.meta_keys);
                    }
                })
                .catch(function () {
                    wpmbSetMetaKeySelectsState('— Erreur lors du chargement —');
                });
        }

        // Écouter le changement du select post type
        if (cptPostTypeSelect) {
            cptPostTypeSelect.addEventListener('change', function () {
                wpmbFetchMetaKeys(this.value);
            });
            // Peupler au chargement si un type est déjà sélectionné
            if (cptPostTypeSelect.value) {
                wpmbFetchMetaKeys(cptPostTypeSelect.value);
            } else {
                wpmbSetMetaKeySelectsState(i18nMeta.noType);
            }
        }

        // Écouter les changements sur chaque select meta key
        metaKeyFields.forEach(function (field) {
            var select = field.querySelector('.wpmb-meta-key-select');
            var custom = field.querySelector('.wpmb-meta-key-custom');
            if (select) {
                select.addEventListener('change', function () {
                    wpmbSyncMetaKeyField(field, select);
                });
            }
            if (custom) {
                custom.addEventListener('input', function () {
                    var hidden = field.querySelector('input[type="hidden"]');
                    if (hidden) { hidden.value = custom.value; }
                });
            }
        });

        /**
         * Toggle du champ URL personnalisée selon le style sélectionné.
         */
        var styleSelect = document.getElementById('wpmb_style_url');
        var styleCustomRow = document.getElementById('wpmb_style_custom_row');

        if (styleSelect && styleCustomRow) {
            styleSelect.addEventListener('change', function () {
                styleCustomRow.style.display = styleSelect.value === 'custom' ? '' : 'none';
            });
        }

        /**
         * Geocoding Mapbox pour remplir latitude/longitude du centre de la carte.
         */
        var accessToken = adminConfig && typeof adminConfig.accessToken === 'string'
            ? adminConfig.accessToken
            : '';

        var geocodeInput = document.getElementById('wpmb_geocode_query');
        var geocodeResults = document.getElementById('wpmb_geocode_results');
        var geocodeNotice = document.getElementById('wpmb_geocode_notice');
        var latInput = document.getElementById('wpmb_lat');
        var lngInput = document.getElementById('wpmb_lng');
        var markerTitleInput = document.getElementById('wpmb_marker_title');
        var markerTextInput = document.getElementById('wpmb_marker_text');

        if (geocodeInput && geocodeResults && latInput && lngInput) {
            var i18n = adminConfig.i18n || {};
            var noResultsText = i18n.geocoderNoResults || 'Aucun résultat pour cette recherche.';
            var errorText = i18n.geocoderError || 'Erreur lors de la recherche d’adresse. Réessaie plus tard.';
            var missingTokenText = i18n.geocoderMissingToken || 'Renseigne ton Mapbox Access Token dans les réglages du plugin pour utiliser la recherche d’adresse.';

            if (!accessToken) {
                geocodeInput.disabled = true;
                if (geocodeNotice) {
                    geocodeNotice.textContent = missingTokenText;
                }
                return;
            }

            if (geocodeNotice) {
                geocodeNotice.textContent = '';
            }

            var debounceTimer = null;

            function clearResults() {
                while (geocodeResults.firstChild) {
                    geocodeResults.removeChild(geocodeResults.firstChild);
                }
            }

            function renderMessage(message) {
                clearResults();
                var li = document.createElement('li');
                li.textContent = message;
                geocodeResults.appendChild(li);
            }

            function performSearch(query) {
                var trimmed = query.trim();
                if (trimmed.length < 3) {
                    clearResults();
                    return;
                }

                var url = 'https://api.mapbox.com/geocoding/v5/mapbox.places/' +
                    encodeURIComponent(trimmed) +
                    '.json?access_token=' + encodeURIComponent(accessToken) +
                    '&autocomplete=true&limit=5&language=fr';

                fetch(url)
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error('HTTP ' + response.status);
                        }
                        return response.json();
                    })
                    .then(function (data) {
                        clearResults();

                        if (!data || !Array.isArray(data.features) || data.features.length === 0) {
                            renderMessage(noResultsText);
                            return;
                        }

                        data.features.forEach(function (feature) {
                            if (!Array.isArray(feature.center) || feature.center.length < 2) {
                                return;
                            }

                            var lng = feature.center[0];
                            var lat = feature.center[1];
                            var label = feature.place_name || (lat + ', ' + lng);

                            var li = document.createElement('li');
                            var button = document.createElement('button');
                            button.type = 'button';
                            button.className = 'wpmb-geocoder-result';
                            button.textContent = label;
                            button.setAttribute('data-lat', String(lat));
                            button.setAttribute('data-lng', String(lng));

                            li.appendChild(button);
                            geocodeResults.appendChild(li);
                        });
                    })
                    .catch(function () {
                        renderMessage(errorText);
                    });
            }

            geocodeInput.addEventListener('input', function (event) {
                var value = event.target.value || '';

                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }

                debounceTimer = setTimeout(function () {
                    performSearch(value);
                }, 350);
            });

            geocodeResults.addEventListener('click', function (event) {
                var target = event.target;
                if (!target) {
                    return;
                }

                var button = target.closest('.wpmb-geocoder-result');
                if (!button) {
                    return;
                }

                var selectedLat = button.getAttribute('data-lat');
                var selectedLng = button.getAttribute('data-lng');
                var label = button.textContent || '';

                if (selectedLat && selectedLng) {
                    latInput.value = selectedLat;
                    lngInput.value = selectedLng;
                }

                if (markerTitleInput && !markerTitleInput.value) {
                    markerTitleInput.value = label;
                }

                if (markerTextInput && !markerTextInput.value) {
                    markerTextInput.value = label;
                }

                clearResults();
                geocodeInput.value = label;
                geocodeInput.focus();
            });
        }

        /**
         * Bouton « Sélectionner une image » pour l’icône du marker (médiathèque).
         */
        var markerIconSelectBtn = document.getElementById('wpmb_marker_icon_select');
        var markerIconUrlInput = document.getElementById('wpmb_marker_icon_url');

        if (markerIconSelectBtn && markerIconUrlInput && typeof wp !== 'undefined' && wp.media) {
            markerIconSelectBtn.addEventListener('click', function () {
                var frame = wp.media({
                    library: { type: 'image' },
                    multiple: false
                });

                frame.on('select', function () {
                    var attachment = frame.state().get('selection').first().toJSON();
                    if (attachment && attachment.url) {
                        markerIconUrlInput.value = attachment.url;
                    }
                });

                frame.open();
            });
        }
    });
})(); 
