/* --- 1. LRC DATA (the lyrics + timestamps) ---
   This uses an LRC-style format where the whole line has a timestamp
   and each word can also have its own timestamp inside angle brackets.
   That is what makes the per-word karaoke highlighting possible.

   I kept the lyrics directly in this file as a template literal instead of
   loading them from another file. That avoids file:// CORS issues when
   opening index.html directly without running a local server. */

const LRC_DATA = `[00:00.00]<00:00.00>♪ Instrumental ♪
[00:12.67]<00:12.67>Sintang <00:13.73>Paaralan
[00:15.32]<00:15.32>Tanglaw <00:15.89>ka <00:16.45>ng <00:17.14>bayan
[00:18.69]<00:18.69>Pandayan <00:19.85>ng <00:20.35>isip <00:21.84>ng <00:22.45>kabataan
[00:24.46]<00:24.46>Kami <00:25.14>ay <00:25.43>dumating <00:26.54>nang <00:26.96>salat <00:28.16>sa <00:28.52>yaman
[00:29.88]<00:29.88>Hanap <00:30.10>na <00:30.55>dunong <00:32.48>ay <00:33.18>iyong <00:33.48>alay
[00:36.00]<00:36.00>Ang <00:36.20>layunin <00:38.25>mong <00:39.11>makatao
[00:41.87]<00:41.87>Dinarangal <00:44.16>ang <00:44.75>Pilipino
[00:47.88]<00:47.88>Ang <00:48.13>iyong <00:48.53>aral, <00:49.77>diwa, <00:50.91>adhikang <00:52.41>taglay
[00:53.30]<00:53.30>PUP, <00:54.67>aming <00:55.57>gabay
[00:56.51]<00:56.51>Paaralang <00:58.98>dakila
[01:02.13]<01:02.13>PUP, <01:04.25>pinagpala
[01:08.64]<01:08.64>Gagamitin <01:11.06>ang <01:12.05>karunungan
[01:14.34]<01:14.34>Mula <01:15.01>sa <01:15.48>iyo, <01:17.30>para <01:18.17>sa <01:18.57>bayan
[01:20.57]<01:20.57>Ang <01:21.10>iyong <01:21.17>aral, <01:22.57>diwa, <01:24.12>adhikang <01:25.40>taglay
[01:25.99]<01:25.99>PUP, <01:27.32>aming <01:28.47>gabay
[01:29.23]<01:29.23>Paaralang <01:32.18>dakila
[01:34.90]<01:34.90>PUP, <01:37.85>pinagpala`;

/* --- 2. DOM REFERENCES ---
   I grab these elements once at the start so the script can reuse them
   instead of repeatedly calling getElementById later on. */
const audio = document.getElementById("audio");
const playBtn = document.getElementById("playBtn");
const rewindBtn = document.getElementById("rewind-btn");
const forwardBtn = document.getElementById("forward-btn");
const iconPlay = document.getElementById("iconPlay");
const iconPause = document.getElementById("iconPause");
const lyricsPanel = document.getElementById("lyricsPanel");
const progressContainer = document.getElementById("progressContainer");
const progressFill = document.getElementById("progressFill");
const timeCurrent = document.getElementById("timeCurrent");
const timeTotal = document.getElementById("timeTotal");

/* --- 3. STATE ---
   These variables keep track of the current playback and lyric state.
   I used `var` here for simpler ES5-style compatibility in this project. */
var allWords = []; // Flat array of every word: [{text, time, lineIdx}, ...]
var wordElements = []; // Parallel array of <span> DOM elements for each word
var activeWordIdx = -1; // Index of the currently highlighted word (-1 = none)
var activeLineIdx = -1; // Index of the currently active line (-1 = none)
var isUserScrolling = false; // True when user manually scrolled lyrics (pauses auto-scroll)
var scrollResumeTimer = null; // setTimeout ID for resuming auto-scroll after 4s

