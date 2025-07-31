// Playlist source
const playlistURL = 'https://iptv-org.github.io/iptv/countries/ph.m3u';

// DOM refs
const channelListEl = document.getElementById('channelList');
const searchInput = document.getElementById('search');
const video = document.getElementById('video');
const playPauseBtn = document.getElementById('playPauseBtn');
const muteBtn = document.getElementById('muteBtn');
const fsBtn = document.getElementById('fsBtn');
const progressInner = document.getElementById('progressInner');
const progressBar = document.getElementById('progressBar');
const timeDisplay = document.getElementById('timeDisplay');
const currentTitle = document.getElementById('currentTitle');
const statusText = document.getElementById('statusText');
const fallbackNotice = document.getElementById('fallbackNotice');

let hlsInstance = null;
let channels = [];
let filtered = [];
let currentChannel = null;

// Parse .m3u content
function parseM3U(content) {
  const lines = content.split(/\r?\n/).map(l => l.trim());
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (line.startsWith('#EXTINF')) {
      const info = {};
      const rest = line.substring(8);
      const parts = rest.split(',');
      const metaPart = parts.slice(0, -1).join(',');
      const displayName = parts.slice(-1)[0].trim();
      info.displayName = displayName;
      const attrRegex = /([a-zA-Z0-9\-]+?)="(.*?)"/g;
      let m;
      while ((m = attrRegex.exec(metaPart)) !== null) {
        info[m[1]] = m[2];
      }
      result.push({ meta: info, url: null });
    } else if (line.startsWith('#')) {
      continue;
    } else {
      if (result.length > 0 && !result[result.length - 1].url) {
        result[result.length - 1].url = line;
      }
    }
  }
  return result
    .filter(e => e.url)
    .map(e => ({
      name: e.meta.displayName || e.meta['tvg-name'] || 'Unknown',
      url: e.url,
      group: e.meta['group-title'] || '',
      logo: e.meta['tvg-logo'] || ''
    }));
}

async function loadPlaylist() {
  channelListEl.textContent = 'Fetching playlist...';
  try {
    const res = await fetch(playlistURL);
    if (!res.ok) throw new Error('Failed to fetch playlist');
    const txt = await res.text();
    channels = parseM3U(txt);
    filtered = channels.slice();
    if (channels.length === 0) {
      channelListEl.textContent = 'No channels parsed.';
      return;
    }
    renderChannelList();
    selectChannel(filtered[0]);
  } catch (e) {
    console.error(e);
    channelListEl.textContent = 'Error loading playlist.';
    statusText.textContent = 'Playlist load error';
    fallbackNotice.style.display = 'block';
  }
}

function renderChannelList() {
  channelListEl.innerHTML = '';
  if (filtered.length === 0) {
    channelListEl.textContent = 'No channels match search.';
    return;
  }
  filtered.forEach(ch => {
    const div = document.createElement('div');
    div.className = 'channel-item' + (currentChannel === ch ? ' active' : '');
    div.setAttribute('role','button');
    div.setAttribute('tabindex','0');
    div.innerHTML = `
      <div style="flex:1; overflow:hidden; white-space:nowrap; text-overflow:ellipsis;">${ch.name}</div>
      ${ch.group? `<div style="opacity:.6; font-size:11px; margin-left:6px;">${ch.group}</div>`: ''}
    `;
    div.addEventListener('click', () => selectChannel(ch));
    div.addEventListener('keydown', e => { if (e.key === 'Enter') selectChannel(ch); });
    channelListEl.appendChild(div);
  });
}

function filterChannels(term) {
  const low = term.trim().toLowerCase();
  filtered = channels.filter(c => c.name.toLowerCase().includes(low) || (c.group && c.group.toLowerCase().includes(low)));
  renderChannelList();
}

function selectChannel(ch) {
  if (!ch || !ch.url) return;
  currentChannel = ch;
  updateActiveInList();
  currentTitle.textContent = ch.name;
  statusText.textContent = 'Loading...';
  playStream(ch.url);
}

