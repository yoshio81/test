let map;
let service;
let infowindow;
let userMarker;

document.getElementById('findStores').addEventListener('click', function() {
    if (isAnyOptionSelected()) {
        this.disabled = true;
        document.getElementById('loading').style.display = 'block';

        if (typeof google === 'object' && typeof google.maps === 'object') {
            initMap();
        } else {
            alert('Google Maps APIのロードを待っています。もう一度試してください。');
            resetLoadingState();
        }
    } else {
        alert('最低でも1つのオプションを選択してください。');
    }
});

function isAnyOptionSelected() {
    const searchOptions = document.querySelectorAll('#searchOptions input:checked');
    return searchOptions.length > 0;
}

function initMap() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                map = new google.maps.Map(document.getElementById('map'), {
                    center: userLocation,
                    zoom: 15
                });
                searchStores(userLocation);
                setupClickListener();
            },
            () => {
                // 現在地の取得に失敗した場合は、東京の座標を中心にマップを表示
                const tokyoLocation = {lat: 35.6895, lng: 139.6917};
                map = new google.maps.Map(document.getElementById('map'), {
                    center: tokyoLocation,
                    zoom: 15
                });
                searchStores(tokyoLocation);
                setupClickListener();
            }
        );
    } else {
        // ブラウザが位置情報に対応していない場合は、東京の座標を中心にマップを表示
        const tokyoLocation = {lat: 35.6895, lng: 139.6917};
        map = new google.maps.Map(document.getElementById('map'), {
            center: tokyoLocation,
            zoom: 15
        });
        searchStores(tokyoLocation);
        setupClickListener();
    }
}

function setupClickListener() {
    // マウスクリックイベントを追加
    map.addListener('click', function(event) {
        const clickedLocation = event.latLng;

        // 既存のユーザーマーカーを削除
        if (userMarker) {
            userMarker.setMap(null);
        }

        // クリックされた位置にユーザーマーカーを設置
        userMarker = new google.maps.Marker({
            position: clickedLocation,
            map: map,
            title: "Clicked Location",
            icon: {
                url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                scaledSize: new google.maps.Size(40, 40)
            }
        });

        searchStores(clickedLocation);
    });
    
    resetLoadingState();
}

function searchStores(location) {
    const searchOptions = document.querySelectorAll('#searchOptions input:checked');
    const types = Array.from(searchOptions).map(option => option.value);
    const radius = document.getElementById('radius').value;

    types.forEach(type => {
        const request = {
            location: location,
            radius: radius,
            type: [type]
        };

        if (type === 'fast_food') {
            request.keyword = 'ファーストフード';
        }

        infowindow = new google.maps.InfoWindow();
        service = new google.maps.places.PlacesService(map);
        service.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                results.forEach(place => {
                    createMarker(place, type);
                });
            }
            resetLoadingState();
        });
    });
}

function createMarker(place, type) {
    let iconUrl;
    switch (type) {
        case 'cafe':
            iconUrl = 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
            break;
        case 'fast_food':
            iconUrl = 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
            break;
        case 'convenience_store':
            iconUrl = 'http://maps.google.com/mapfiles/ms/icons/purple-dot.png';
            break;
    }

    const marker = new google.maps.Marker({
        map: map,
        position: place.geometry.location,
        icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(40, 40)
        }
    });

    google.maps.event.addListener(marker, 'click', () => {
        const request = {
            placeId: place.place_id,
            fields: ['name', 'formatted_address', 'photos', 'rating', 'reviews', 'opening_hours']
        };

        service.getDetails(request, (details, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                const content = `
                    <div>
                        <h3>${details.name}</h3>
                        <p>${details.formatted_address}</p>
                        ${details.photos ? `<img src="${details.photos[0].getUrl({ maxWidth: 200, maxHeight: 200 })}" alt="${details.name}">` : ''}
                        <p>評価: ${getStarRating(details.rating)}</p>
                        <p>営業時間: ${details.opening_hours ? details.opening_hours.weekday_text.join('<br>') : '情報なし'}</p>
                        <h4>口コミ:</h4>
                        <ul>
                            ${details.reviews ? details.reviews.slice(0, 3).map(review => `<li>${review.text}</li>`).join('') : '<li>口コミ情報はありません</li>'}
                        </ul>
                    </div>
                `;
                infowindow.setContent(content);
                infowindow.open(map, marker);
            }
        });
    });
}

function getStarRating(rating) {
    const fullStar = '&#9733;';
    const halfStar = '&#9734;';
    const emptyStar = '&#9734;';
    let starRating = '';

    for (let i = 0; i < 5; i++) {
        if (rating >= i + 0.8) {
            starRating += fullStar;
        } else if (rating >= i + 0.3) {
            starRating += halfStar;
        } else {
            starRating += emptyStar;
        }
    }
    return starRating;
}

function resetLoadingState() {
    document.getElementById('findStores').disabled = false;
    document.getElementById('loading').style.display = 'none';
}

// スライダーの値が変更されたときにラベルを更新
document.getElementById('radius').addEventListener('input', function() {
    document.getElementById('radiusValue').textContent = this.value;
});