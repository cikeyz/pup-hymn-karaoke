/* === EMBEDDED LRC DATA ===
   Embedded directly to avoid CORS/fetch issues when opening
   via file:// protocol (double-click to open). The LRC uses
   enhanced word-level timestamps: [line]<word>Text <word>Text */
const LRC_DATA = `[00:12.60]<00:12.60>Sintang <00:14.20>Paaralan
[00:15.65]<00:15.65>Tanglaw <00:16.48>ka <00:16.88>ng <00:17.38>bayan
[00:18.52]<00:18.52>Pandayan <00:20.10>ng <00:20.65>isip <00:21.80>ng <00:22.25>kabataan
[00:24.30]<00:24.30>Kami <00:25.10>ay <00:25.55>dumating <00:26.78>nang <00:27.42>salat <00:28.00>sa <00:28.45>yaman
[00:30.00]<00:30.00>Hanap <00:31.00>na <00:31.45>dunong <00:32.70>ay <00:33.25>iyong <00:34.20>alay
[00:35.85]<00:35.85>Ang <00:36.50>layunin <00:38.00>mong <00:38.70>makatao
[00:41.25]<00:41.25>Dinarangal <00:43.70>ang <00:44.70>Pilipino
[00:48.05]<00:48.05>Ang <00:48.50>iyong <00:49.00>aral, <00:50.00>diwa, <00:51.50>adhikang <00:52.50>taglay
[00:54.00]<00:54.00>PUP, <00:55.20>aming <00:56.00>gabay
[00:57.00]<00:57.00>Paaralang <00:59.00>dakila
[01:02.85]<01:02.85>PUP, <01:04.20>pinagpala
[01:09.10]<01:09.10>Gagamitin <01:10.50>ang <01:11.20>karunungan
[01:14.00]<01:14.00>Mula <01:14.60>sa <01:15.10>iyo, <01:16.20>para <01:17.50>sa <01:18.00>bayan
[01:21.05]<01:21.05>Ang <01:21.50>iyong <01:22.00>aral, <01:23.00>diwa, <01:24.50>adhikang <01:25.50>taglay
[01:27.00]<01:27.00>PUP, <01:28.20>aming <01:29.00>gabay
[01:30.00]<01:30.00>Paaralang <01:32.00>dakila
[01:36.00]<01:36.00>PUP, <01:37.20>pinagpala`

/* === DOM REFERENCES === */
const audio = document.getElementById('audio')               // <audio> element
const playBtn = document.getElementById('playBtn')            // play/pause button
const iconPlay = document.getElementById('iconPlay')          // play SVG icon
const iconPause = document.getElementById('iconPause')        // pause SVG icon
const lyricsPanel = document.getElementById('lyricsPanel')    // scrollable lyrics container
const progressContainer = document.getElementById('progressContainer') // seekable bar
const progressFill = document.getElementById('progressFill')  // filled portion
const progressThumb = document.getElementById('progressThumb') // draggable thumb
const timeCurrent = document.getElementById('timeCurrent')    // current time label
const timeTotal = document.getElementById('timeTotal')        // total duration label

/* === APPLICATION STATE === */
let lyricsData = []       // parsed line objects from LRC
let allWords = []         // flat array of every word object (for sync search)
let wordElements = []     // corresponding <span> DOM elements
let activeWordIdx = -1    // index of currently highlighted word
let activeLineIdx = -1    // index of currently highlighted line
let isDragging = false    // true when user is dragging the progress bar

/* === LRC PARSER ===
   Parses enhanced LRC format with word-level timestamps.
   Each line: [MM:SS.XX]<MM:SS.XX>Word1 <MM:SS.XX>Word2 ...
   Returns array of { time, words: [{ text, time }] } objects. */
