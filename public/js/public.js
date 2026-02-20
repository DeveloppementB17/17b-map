(function () {
    if (typeof wpmbMapConfig === 'undefined') {
        return;
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (typeof mapboxgl === 'undefined') {
            return;
        }

        var config = wpmbMapConfig || {};
        var token = config.accessToken || '';
        var mapConfig = config.map || {};

        if (!token || !mapConfig.lat || !mapConfig.lng) {
            return;
        }

        mapboxgl.accessToken = token;

        var containers = document.querySelectorAll('.wpmb-map');
        if (!containers.length) {
            return;
        }

        function wpmbEscapeHtml(str) {
            return String(str).replace(/[&<>"']/g, function (s) {
                switch (s) {
                    case '&': return '&amp;';
                    case '<': return '&lt;';
                    case '>': return '&gt;';
                    case '"': return '&quot;';
                    case "'": return '&#039;';
                    default: return s;
                }
            });
        }

        function wpmbCreateMarkerIconElement(iconUrl, iconSize) {
            var size = (iconSize && iconSize >= 16 && iconSize <= 128) ? iconSize : 40;
            var el = document.createElement('div');
            el.className = 'wpmb-marker-icon';
            var img = document.createElement('img');
            img.src = iconUrl;
            img.alt = '';
            img.width = size;
            img.height = size;
            el.appendChild(img);
            return el;
        }

        containers.forEach(function (container) {
            var zoom = mapConfig.zoom || 10;
            var style = mapConfig.style || 'mapbox://styles/mapbox/streets-v11';

            // Si le bloc parent a une hauteur minimale définie via Gutenberg,
            // on applique cette valeur comme hauteur explicite du conteneur
            // pour que Mapbox ajuste correctement la taille du canvas.
            var parentBlock = container.closest('.wp-block-wpmb-mapbox-map');
            if (parentBlock && parentBlock.style && parentBlock.style.minHeight) {
                container.style.height = parentBlock.style.minHeight;
            }

            var map = new mapboxgl.Map({
                container: container,
                style: style,
                center: [mapConfig.lng, mapConfig.lat],
                zoom: zoom
            });

            if (mapConfig.showNavControl) {
                map.addControl(new mapboxgl.NavigationControl(), 'top-right');
            }

            if (mapConfig.marker && mapConfig.marker.enabled) {
                var marker;
                if (mapConfig.marker.iconUrl) {
                    var markerEl = wpmbCreateMarkerIconElement(mapConfig.marker.iconUrl, mapConfig.marker.iconSize);
                    marker = new mapboxgl.Marker({ element: markerEl }).setLngLat([mapConfig.lng, mapConfig.lat]);
                } else {
                    var markerOptions = {};
                    if (mapConfig.marker.color) {
                        markerOptions.color = mapConfig.marker.color;
                    }
                    marker = new mapboxgl.Marker(markerOptions).setLngLat([mapConfig.lng, mapConfig.lat]);
                }

                if (mapConfig.marker.title || mapConfig.marker.text) {
                    var title = mapConfig.marker.title || '';
                    var text = mapConfig.marker.text || '';
                    var html = '';

                    if (title) {
                        html += '<strong>' + wpmbEscapeHtml(title) + '</strong>';
                    }

                    if (text) {
                        if (html) {
                            html += '<br>';
                        }
                        html += wpmbEscapeHtml(text).replace(/\n/g, '<br>');
                    }

                    var popup = new mapboxgl.Popup({ offset: 25 }).setHTML(html);
                    marker.setPopup(popup);
                }

                marker.addTo(map);
            }

            if (Array.isArray(mapConfig.markers) && mapConfig.markers.length) {
                var defaultIconUrl = mapConfig.marker && mapConfig.marker.iconUrl;
                var defaultIconSize = mapConfig.marker && mapConfig.marker.iconSize;

                mapConfig.markers.forEach(function (m) {
                    if (!m || !m.lat || !m.lng) {
                        return;
                    }

                    var extraMarker;
                    if (defaultIconUrl) {
                        var extraEl = wpmbCreateMarkerIconElement(defaultIconUrl, defaultIconSize);
                        extraMarker = new mapboxgl.Marker({ element: extraEl }).setLngLat([m.lng, m.lat]);
                    } else {
                        var extraOptions = {};
                        var markerColor = m.color || (mapConfig.marker && mapConfig.marker.color);
                        if (markerColor) {
                            extraOptions.color = markerColor;
                        }
                        extraMarker = new mapboxgl.Marker(extraOptions).setLngLat([m.lng, m.lat]);
                    }

                    if (m.title || m.text) {
                        var eTitle = m.title || '';
                        var eText = m.text || '';
                        var eHtml = '';

                        if (eTitle) {
                            eHtml += '<strong>' + wpmbEscapeHtml(eTitle) + '</strong>';
                        }

                        if (eText) {
                            if (eHtml) {
                                eHtml += '<br>';
                            }
                            eHtml += wpmbEscapeHtml(eText).replace(/\n/g, '<br>');
                        }

                        var ePopup = new mapboxgl.Popup({ offset: 25 }).setHTML(eHtml);
                        extraMarker.setPopup(ePopup);
                    }

                    extraMarker.addTo(map);
                });
            }

            if (Array.isArray(mapConfig.cpt_markers) && mapConfig.cpt_markers.length) {
                var cptDefaultIconUrl = mapConfig.marker && mapConfig.marker.iconUrl;
                var cptDefaultIconSize = mapConfig.marker && mapConfig.marker.iconSize;
                var defaultColor = mapConfig.marker && mapConfig.marker.color;

                mapConfig.cpt_markers.forEach(function (m) {
                    if (!m || !m.lat || !m.lng) {
                        return;
                    }

                    var cptMarker;
                    if (cptDefaultIconUrl) {
                        var cptEl = wpmbCreateMarkerIconElement(cptDefaultIconUrl, cptDefaultIconSize);
                        cptMarker = new mapboxgl.Marker({ element: cptEl }).setLngLat([m.lng, m.lat]);
                    } else {
                        var cptOptions = {};
                        if (defaultColor) {
                            cptOptions.color = defaultColor;
                        }
                        cptMarker = new mapboxgl.Marker(cptOptions).setLngLat([m.lng, m.lat]);
                    }

                    var cptTitle = m.title || '';
                    var cptText = m.text || '';
                    var cptUrl = m.url || '';
                    var cptHtml = '';

                    if (cptTitle) {
                        cptHtml += '<strong>' + cptTitle + '</strong>';
                    }

                    if (cptText) {
                        if (cptHtml) {
                            cptHtml += '<br>';
                        }
                        cptHtml += cptText.replace(/\n/g, '<br>');
                    }

                    if (cptUrl) {
                        if (cptHtml) {
                            cptHtml += '<br>';
                        }
                        cptHtml += '<a href="' + wpmbEscapeHtml(cptUrl) + '">Voir la fiche</a>';
                    }

                    if (cptHtml) {
                        var cptPopup = new mapboxgl.Popup({ offset: 25 }).setHTML(cptHtml);
                        cptMarker.setPopup(cptPopup);
                    }

                    cptMarker.addTo(map);
                });
            }
        });
    });
})(); 

