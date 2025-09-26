const trackList = document.getElementById('track-list');
const hero = {
  container: document.querySelector('.music-hero'),
  cover: document.getElementById('hero-cover'),
  title: document.getElementById('hero-title'),
  description: document.getElementById('hero-description'),
  details: document.getElementById('hero-details'),
  play: document.getElementById('hero-play'),
  seek: document.getElementById('hero-seek'),
  current: document.getElementById('hero-current'),
  duration: document.getElementById('hero-duration'),
  pulses: document.querySelectorAll('.music-hero__pulse span'),
};

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) {
    return '0:00';
  }
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const trackStates = [];
let activeTrack = null;
let currentlyPlaying = null;
let pulseAnimationId = null;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const resetPulse = () => {
  hero.pulses?.forEach((bar) => {
    bar.style.setProperty('--pulse-scale', '0.35');
  });
};

const stopPulse = () => {
  if (pulseAnimationId) {
    cancelAnimationFrame(pulseAnimationId);
    pulseAnimationId = null;
  }
  resetPulse();
};

const updateHeroPlaybackState = () => {
  if (!hero.container || !hero.play) return;
  const isPlaying = Boolean(currentlyPlaying && !currentlyPlaying.audio.paused);
  hero.container.dataset.state = isPlaying ? 'playing' : 'idle';
  hero.play.dataset.state = isPlaying ? 'pause' : 'play';
  hero.play.setAttribute('aria-label', isPlaying ? '一時停止' : '再生');
};

const updateButtonState = (state, playing) => {
  state.button.dataset.state = playing ? 'pause' : 'play';
  state.button.innerHTML = playing ? '⏸' : '▶';
  state.button.setAttribute('aria-label', playing ? '一時停止' : '再生');
};

const syncHeroTime = (state) => {
  if (!activeTrack || state !== activeTrack) return;
  if (!hero.seek || !hero.current || !hero.duration) return;
  const { audio } = state;
  hero.current.textContent = formatTime(audio.currentTime);
  hero.duration.textContent = formatTime(audio.duration);
  if (hero.seek.dataset.seeking !== 'true') {
    const ratio = (audio.currentTime / audio.duration) || 0;
    hero.seek.value = Number.isFinite(ratio) ? ratio : 0;
  }
};

const setActiveTrack = (state) => {
  if (!state) return;
  activeTrack = state;
  trackStates.forEach((item) => {
    item.article.classList.toggle('is-active', item === state);
  });
  if (hero.cover) {
    hero.cover.src = state.track.cover;
    hero.cover.alt = `${state.track.title} カバーアート`;
  }
  if (hero.title) {
    hero.title.textContent = state.track.title;
  }
  if (hero.description) {
    hero.description.textContent = state.track.description;
  }
  if (hero.details) {
    hero.details.textContent = state.track.year ? `${state.track.year} · Studio composition` : 'Original composition';
  }
  syncHeroTime(state);
  updateHeroPlaybackState();
};

const startPulse = () => {
  if (prefersReducedMotion) {
    if (currentlyPlaying) {
      syncHeroTime(currentlyPlaying);
    }
    return;
  }
  if (!hero.pulses || hero.pulses.length === 0) {
    return;
  }
  const step = () => {
    if (!currentlyPlaying || currentlyPlaying.audio.paused) {
      stopPulse();
      return;
    }
    const { audio } = currentlyPlaying;
    const time = audio.currentTime;
    hero.pulses.forEach((bar, index) => {
      const intensity = Math.abs(Math.sin(time * (1.6 + index * 0.2) + index)) * 0.7 + 0.35;
      bar.style.setProperty('--pulse-scale', intensity.toFixed(3));
    });
    syncHeroTime(currentlyPlaying);
    pulseAnimationId = requestAnimationFrame(step);
  };
  if (pulseAnimationId) cancelAnimationFrame(pulseAnimationId);
  pulseAnimationId = requestAnimationFrame(step);
};

