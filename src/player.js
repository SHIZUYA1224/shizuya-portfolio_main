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
    hero.details.textContent = state.track.year ? `${state.track.year} · スタジオ制作` : 'オリジナル楽曲';
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
    currentlyPlaying.audio.pause();
  }
  setActiveTrack(state);
  state.audio.play();
  currentlyPlaying = state;
  updateHeroPlaybackState();
  startPulse();
};

const pauseTrack = (state) => {
  state.audio.pause();
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

  const audio = new Audio(track.audio);
  audio.preload = 'metadata';
  audio.volume = 0.85;

  const state = {
    track,
    article,
    audio,
  };

  audio.addEventListener('loadedmetadata', () => {
    syncHeroTime(state);
  });

  audio.addEventListener('timeupdate', () => {
    if (currentlyPlaying !== state) {
      return;
    }
    syncHeroTime(state);
  });

  audio.addEventListener('ended', () => {
    resetTrack(state);
  });

  audio.addEventListener('pause', () => {
    if (currentlyPlaying === state) {
      currentlyPlaying = null;
      stopPulse();
      updateHeroPlaybackState();
    }
  });

  const activateTrack = () => {
    if (currentlyPlaying && currentlyPlaying !== state) {
      pauseTrack(currentlyPlaying);
    }
    setActiveTrack(state);
    state.audio.pause();
    state.audio.currentTime = 0;
    syncHeroTime(state);
  };

  article.addEventListener('click', () => {
    activateTrack();
  });

  article.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activateTrack();
      hero.play?.focus({ preventScroll: true });
    }
  });

  article.addEventListener('focusin', () => setActiveTrack(state));

  trackStates.push(state);
  article.append(media);
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
