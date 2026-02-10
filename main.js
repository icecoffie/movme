const API_BASE = 'https://api.jikan.moe/v4';
        const STORAGE_KEY = 'EVC_PRO_DATA';
        
        // State
        let library = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        let currentFilter = 'All';

        // Init
        document.addEventListener('DOMContentLoaded', () => {
            fetchTopAnime();
            updateLibraryCount();
        });

        // --- NAVIGATION ---
        function switchTab(tab) {
            document.getElementById('view-discover').classList.add('hidden');
            document.getElementById('view-library').classList.add('hidden');
            document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active', 'text-white', 'bg-blue-500/10'));
            
            if(tab === 'discover') {
                document.getElementById('view-discover').classList.remove('hidden');
                document.getElementById('nav-discover').classList.add('active');
            } else {
                document.getElementById('view-library').classList.remove('hidden');
                document.getElementById('nav-library').classList.add('active');
                renderLibrary();
            }
        }

        // --- API & DATA FETCHING ---

        async function fetchTopAnime() {
            try {
                // Fetch Featured (Top 1) for Hero
                const res = await fetch(`${API_BASE}/top/anime?filter=airing&limit=1`);
                const data = await res.json();
                if(data.data && data.data.length > 0) {
                    setupHero(data.data[0]);
                }

                // Fetch Grid
                fetchByGenre(null, document.querySelector('.genre-btn')); // Fetch default
            } catch (e) {
                console.error(e);
                showToast("Failed to connect to Anime Cloud", true);
            }
        }

        async function fetchByGenre(genreId, btnElement) {
            // Update UI Buttons
            document.querySelectorAll('.genre-btn').forEach(btn => {
                btn.classList.remove('bg-blue-600', 'text-white', 'shadow-lg');
                btn.classList.add('bg-[#15171e]', 'text-gray-400', 'border-gray-700');
            });
            btnElement.classList.remove('bg-[#15171e]', 'text-gray-400', 'border-gray-700');
            btnElement.classList.add('bg-blue-600', 'text-white', 'shadow-lg');

            // Show Loader on Grid
            const grid = document.getElementById('discover-grid');
            grid.innerHTML = '<div class="col-span-full h-40 flex items-center justify-center"><div class="loader"></div></div>';
            
            const title = document.getElementById('grid-title');
            title.innerText = genreId ? `${btnElement.innerText} Anime` : "Top Airing";

            try {
                let url = `${API_BASE}/top/anime?filter=airing&limit=12`;
                if(genreId) {
                    url = `${API_BASE}/anime?genres=${genreId}&order_by=score&sort=desc&limit=12`;
                }
                
                const res = await fetch(url);
                const data = await res.json();
                renderGrid(data.data);
            } catch (e) {
                grid.innerHTML = '<p class="text-center text-red-500 col-span-full">Failed to load content.</p>';
            }
        }

        async function searchAnime(query) {
            if(!query.trim()) return;
            document.getElementById('search-loader').classList.remove('hidden');
            try {
                const res = await fetch(`${API_BASE}/anime?q=${query}&limit=12`);
                const data = await res.json();
                document.getElementById('grid-title').innerText = `Search: "${query}"`;
                renderGrid(data.data);
                if(document.getElementById('view-library').classList.contains('hidden') === false) {
                    switchTab('discover');
                }
            } catch(e) {
                showToast("Search failed", true);
            } finally {
                document.getElementById('search-loader').classList.add('hidden');
            }
        }

        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if(e.key === 'Enter') searchAnime(e.target.value);
        });

        // --- RENDERING ---

        function setupHero(anime) {
            const title = anime.title_english || anime.title;
            const img = anime.images.jpg.large_image_url;
            const trailer = anime.trailer.embed_url;

            document.getElementById('hero-title').innerText = title;
            document.getElementById('hero-desc').innerText = anime.synopsis;
            document.getElementById('hero-img').src = img;
            document.getElementById('hero-img').classList.remove('hidden');
            
            // Setup Hero Buttons
            document.getElementById('hero-play-btn').onclick = () => openVideo(trailer, title);
            document.getElementById('hero-add-btn').onclick = () => addToLibrary(anime.mal_id, title, img, anime.score);
        }

        function renderGrid(list) {
            const grid = document.getElementById('discover-grid');
            grid.innerHTML = '';

            if(!list || list.length === 0) {
                grid.innerHTML = '<p class="col-span-full text-center text-gray-500">No results found.</p>';
                return;
            }

            list.forEach(item => {
                const title = item.title_english || item.title;
                const img = item.images.jpg.image_url;
                const score = item.score || 'N/A';
                const trailer = item.trailer ? item.trailer.embed_url : null;
                const isSaved = library.some(l => l.id == item.mal_id);

                const card = document.createElement('div');
                card.className = "poster-card group relative bg-[#15171e] rounded-xl overflow-hidden border border-gray-800/50";
                
                card.innerHTML = `
                    <div class="relative w-full pt-[140%] bg-gray-900">
                        <img src="${img}" class="absolute inset-0 w-full h-full object-cover group-hover:opacity-40 transition duration-300">
                        
                        <!-- Badges -->
                        <div class="absolute top-2 right-2 bg-black/60 backdrop-blur text-yellow-400 text-[10px] font-bold px-2 py-1 rounded border border-white/10">
                            <i class="fa-solid fa-star mr-1"></i>${score}
                        </div>

                        <!-- Hover Action (Play & Add) -->
                        <div class="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition duration-300 gap-3 p-4">
                            <!-- Play Button -->
                            <button onclick="openVideo('${trailer || ''}', '${escapeHtml(title)}')" class="play-btn w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 shadow-xl shadow-blue-600/40">
                                <i class="fa-solid fa-play ml-1"></i>
                            </button>
                            
                            <!-- Add Button -->
                            ${isSaved 
                                ? `<span class="text-green-400 text-xs font-bold bg-black/50 px-3 py-1 rounded-full border border-green-500/30"><i class="fa-solid fa-check"></i> Saved</span>`
                                : `<button onclick="addToLibrary('${item.mal_id}', '${escapeHtml(title)}', '${img}', '${score}')" class="text-white text-xs font-bold border border-white/30 hover:bg-white hover:text-black px-4 py-2 rounded-full transition">
                                    + Add to List
                                   </button>`
                            }
                        </div>
                    </div>
                    <div class="p-3">
                        <h4 class="text-gray-200 text-sm font-bold truncate hover:text-blue-400 transition cursor-pointer" title="${title}">${title}</h4>
                        <div class="flex items-center justify-between mt-1 text-[11px] text-gray-500">
                            <span>${item.year || 'Unknown'}</span>
                            <span class="border border-gray-700 px-1 rounded text-[9px]">${item.type || 'TV'}</span>
                        </div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        // --- VIDEO PLAYER LOGIC (CINEMA MODE) ---
        
        function openVideo(url, title) {
            const modal = document.getElementById('video-modal');
            const frame = document.getElementById('video-frame');
            const noVid = document.getElementById('no-video-msg');
            
            document.getElementById('modal-title').innerText = title;
            modal.classList.remove('hidden');
            modal.classList.add('flex'); // Flex to center

            if(url && url !== 'null') {
                // Autoplay enabled
                frame.src = url + (url.includes('?') ? '&autoplay=1' : '?autoplay=1'); 
                frame.classList.remove('hidden');
                noVid.classList.add('hidden');
            } else {
                frame.src = '';
                frame.classList.add('hidden');
                noVid.classList.remove('hidden');
            }
        }

        function closeVideo() {
            const modal = document.getElementById('video-modal');
            document.getElementById('video-frame').src = ''; // Stop video
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }

        // --- LIBRARY LOGIC ---

        function addToLibrary(id, title, img, score) {
            if(library.some(x => x.id == id)) {
                showToast("Already in library", true);
                return;
            }
            library.unshift({ id, title, img, score, status: 'Watching' });
            saveData();
            showToast("Added to library");
            
            // Simple re-render current grid to update button status
            const currentGrid = document.getElementById('discover-grid');
            if(currentGrid.childElementCount > 0) {
               // Optional: Re-fetch or just update DOM manually (complex). 
               // For now, let's keep it simple.
            }
        }

        function filterLibrary(status) {
            // Update UI pills
            document.querySelectorAll('.lib-filter').forEach(b => {
                if(b.innerText === status) {
                    b.classList.remove('text-gray-400', 'bg-transparent');
                    b.classList.add('text-white', 'bg-gray-700');
                } else {
                    b.classList.add('text-gray-400');
                    b.classList.remove('text-white', 'bg-gray-700');
                }
            });
            currentFilter = status;
            renderLibrary();
        }

        function renderLibrary() {
            const grid = document.getElementById('library-grid');
            grid.innerHTML = '';
            
            const filtered = library.filter(x => currentFilter === 'All' || x.status === currentFilter);
            
            if(filtered.length === 0) {
                document.getElementById('empty-library').classList.remove('hidden');
            } else {
                document.getElementById('empty-library').classList.add('hidden');
            }

            filtered.forEach(item => {
                const card = document.createElement('div');
                card.className = "poster-card relative bg-[#15171e] rounded-xl overflow-hidden border border-gray-800 group";
                
                // Status Color
                let stColor = item.status === 'Watching' ? 'text-green-400' : 'text-blue-400';

                card.innerHTML = `
                    <div class="relative w-full pt-[140%]">
                        <img src="${item.img}" class="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition">
                        <button onclick="removeFromLibrary('${item.id}')" class="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition z-10">
                            <i class="fa-solid fa-minus text-xs"></i>
                        </button>
                    </div>
                    <div class="p-3">
                        <h4 class="text-white text-sm font-bold truncate mb-2">${item.title}</h4>
                        <select onchange="updateStatus('${item.id}', this.value)" class="w-full bg-[#0b0c15] text-xs text-gray-400 border border-gray-700 rounded p-1.5 focus:border-blue-500 outline-none">
                            <option value="Watching" ${item.status === 'Watching' ? 'selected' : ''}>Watching</option>
                            <option value="Completed" ${item.status === 'Completed' ? 'selected' : ''}>Completed</option>
                            <option value="Plan" ${item.status === 'Plan' ? 'selected' : ''}>Plan</option>
                        </select>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        function updateStatus(id, newStatus) {
            const idx = library.findIndex(x => x.id == id);
            if(idx > -1) {
                library[idx].status = newStatus;
                saveData();
                showToast("Status updated");
                if(currentFilter !== 'All') renderLibrary();
            }
        }

        function removeFromLibrary(id) {
            if(confirm("Remove from library?")) {
                library = library.filter(x => x.id != id);
                saveData();
                renderLibrary();
                showToast("Removed", true);
            }
        }

        // --- UTILS ---
        function saveData() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
            updateLibraryCount();
        }

        function updateLibraryCount() {
            const c = library.length;
            document.getElementById('lib-count').innerText = c;
            document.getElementById('mobile-lib-count').innerText = c;
        }

        function showToast(msg, isError = false) {
            const t = document.getElementById('toast');
            document.getElementById('toast-msg').innerText = msg;
            document.getElementById('toast-icon').innerHTML = isError ? '<i class="fa-solid fa-circle-exclamation text-red-500"></i>' : '<i class="fa-solid fa-circle-check text-green-500"></i>';
            t.classList.remove('translate-x-64');
            setTimeout(() => t.classList.add('translate-x-64'), 3000);
        }

        function escapeHtml(text) {
            return text ? text.replace(/'/g, "&apos;").replace(/"/g, "&quot;") : "";
        }