function parseLRC(text) {
  var lines = text.trim().split("\n");
  var result = [];

  lines.forEach(function (line) {
    var lineMatch = line.match(/^\[(\d+):(\d+\.\d+)\]/);
    if (!lineMatch) return;
    var lineTime = parseInt(lineMatch[1]) * 60 + parseFloat(lineMatch[2]);

    var wordRegex = /<(\d+):(\d+\.\d+)>([^<\[]*)/g;
    var words = [];
    var m;
    while ((m = wordRegex.exec(line)) !== null) {
      var time = parseInt(m[1]) * 60 + parseFloat(m[2]);
      var wordText = m[3].trim();
      if (wordText) words.push({ text: wordText, time: time });
    }

    if (words.length > 0) {
      var lineText = words
        .map(function (w) {
          return w.text;
        })
        .join(" ");
      var hasInstrumentalMarker =
        lineText.indexOf("Instrumental") >= 0 || lineText.indexOf("♪") >= 0;
      result.push({
        time: lineTime,
        words: words,
        isInstrumental: hasInstrumentalMarker,
      });
    }
  });

  return result;
}

/* --- 5. RENDER LYRICS ---
   This builds the lyric elements inside the lyrics panel.
   Each line becomes a <div class="lyric-line"> and each word gets its own span.

   The spacer divs at the top and bottom give enough room for the first and
   last lines to still scroll into the middle of the panel.

   Every word is also clickable, so clicking it jumps the audio to that word
   and starts playback from there. */
function renderLyrics(data) {
  lyricsPanel.innerHTML = "";
  allWords = [];
  wordElements = [];

  // Small helper for the top/bottom spacer blocks used in centering
  function addSpacer() {
    var s = document.createElement("div");
    s.className = "lyrics-spacer";
    lyricsPanel.appendChild(s);
  }

  addSpacer(); // top spacer

  data.forEach(function (line, lineIdx) {
    var lineEl = document.createElement("div");
    lineEl.className = "lyric-line";
    if (line.isInstrumental) lineEl.classList.add("instrumental");

    line.words.forEach(function (word, wordIdx) {
      word.lineIdx = lineIdx;
      var span = document.createElement("span");
      span.className = "word";
      span.textContent = word.text;

      // Clicking a word jumps right to that exact timestamp
      span.addEventListener("click", function () {
        audio.currentTime = word.time;
        syncLyrics(word.time);
        if (audio.paused) audio.play();
      });

      lineEl.appendChild(span);
      if (wordIdx < line.words.length - 1) {
        lineEl.appendChild(document.createTextNode(" "));
      }

      allWords.push(word);
      wordElements.push(span);
    });

    lyricsPanel.appendChild(lineEl);
  });

  addSpacer(); // bottom spacer
}

function scrollToLine(lineEl) {
  if (!lineEl || isUserScrolling) return;
  var panelHeight = lyricsPanel.clientHeight;
  var targetScroll =
    lineEl.offsetTop - panelHeight / 2 + lineEl.offsetHeight / 2;
  lyricsPanel.scrollTo({ top: targetScroll, behavior: "smooth" });
}

/* --- 7. PAUSE AUTO-SCROLL ON MANUAL SCROLL ---
   If the user scrolls the lyrics panel on purpose, auto-centering pauses
   for 4 seconds first. That way the panel does not snap back immediately
   while the user is trying to read ahead or look around.

   { passive: true } tells the browser this listener will not block scrolling,
   which helps keep scrolling smoother. */
function handleUserScroll() {
  isUserScrolling = true;
  if (scrollResumeTimer) clearTimeout(scrollResumeTimer);
  scrollResumeTimer = setTimeout(function () {
    isUserScrolling = false;
  }, 4000);
}

lyricsPanel.addEventListener("wheel", handleUserScroll, { passive: true });
lyricsPanel.addEventListener(
  "touchstart",
  function (e) {
    if (e.target.closest(".lyrics-panel")) handleUserScroll();
  },
  { passive: true },
);

/* --- 8. SYNC LYRICS ---
   This is the main syncing part. It runs during timeupdate events and also
   after manual seeks, then decides which word and line should look active.

   Basic flow:
   1. Scan backward through allWords to find the latest word at or before currentTime
   2. Stop early if that word is already active
   3. Clear old classes, update line states, and mark past words as sung
   4. Highlight the new active word

   Line states:
   - .active = current line being sung
   - .past = already finished
   - default = upcoming and still dimmed

   Word states:
   - .active = current word
   - .sung = already passed word */
function syncLyrics(currentTime) {
  var newIdx = -1;
  for (var i = allWords.length - 1; i >= 0; i--) {
    if (currentTime >= allWords[i].time) {
      newIdx = i;
      break;
    }
  }

  if (newIdx === activeWordIdx) return;

  if (activeWordIdx >= 0 && activeWordIdx < wordElements.length) {
    wordElements[activeWordIdx].classList.remove("active");
  }

  wordElements.forEach(function (el) {
    el.classList.remove("sung");
  });

  var newLineIdx = newIdx >= 0 ? allWords[newIdx].lineIdx : -1;
  if (newLineIdx !== activeLineIdx) {
    var lines = lyricsPanel.querySelectorAll(".lyric-line");
    lines.forEach(function (lineEl, idx) {
      lineEl.classList.remove("active", "past");
      if (idx === newLineIdx) lineEl.classList.add("active");
      else if (idx < newLineIdx) lineEl.classList.add("past");
    });
    if (newLineIdx >= 0 && lines[newLineIdx]) scrollToLine(lines[newLineIdx]);
    activeLineIdx = newLineIdx;
  }

  for (var k = 0; k < newIdx; k++) wordElements[k].classList.add("sung");

  if (newIdx >= 0 && newIdx < wordElements.length) {
    wordElements[newIdx].classList.add("active");
  }

  activeWordIdx = newIdx;
}

/* --- 9. PLAYBACK CONTROLS ---
   These handlers cover play/pause plus the 5-second rewind/forward buttons.
   Rewind and forward are clamped so the current time stays inside the track.

   The icon swap listens to the audio events themselves.
   That is a bit safer than only checking audio.paused from the button click
   because other actions can also trigger play or pause. */
playBtn.addEventListener("click", function () {
  if (audio.paused) audio.play();
  else audio.pause();
});
rewindBtn.addEventListener("click", function () {
  audio.currentTime = Math.max(0, audio.currentTime - 5);
});
forwardBtn.addEventListener("click", function () {
  audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
});

// Swap the visible icon based on the actual audio state
audio.addEventListener("play", function () {
  iconPlay.style.display = "none";
  iconPause.style.display = "block";
});
audio.addEventListener("pause", function () {
  iconPlay.style.display = "block";
  iconPause.style.display = "none";
});

/* --- 10. TIMEUPDATE, METADATA & PROGRESS ---
   timeupdate runs a few times per second while the audio plays.
   Each run updates the progress width, syncs the lyrics, and refreshes
   the current time label.

   loadedmetadata runs once the browser already knows the track duration,
   so that is where the total time label gets filled in.

   Clicking the progress bar converts the click position into a ratio,
   then seeks the audio to that matching part of the song. */
audio.addEventListener("timeupdate", function () {
  progressFill.style.width =
    ((audio.currentTime / (audio.duration || 1)) * 100).toFixed(2) + "%";
  syncLyrics(audio.currentTime);
  timeCurrent.textContent = formatTime(audio.currentTime);
});

audio.addEventListener("loadedmetadata", function () {
  timeTotal.textContent = formatTime(audio.duration);
});

progressContainer.addEventListener("click", function (e) {
  var rect = progressContainer.getBoundingClientRect();
  var ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
  audio.currentTime = ratio * (audio.duration || 0);
  progressFill.style.width = (ratio * 100).toFixed(2) + "%";
  syncLyrics(audio.currentTime);
});

/* --- 11. SONG ENDED ---
   Once the song finishes, everything gets marked as completed.
   This keeps the finished look on screen instead of leaving the last
   word stuck in the active state. */
audio.addEventListener("ended", function () {
  activeWordIdx = -1;
  activeLineIdx = -1;
  wordElements.forEach(function (el) {
    el.classList.remove("active");
    el.classList.add("sung");
  });
  lyricsPanel.querySelectorAll(".lyric-line").forEach(function (el) {
    el.classList.remove("active");
    el.classList.add("past");
  });
});

/* --- 12. FORMAT TIME ---
   Converts raw seconds like 83.5 into a friendlier M:SS format like 1:23.
   It returns 0:00 for NaN, which can happen before the audio metadata is ready. */
function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  var m = Math.floor(seconds / 60);
  var s = Math.floor(seconds % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

/* --- 13. INIT ---
   Parse the lyric data first, then render it into the page. */
renderLyrics(parseLRC(LRC_DATA));