function parseLRC(text) {
    const lines = text.trim().split('\n')  // split by newline
    const result = []

    lines.forEach(function (line) {
        // Extract line-level timestamp [MM:SS.XX]
        const lineMatch = line.match(/^\[(\d+):(\d+\.\d+)\]/)
        if (!lineMatch) return                 // skip lines without timestamp

        // Convert MM:SS.XX to total seconds
        const lineTime = parseInt(lineMatch[1]) * 60 + parseFloat(lineMatch[2])

        // Extract each word with its timestamp: <MM:SS.XX>WordText
        const wordRegex = /<(\d+):(\d+\.\d+)>([^<\[]*)/g
        const words = []
        let m

        while ((m = wordRegex.exec(line)) !== null) {
            const time = parseInt(m[1]) * 60 + parseFloat(m[2]) // word timestamp in seconds
            const wordText = m[3].trim()         // word text without extra spaces
            if (wordText) words.push({ text: wordText, time: time })
        }

        // Only add lines that have at least one word
        if (words.length > 0) {
            result.push({ time: lineTime, words: words })
        }
    })

    return result
}

/* === LYRICS RENDERER ===
   Creates DOM elements for each lyric line and word.
   Adds spacers at top/bottom so first/last lines can center-scroll. */
function renderLyrics(data) {
    lyricsPanel.innerHTML = ''               // clear placeholder content
    allWords = []                            // reset flat word list
    wordElements = []                        // reset DOM element list

    // Top spacer: pushes first line to vertical center when scrolled
    var topSpacer = document.createElement('div')
    topSpacer.className = 'lyrics-spacer'
    lyricsPanel.appendChild(topSpacer)

    data.forEach(function (line, lineIdx) {
        // Create container div for each lyric line
        var lineEl = document.createElement('div')
        lineEl.className = 'lyric-line'
        lineEl.dataset.line = lineIdx          // store line index for reference

        line.words.forEach(function (word, wordIdx) {
            word.lineIdx = lineIdx               // attach line index to word object

            // Create <span> for each individual word
            var span = document.createElement('span')
            span.className = 'word'
            span.textContent = word.text         // display the word text
            span.dataset.time = word.time        // store timestamp as data attribute

            // Click handler: jump audio to this word's timestamp
            span.addEventListener('click', function () {
                audio.currentTime = word.time      // seek audio to word's time
                syncLyrics(word.time)              // instantly update visual state
                if (audio.paused) audio.play()     // auto-play if paused
            })

            lineEl.appendChild(span)

            // Add a text space between words (not after the last word)
            if (wordIdx < line.words.length - 1) {
                lineEl.appendChild(document.createTextNode(' '))
            }

            allWords.push(word)                  // add to flat word array
            wordElements.push(span)             // add to DOM element array
        })

        // Staggered animation: each line fades in with increasing delay
        lineEl.style.animationDelay = (lineIdx * 50) + 'ms'
        lineEl.classList.add('loaded')          // trigger CSS animation

        lyricsPanel.appendChild(lineEl)
    })

    // Bottom spacer: allows last line to scroll to vertical center
    var bottomSpacer = document.createElement('div')
    bottomSpacer.className = 'lyrics-spacer'
    lyricsPanel.appendChild(bottomSpacer)
}

/* === AUDIO SYNC ENGINE ===
   Called on every timeupdate event and after seek.
   Finds the active word via reverse linear scan,
   highlights it, marks sung words, and scrolls the panel. */
function syncLyrics(currentTime) {
    // Reverse scan: find the last word whose timestamp <= currentTime
    var newWordIdx = -1
    for (var i = allWords.length - 1; i >= 0; i--) {
        if (currentTime >= allWords[i].time) {
            newWordIdx = i
            break                                // found the most recent word
        }
    }

    // If nothing changed, skip all DOM updates for performance
    if (newWordIdx === activeWordIdx) return

    // Remove highlight from previously active word
    if (activeWordIdx >= 0 && activeWordIdx < wordElements.length) {
        wordElements[activeWordIdx].classList.remove('active')
    }

    // Determine which line the new active word belongs to
    var newLineIdx = newWordIdx >= 0 ? allWords[newWordIdx].lineIdx : -1

    // If the line changed, update line-level styling and scroll
    if (newLineIdx !== activeLineIdx) {
        // Clear all "sung" markers from previous line
        wordElements.forEach(function (el) { el.classList.remove('sung') })

        // Update line classes: active, past, or default (future)
        var lineEls = lyricsPanel.querySelectorAll('.lyric-line')
        lineEls.forEach(function (el, idx) {
            el.classList.remove('active', 'past')
            if (idx === newLineIdx) el.classList.add('active')       // current line
            else if (idx < newLineIdx) el.classList.add('past')      // already sung
        })

        // Auto-scroll the active line to the vertical center of the panel
        if (newLineIdx >= 0 && lineEls[newLineIdx]) {
            lineEls[newLineIdx].scrollIntoView({
                behavior: 'smooth',               // smooth scroll animation
                block: 'center'                    // center in viewport
            })
        }

        activeLineIdx = newLineIdx             // update tracked line index
    }

    // Mark all words before the active word (on the same line) as "sung"
    if (newWordIdx >= 0) {
        // Find the global index of the first word on this line
        var firstWordOfLine = 0
        for (var j = 0; j < allWords.length; j++) {
            if (allWords[j].lineIdx === newLineIdx) {
                firstWordOfLine = j
                break
            }
        }
        // Apply "sung" class to all words between line start and active word
        for (var k = firstWordOfLine; k < newWordIdx; k++) {
            if (allWords[k].lineIdx === newLineIdx) {
                wordElements[k].classList.add('sung')
            }
        }

        // Highlight the currently active word
        wordElements[newWordIdx].classList.add('active')
    }

    activeWordIdx = newWordIdx               // update tracked word index
}

/* === PLAY / PAUSE TOGGLE === */
playBtn.addEventListener('click', function () {
    if (audio.paused) {
        audio.play()                           // start playback
    } else {
        audio.pause()                          // pause playback
    }
})

// Swap play/pause icon when audio state changes
audio.addEventListener('play', function () {
    iconPlay.style.display = 'none'          // hide play icon
    iconPause.style.display = 'block'        // show pause icon
})
audio.addEventListener('pause', function () {
    iconPlay.style.display = 'block'         // show play icon
    iconPause.style.display = 'none'         // hide pause icon
})

/* === TIME UPDATE (main sync loop) ===
   Fires ~4 times per second during playback.
   Updates progress bar and triggers lyric sync. */
audio.addEventListener('timeupdate', function () {
    if (!isDragging) {                       // don't override during drag
        var ratio = audio.currentTime / (audio.duration || 1)
        updateProgressBar(ratio)               // update visual progress
    }
    syncLyrics(audio.currentTime)            // sync word highlighting
    timeCurrent.textContent = formatTime(audio.currentTime) // update time label
})

// Display total duration once audio metadata is loaded
audio.addEventListener('loadedmetadata', function () {
    timeTotal.textContent = formatTime(audio.duration)
})
// Fallback: some browsers resolve duration asynchronously
audio.addEventListener('durationchange', function () {
    timeTotal.textContent = formatTime(audio.duration)
})

/* === PROGRESS BAR: CLICK + DRAG SEEKING ===
   Supports both mouse and touch events.
   Seeking instantly resyncs lyrics via syncLyrics(). */

// Calculate seek position from pointer X coordinate
function seekToPosition(clientX) {
    var rect = progressContainer.getBoundingClientRect()
    // Clamp X position within the progress bar bounds
    var x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    var ratio = x / rect.width              // 0.0 to 1.0
    audio.currentTime = ratio * (audio.duration || 0) // seek audio
    updateProgressBar(ratio)                 // update bar visually
    syncLyrics(audio.currentTime)            // instantly resync lyrics
}

// Set the progress bar fill width and thumb position
function updateProgressBar(ratio) {
    var pct = (ratio * 100).toFixed(2) + '%'
    progressFill.style.width = pct           // fill width
    progressThumb.style.left = pct           // thumb position
}

// --- Mouse events for desktop ---
progressContainer.addEventListener('mousedown', function (e) {
    isDragging = true                        // enter drag mode
    progressContainer.classList.add('dragging') // show thumb via CSS
    seekToPosition(e.clientX)                // seek to click position
})
document.addEventListener('mousemove', function (e) {
    if (isDragging) seekToPosition(e.clientX) // update while dragging
})
document.addEventListener('mouseup', function () {
    if (isDragging) {
        isDragging = false                     // exit drag mode
        progressContainer.classList.remove('dragging')
    }
})

// --- Touch events for mobile ---
progressContainer.addEventListener('touchstart', function (e) {
    isDragging = true
    progressContainer.classList.add('dragging')
    seekToPosition(e.touches[0].clientX)
}, { passive: true })                      // passive for scroll performance
document.addEventListener('touchmove', function (e) {
    if (isDragging) seekToPosition(e.touches[0].clientX)
}, { passive: true })
document.addEventListener('touchend', function () {
    if (isDragging) {
        isDragging = false
        progressContainer.classList.remove('dragging')
    }
})

/* === RESET ON AUDIO END ===
   Clears all highlighting when the track finishes. */
audio.addEventListener('ended', function () {
    activeWordIdx = -1                       // reset word tracker
    activeLineIdx = -1                       // reset line tracker
    // Remove all word highlight classes
    wordElements.forEach(function (el) {
        el.classList.remove('active', 'sung')
    })
    // Mark all lines as past (fully sung)
    lyricsPanel.querySelectorAll('.lyric-line').forEach(function (el) {
        el.classList.remove('active')
        el.classList.add('past')
    })
})

/* === UTILITY: Format seconds to M:SS display string === */
function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00'        // guard against NaN
    var m = Math.floor(seconds / 60)         // whole minutes
    var s = Math.floor(seconds % 60)         // remaining seconds
    return m + ':' + (s < 10 ? '0' : '') + s // pad seconds with leading zero
}

/* === INITIALIZATION ===
   Parse LRC data and render lyrics on page load. */
function init() {
    lyricsData = parseLRC(LRC_DATA)          // parse embedded LRC string
    renderLyrics(lyricsData)                 // build DOM elements
}

init() // execute on script load