const playTrack = (state) => {
  if (currentlyPlaying && currentlyPlaying !== state) {
    updateButtonState(currentlyPlaying, false);
    currentlyPlaying.audio.pause();
  }
  setActiveTrack(state);
  updateButtonState(state, true);
  state.audio.play();
  currentlyPlaying = state;
  updateHeroPlaybackState();
  startPulse();
};

const pauseTrack = (state) => {
  state.audio.pause();
  updateButtonState(state, false);
  if (currentlyPlaying === state) {
    currentlyPlaying = null;
    stopPulse();
  }
  updateHeroPlaybackState();
};

const resetTrack = (state) => {
  pauseTrack(state);
  state.audio.currentTime = 0;
  syncHeroTime(state);
};

const createTrackCard = (track) => {
  const article = document.createElement('article');
  article.className = 'track-card';
  article.setAttribute('role', 'listitem');
  article.tabIndex = 0;

  const media = document.createElement('div');
  media.className = 'track-media';

  const coverWrapper = document.createElement('div');
  coverWrapper.className = 'track-cover-wrapper';
  const cover = document.createElement('img');
  cover.src = track.cover;
  cover.alt = `${track.title} カバーアート`;
  cover.width = 120;
  cover.height = 120;
  cover.loading = 'lazy';
  coverWrapper.appendChild(cover);

  const meta = document.createElement('div');
  meta.className = 'track-meta';
  const title = document.createElement('h3');
  title.textContent = track.title;
  const detail = document.createElement('p');
  detail.textContent = `${track.year} · ${track.description}`;
  meta.append(title, detail);

  media.append(coverWrapper, meta);

  const player = document.createElement('div');
  player.className = 'audio-player';

  const controls = document.createElement('div');
  controls.className = 'audio-controls';

  const button = document.createElement('button');
  button.className = 'audio-button';
  button.type = 'button';
  button.innerHTML = '▶';
  button.dataset.state = 'play';
  button.setAttribute('aria-label', '再生');

  const progressWrapper = document.createElement('div');
  progressWrapper.className = 'progress-wrapper';

  const currentTimeEl = document.createElement('span');
  currentTimeEl.className = 'time-display';
  currentTimeEl.textContent = '0:00';

  const progress = document.createElement('input');
  progress.className = 'progress';
  progress.type = 'range';
  progress.min = 0;
  progress.max = 1;
  progress.step = 0.001;
  progress.value = 0;
  progress.setAttribute('aria-label', `${track.title} のシークバー`);
  progress.dataset.seeking = 'false';

  const durationEl = document.createElement('span');
  durationEl.className = 'time-display';
  durationEl.textContent = '0:00';

  progressWrapper.append(currentTimeEl, progress, durationEl);

  const volumeWrapper = document.createElement('div');
  volumeWrapper.className = 'volume-wrapper';

  const volumeLabel = document.createElement('span');
  volumeLabel.textContent = 'Vol';
  volumeLabel.className = 'visually-hidden';

  const volume = document.createElement('input');
  volume.className = 'volume-range';
  volume.type = 'range';
  volume.min = 0;
  volume.max = 1;
  volume.step = 0.05;
  volume.value = 0.8;
  volume.setAttribute('aria-label', `${track.title} のボリューム`);

  volumeWrapper.append(volumeLabel, volume);

  controls.append(button, progressWrapper, volumeWrapper);
  player.append(controls);

  const audio = new Audio(track.audio);
  audio.preload = 'metadata';
  audio.volume = parseFloat(volume.value);

  const state = {
    track,
    article,
    audio,
    button,
    progress,
    currentTimeEl,
    durationEl,
    volume,
  };

  audio.addEventListener('loadedmetadata', () => {
    durationEl.textContent = formatTime(audio.duration);
    syncHeroTime(state);
  });

  audio.addEventListener('timeupdate', () => {
    if (progress.dataset.seeking !== 'true') {
      progress.value = (audio.currentTime / audio.duration) || 0;
    }
    currentTimeEl.textContent = formatTime(audio.currentTime);
    syncHeroTime(state);
  });

  audio.addEventListener('ended', () => {
    resetTrack(state);
  });

  audio.addEventListener('pause', () => {
    if (currentlyPlaying === state) {
      updateButtonState(state, false);
      currentlyPlaying = null;
      stopPulse();
      updateHeroPlaybackState();
    }
  });

  button.addEventListener('click', () => {
    if (state.audio.paused) {
      playTrack(state);
    } else {
      pauseTrack(state);
    }
  });

  const setSeeking = (flag) => {
    progress.dataset.seeking = flag ? 'true' : 'false';
  };

  progress.addEventListener('input', () => {
    const seekTime = parseFloat(progress.value) * audio.duration;
    if (Number.isFinite(seekTime)) {
      audio.currentTime = seekTime;
    }
  });

  progress.addEventListener('pointerdown', () => setSeeking(true));
  progress.addEventListener('pointerup', () => setSeeking(false));
  progress.addEventListener('pointercancel', () => setSeeking(false));
  progress.addEventListener('mousedown', () => setSeeking(true));
  progress.addEventListener('mouseup', () => setSeeking(false));
  progress.addEventListener('touchstart', () => setSeeking(true), { passive: true });
  progress.addEventListener('touchend', () => setSeeking(false));
  progress.addEventListener('blur', () => setSeeking(false));

  volume.addEventListener('input', () => {
    audio.volume = parseFloat(volume.value);
  });

  const handleKeyboard = (event) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      button.click();
    }
    if (event.key === 'ArrowRight') {
      audio.currentTime = Math.min(audio.currentTime + 5, audio.duration);
    }
    if (event.key === 'ArrowLeft') {
      audio.currentTime = Math.max(audio.currentTime - 5, 0);
    }
  };

  article.addEventListener('keydown', handleKeyboard);
  article.addEventListener('click', (event) => {
    if (!event.target.closest('.audio-controls')) {
      setActiveTrack(state);
    }
  });

  article.addEventListener('focusin', () => setActiveTrack(state));

  trackStates.push(state);
  article.append(media, player);
  return state;
};

