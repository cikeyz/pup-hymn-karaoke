// script.js
// Parses custom LRC format and manages karaoke audio sync

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const audio = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const lyricsWrapper = document.getElementById('lyrics-wrapper');
    const lyricsContainer = document.querySelector('.lyrics-container');
    const progressBar = document.getElementById('progress-bar');
    const progressFill = document.getElementById('progress-fill');
    const currentTimeEl = document.getElementById('current-time');
    const durationEl = document.getElementById('duration');
    const rewindBtn = document.getElementById('rewind-btn');
    const forwardBtn = document.getElementById('forward-btn');

    let lyricsData = []; // Array to hold parsed lyrics objects
    let activeLineIndex = -1;

    // 1. Fetch and Parse LRC
    async function loadLyrics() {
        try {
            // Attempt to fetch if served via HTTP/Live Server
            const response = await fetch('assets/PUP-Hymn.lrc');
            if (!response.ok) throw new Error("Could not load LRC file.");
            const text = await response.text();
            parseLRC(text);
            renderLyrics();
        } catch (error) {
            console.error("Error loading lyrics:", error);
            // Fallback for file:// protocol CORS block
            lyricsWrapper.innerHTML = `
                <div class="lyric-line" style="color:rgba(255,255,255,0.8); font-size:1.5rem; text-align:center;">
                    <span style="color: var(--accent); font-weight: bold;">Local File Blocked by Browser Security.</span><br>
                    You opened this directly without a web server.<br>
                    Please use VS Code Live Server OR select the <b>assets/PUP-Hymn.lrc</b> file below manually to view lyrics:<br><br>
                    <input type="file" id="lrc-upload" accept=".lrc" style="margin-top:20px; font-size: 1rem; color: white;">
                </div>`;

            document.getElementById('lrc-upload').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (event) => {
                    parseLRC(event.target.result);
                    renderLyrics();
                };
                reader.readAsText(file);
            });
        }
    }

    // Parse [mm:ss.xx]<mm:ss.xx>word format
    function parseLRC(lrcText) {
        const lines = lrcText.split('\n');

        lines.forEach((line) => {
            line = line.trim();
            if (!line) return;

            // Extract the main line timestamp [mm:ss.xx]
            const lineTimeMatch = line.match(/^\[(\d{2}):(\d{2}\.\d{2})\]/);
            if (!lineTimeMatch) return; // Skip invalid lines

            const lineMinutes = parseInt(lineTimeMatch[1], 10);
            const lineSeconds = parseFloat(lineTimeMatch[2]);
            const lineStartTime = (lineMinutes * 60) + lineSeconds;

            // Extract words and their precise timestamps <mm:ss.xx>word
            let remainingText = line.substring(lineTimeMatch[0].length);

            // Regex to find all <time>word patterns
            const wordRegex = /<(\d{2}):(\d{2}\.\d{2})>([^<]+)/g;
            let wordMatch;
            const words = [];

            while ((wordMatch = wordRegex.exec(remainingText)) !== null) {
                const wordMin = parseInt(wordMatch[1], 10);
                const wordSec = parseFloat(wordMatch[2]);
                const wordTime = (wordMin * 60) + wordSec;
                const text = wordMatch[3];

                words.push({
                    time: wordTime,
                    text: text
                });
            }

            // Fallback: if no <time> tags found, just add the whole line as one "word"
            if (words.length === 0) {
                words.push({
                    time: lineStartTime,
                    text: remainingText
                });
            }

            lyricsData.push({
                startTime: lineStartTime,
                words: words
            });
        });
    }

    // 2. Render Lyrics to DOM
    function renderLyrics() {
        lyricsWrapper.innerHTML = ''; // Clear placeholder

        lyricsData.forEach((line, lineIndex) => {
            const lineEl = document.createElement('div');
            lineEl.className = 'lyric-line';
            lineEl.dataset.index = lineIndex;
            lineEl.dataset.time = line.startTime;

            // Click entire line to seek
            lineEl.addEventListener('click', (e) => {
                // If clicked empty space on the line, jump to the start of the line
                if (e.target === lineEl) seekAudio(line.startTime);
            });

            // Create Spans for each word
            line.words.forEach((word) => {
                const wordEl = document.createElement('span');
                wordEl.className = 'lyric-word';
                wordEl.dataset.time = word.time;
                wordEl.innerHTML = word.text;

                // Word click seeks precise time
                wordEl.addEventListener('click', (e) => {
                    e.stopPropagation(); // Avoid triggering line click
                    seekAudio(word.time);
                });

                lineEl.appendChild(wordEl);
            });

            lyricsWrapper.appendChild(lineEl);
        });

        // Pre-scroll to first line so it's perfectly centered before playback
        setTimeout(() => {
            const firstLine = lyricsWrapper.querySelector('.lyric-line');
            if (firstLine) {
                const containerCenter = lyricsContainer.clientHeight / 2;
                const lineOffsetTop = firstLine.offsetTop;
                const lineHeight = firstLine.clientHeight;
                lyricsContainer.scrollTo({
                    top: lineOffsetTop - containerCenter + (lineHeight / 2),
                    behavior: 'auto'
                });
            }
        }, 100);
    }

    // 3. Audio Sync Engine (Update DOM based on audio time)
    function syncLyrics() {
        const currentTime = audio.currentTime;
        let newActiveLineIndex = -1;

        // Find current active line
        for (let i = 0; i < lyricsData.length; i++) {
            if (currentTime >= lyricsData[i].startTime) {
                if (i === lyricsData.length - 1 || currentTime < lyricsData[i + 1].startTime) {
                    newActiveLineIndex = i;
                    break;
                }
            }
        }

        const lines = lyricsWrapper.querySelectorAll('.lyric-line');

        // Handle Line Activation & Auto-Scroll
        if (newActiveLineIndex !== activeLineIndex && newActiveLineIndex !== -1) {
            // Remove active from old
            if (activeLineIndex !== -1 && lines[activeLineIndex]) {
                lines[activeLineIndex].classList.remove('active');
                const oldWords = lines[activeLineIndex].querySelectorAll('.lyric-word');
                oldWords.forEach(w => w.classList.remove('read'));
            }

            // Set active to new
            activeLineIndex = newActiveLineIndex;
            const currentLineEl = lines[activeLineIndex];
            currentLineEl.classList.add('active');

            // Smooth scroll
            const containerCenter = lyricsContainer.clientHeight / 2;
            const lineOffsetTop = currentLineEl.offsetTop;
            const lineHeight = currentLineEl.clientHeight;

            const scrollTarget = lineOffsetTop - containerCenter + (lineHeight / 2);

            lyricsContainer.scrollTo({
                top: scrollTarget,
                behavior: 'smooth'
            });
        }

        // Handle Word-by-Word Highlighting within Active Line
        if (activeLineIndex !== -1 && lines[activeLineIndex]) {
            const activeLineEl = lines[activeLineIndex];
            const wordElements = activeLineEl.querySelectorAll('.lyric-word');
            const lineData = lyricsData[activeLineIndex];

            wordElements.forEach((wordEl, index) => {
                const wordTime = lineData.words[index].time;
                if (currentTime >= wordTime) {
                    wordEl.classList.add('read');
                } else {
                    wordEl.classList.remove('read');
                }
            });
        }

        updateProgressBar();
    }

    // 4. Player Controls Logic
    function togglePlayPause() {
        if (audio.paused) {
            audio.play();
            playIcon.classList.remove('ph-play-circle');
            playIcon.classList.add('ph-pause-circle');
        } else {
            audio.pause();
            playIcon.classList.remove('ph-pause-circle');
            playIcon.classList.add('ph-play-circle');
        }
    }

    function seekAudio(time) {
        audio.currentTime = time;
        if (audio.paused) togglePlayPause();
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "0:00";
        const min = Math.floor(seconds / 60);
        const sec = Math.floor(seconds % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    }

    function updateProgressBar() {
        if (!isDraggingProgressBar) {
            const percent = (audio.currentTime / audio.duration) * 100 || 0;
            progressFill.style.width = `${percent}%`;
            currentTimeEl.textContent = formatTime(audio.currentTime);
        }
    }

    // Seek via progress bar click & drag
    let isDraggingProgressBar = false;

    function handleProgressInteraction(e) {
        if (!audio.duration) return;
        const rect = progressBar.getBoundingClientRect();
        // Allow tracking even if mouse slightly escapes valid div bounds
        let clickX = e.clientX - rect.left;
        clickX = Math.max(0, Math.min(clickX, rect.width));
        const width = rect.width;
        const clickPercent = clickX / width;

        // Visually update the bar smoothly during drag
        progressFill.style.width = `${clickPercent * 100}%`;
        currentTimeEl.textContent = formatTime(clickPercent * audio.duration);

        // Actually seek audio when done moving or clicking
        if (!isDraggingProgressBar) {
            seekAudio(clickPercent * audio.duration);
        }
    }

    progressBar.addEventListener('pointerdown', (e) => {
        isDraggingProgressBar = true;
        progressBar.setPointerCapture(e.pointerId);
        handleProgressInteraction(e);
    });

    progressBar.addEventListener('pointermove', (e) => {
        if (isDraggingProgressBar) {
            handleProgressInteraction(e);
        }
    });

    progressBar.addEventListener('pointerup', (e) => {
        if (isDraggingProgressBar) {
            isDraggingProgressBar = false;
            progressBar.releasePointerCapture(e.pointerId);
            const rect = progressBar.getBoundingClientRect();
            let clickX = e.clientX - rect.left;
            clickX = Math.max(0, Math.min(clickX, rect.width));
            seekAudio((clickX / rect.width) * audio.duration);
        }
    });

    // Event Listeners
    audio.addEventListener('timeupdate', syncLyrics);
    audio.addEventListener('loadedmetadata', () => {
        durationEl.textContent = formatTime(audio.duration);
    });
    audio.addEventListener('ended', () => {
        playIcon.classList.remove('ph-pause-circle');
        playIcon.classList.add('ph-play-circle');
        activeLineIndex = -1;
        const lines = lyricsWrapper.querySelectorAll('.lyric-line.active');
        lines.forEach(l => l.classList.remove('active'));
        lyricsContainer.scrollTo({ top: 0, behavior: 'smooth' });
    });

    playPauseBtn.addEventListener('click', togglePlayPause);

    rewindBtn.addEventListener('click', () => {
        audio.currentTime = Math.max(0, audio.currentTime - 5);
    });

    forwardBtn.addEventListener('click', () => {
        audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
    });

    // Fire it up
    loadLyrics();
});
