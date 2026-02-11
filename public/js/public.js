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

            if (mapConfig.marker && mapConfig.marker.enabled) {
                var markerOptions = {};
                if (mapConfig.marker.color) {
                    markerOptions.color = mapConfig.marker.color;
                }

                var marker = new mapboxgl.Marker(markerOptions).setLngLat([mapConfig.lng, mapConfig.lat]);

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
                mapConfig.markers.forEach(function (m) {
                    if (!m || !m.lat || !m.lng) {
                        return;
                    }

                    var extraOptions = {};
                    var markerColor = m.color || (mapConfig.marker && mapConfig.marker.color);
                    if (markerColor) {
                        extraOptions.color = markerColor;
                    }

                    var extraMarker = new mapboxgl.Marker(extraOptions).setLngLat([m.lng, m.lat]);

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
        });
    });
})(); 