const attachHeroControls = () => {
  if (!hero.play || !hero.seek) return;

  hero.play.addEventListener('click', () => {
    if (!activeTrack) {
      if (trackStates[0]) {
        setActiveTrack(trackStates[0]);
        playTrack(trackStates[0]);
      }
      return;
    }
    if (currentlyPlaying === activeTrack && !activeTrack.audio.paused) {
      pauseTrack(activeTrack);
    } else {
      playTrack(activeTrack);
    }
  });

  const setHeroSeeking = (flag) => {
    hero.seek.dataset.seeking = flag ? 'true' : 'false';
  };

  hero.seek.addEventListener('input', () => {
    if (!activeTrack || !Number.isFinite(activeTrack.audio.duration)) {
      return;
    }
    const nextTime = parseFloat(hero.seek.value) * activeTrack.audio.duration;
    if (Number.isFinite(nextTime)) {
      activeTrack.audio.currentTime = nextTime;
      syncHeroTime(activeTrack);
    }
  });

  hero.seek.addEventListener('pointerdown', () => setHeroSeeking(true));
  hero.seek.addEventListener('pointerup', () => setHeroSeeking(false));
  hero.seek.addEventListener('pointercancel', () => setHeroSeeking(false));
  hero.seek.addEventListener('mousedown', () => setHeroSeeking(true));
  hero.seek.addEventListener('mouseup', () => setHeroSeeking(false));
  hero.seek.addEventListener('touchstart', () => setHeroSeeking(true), { passive: true });
  hero.seek.addEventListener('touchend', () => setHeroSeeking(false));
  hero.seek.addEventListener('blur', () => setHeroSeeking(false));
};

resetPulse();

if (trackList) {
  attachHeroControls();
  fetch('data/tracks.json')
    .then((response) => response.json())
    .then((tracks) => {
      tracks.forEach((track) => {
        const state = createTrackCard(track);
        trackList.appendChild(state.article);
      });
      if (trackStates.length > 0) {
        setActiveTrack(trackStates[0]);
      }
    })
    .catch((error) => {
      trackList.innerHTML = '<p>トラック情報を読み込めませんでした。</p>';
      console.error('Failed to load tracks.json', error);
    });
}