function updateActiveInList() {
  Array.from(channelListEl.children).forEach(el => {
    el.classList.remove('active');
    if (el.textContent.trim().startsWith(currentChannel?.name)) {
      el.classList.add('active');
    }
  });
}

function playStream(url) {
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  video.pause();
  video.src = '';
  video.removeAttribute('src');
  video.load();

  const attemptPlay = () => {
    video.play()
      .then(() => {
        playPauseBtn.textContent = 'Pause ⏸️';
        statusText.textContent = 'Playing';
      })
      .catch(() => {
        playPauseBtn.textContent = 'Play ▶️';
        statusText.textContent = 'Paused (interaction required)';
      });
  };

  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    video.addEventListener('loadedmetadata', () => {
      attemptPlay();
    }, { once: true });
  } else if (window.Hls && Hls.isSupported()) {
    hlsInstance = new Hls({ maxBufferLength: 30 });
    hlsInstance.loadSource(url);
    hlsInstance.attachMedia(video);
    hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
      attemptPlay();
    });
    hlsInstance.on(Hls.Events.ERROR, (event, data) => {
      console.warn('HLS error', data);
      statusText.textContent = 'Stream error';
      fallbackNotice.style.display = 'block';
    });
  } else {
    statusText.textContent = 'Unsupported format';
    fallbackNotice.style.display = 'block';
    video.innerHTML = 'HLS not supported.';
  }
}

// Controls
playPauseBtn.addEventListener('click', async () => {
  if (video.paused) {
    try {
      await video.play();
      playPauseBtn.textContent = 'Pause ⏸️';
      statusText.textContent = 'Playing';
    } catch {
      statusText.textContent = 'Interaction required';
    }
  } else {
    video.pause();
    playPauseBtn.textContent = 'Play ▶️';
    statusText.textContent = 'Paused';
  }
});

muteBtn.addEventListener('click', () => {
  video.muted = !video.muted;
  muteBtn.textContent = video.muted ? 'Unmute 🔈' : 'Mute 🔇';
});

fsBtn.addEventListener('click', () => {
  const wrapper = document.documentElement;
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  } else {
    if (wrapper.requestFullscreen) wrapper.requestFullscreen();
    else if (wrapper.webkitRequestFullscreen) wrapper.webkitRequestFullscreen();
  }
});

function updateTimeUI() {
  const current = video.currentTime;
  const total = video.duration;
  if (!isNaN(total) && total > 0) {
    const pct = (current / total) * 100;
    progressInner.style.width = pct + '%';
    timeDisplay.textContent = `${formatTime(current)} / ${formatTime(total)}`;
  }
}
function formatTime(sec) {
  if (isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

video.addEventListener('timeupdate', updateTimeUI);
video.addEventListener('durationchange', updateTimeUI);
video.addEventListener('loadedmetadata', updateTimeUI);
video.addEventListener('ended', () => {
  playPauseBtn.textContent = 'Replay 🔁';
  statusText.textContent = 'Ended';
});

progressBar.addEventListener('click', e => {
  const rect = progressBar.getBoundingClientRect();
  const pct = (e.clientX - rect.left) / rect.width;
  if (!isNaN(video.duration)) {
    video.currentTime = pct * video.duration;
  }
});
progressBar.addEventListener('keydown', e => {
  if (isNaN(video.duration)) return;
  if (e.key === 'ArrowRight') {
    video.currentTime = Math.min(video.duration, video.currentTime + 5);
  } else if (e.key === 'ArrowLeft') {
    video.currentTime = Math.max(0, video.currentTime - 5);
  }
});

searchInput.addEventListener('input', e => {
  filterChannels(e.target.value);
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && currentChannel && !video.paused) {
    video.play().catch(() => {});
  }
});

window.addEventListener('load', async () => {
  video.muted = true;
  await loadPlaylist();
  try { await video.play(); } catch {}
});
