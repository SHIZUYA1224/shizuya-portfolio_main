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
  volume: document.getElementById('hero-volume'),
  pulses: document.querySelectorAll('.music-hero__pulse span'),
};

const nowPlaying = {
  container: document.querySelector('.now-playing'),
  cover: document.getElementById('bar-cover'),
  title: document.getElementById('bar-title'),
  description: document.getElementById('bar-description'),
  play: document.getElementById('bar-play'),
  seek: document.getElementById('bar-seek'),
  current: document.getElementById('bar-current'),
  duration: document.getElementById('bar-duration'),
  volume: document.getElementById('bar-volume'),
};

const insight = {
  container: document.getElementById('hero-insight'),
  toggle: document.querySelector('.music-hero__insight-toggle'),
  toggleLabel: document.querySelector('.music-hero__insight-toggle-label'),
  title: document.getElementById('hero-insight-title'),
  text: document.getElementById('hero-insight-text'),
  processSection: document.getElementById('hero-insight-process'),
  processList: document.getElementById('hero-process-list'),
  gearSection: document.getElementById('hero-insight-gear'),
  gearList: document.getElementById('hero-gear-list'),
  media: document.getElementById('hero-insight-media'),
};

if (insight.container) {
  insight.container.hidden = true;
}
if (insight.toggle) {
  insight.toggle.hidden = true;
  insight.toggle.setAttribute('aria-expanded', 'false');
}

const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
let masterVolume = clamp01(parseFloat(hero.volume?.value ?? nowPlaying.volume?.value ?? '0.85'));

const updateVolumeUI = (source) => {
  if (hero.volume && hero.volume !== source) {
    hero.volume.value = masterVolume.toString();
  }
  if (nowPlaying.volume && nowPlaying.volume !== source) {
    nowPlaying.volume.value = masterVolume.toString();
  }
};

const applyVolume = (value, source) => {
  masterVolume = clamp01(value);
  trackStates.forEach(({ audio }) => {
    audio.volume = masterVolume;
  });
  updateVolumeUI(source);
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

const clearElement = (element) => {
  if (!element) return;
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
};

const setInsightToggleLabel = (expanded) => {
  if (!insight.toggle) return;
  const baseLabel = insight.toggle.dataset.label ?? '制作ノート';
  const nextLabel = expanded ? `${baseLabel}を隠す` : `${baseLabel}を表示`;
  if (insight.toggleLabel) {
    insight.toggleLabel.textContent = nextLabel;
  } else {
    insight.toggle.textContent = nextLabel;
  }
};

const setInsightExpanded = (expanded) => {
  if (!insight.container || !insight.toggle) {
    return;
  }
  if (expanded) {
    insight.container.hidden = false;
    insight.toggle.setAttribute('aria-expanded', 'true');
  } else {
    insight.container.hidden = true;
    insight.toggle.setAttribute('aria-expanded', 'false');
  }
  setInsightToggleLabel(expanded);
  if (hero.container) {
    hero.container.dataset.insight = expanded ? 'open' : 'closed';
  }
};

const populateInsight = (state) => {
  if (!insight.toggle || !insight.container) {
    return;
  }
  const insightData = state.track.insight;
  if (!insightData) {
    insight.toggle.hidden = true;
    insight.container.hidden = true;
    if (hero.container) {
      hero.container.dataset.insight = 'closed';
    }
    return;
  }

  insight.toggle.hidden = false;
  insight.toggle.dataset.label = insightData.title || '制作ノート';
  setInsightExpanded(false);

  if (insight.title) {
    insight.title.textContent = insightData.title || state.track.title;
  }
  if (insight.text) {
    insight.text.textContent = insightData.notes || 'この楽曲の制作メモを追加してください。';
  }

  if (insight.processSection) {
    insight.processSection.hidden = true;
  }
  clearElement(insight.processList);
  if (Array.isArray(insightData.process) && insight.processList) {
    const hasProcess = insightData.process.length > 0;
    if (hasProcess && insight.processSection) {
      insight.processSection.hidden = false;
    }
    insightData.process.forEach((step, index) => {
      const li = document.createElement('li');
      if (typeof step === 'string') {
        li.textContent = step;
      } else if (step && typeof step === 'object') {
        const title = document.createElement('strong');
        title.className = 'music-hero__process-item-title';
        title.textContent = step.title || `ステップ${index + 1}`;
        li.appendChild(title);
        if (step.detail) {
          const detail = document.createElement('span');
          detail.className = 'music-hero__process-item-detail';
          detail.textContent = step.detail;
          li.appendChild(detail);
        }
      }
      insight.processList.appendChild(li);
    });
  }

  if (insight.gearSection) {
    insight.gearSection.hidden = true;
  }
  clearElement(insight.gearList);
  if (Array.isArray(insightData.gear) && insight.gearList) {
    const hasGear = insightData.gear.length > 0;
    if (hasGear && insight.gearSection) {
      insight.gearSection.hidden = false;
    }
    insightData.gear.forEach((gear) => {
      const li = document.createElement('li');
      if (typeof gear === 'string') {
        li.textContent = gear;
      } else if (gear && typeof gear === 'object') {
        const name = gear.name || gear.title || '機材';
        const role = gear.role || gear.note;
        const label = document.createElement('span');
        label.className = 'music-hero__gear-item-label';
        label.textContent = name;
        li.appendChild(label);
        if (role) {
          const meta = document.createElement('span');
          meta.className = 'music-hero__gear-item-meta';
          meta.textContent = role;
          li.appendChild(meta);
        }
      }
      insight.gearList.appendChild(li);
    });
  }

  clearElement(insight.media);
  let hasMedia = false;
  if (insightData.media && Array.isArray(insightData.media) && insight.media) {
    insightData.media.forEach((item, index) => {
      const value = typeof item === 'string' ? { type: 'image', src: item } : item;
      if (!value || !value.src) return;
      if (value.type === 'video') {
        const video = document.createElement('video');
        video.src = value.src;
        video.controls = true;
        video.setAttribute('aria-label', value.alt || `${state.track.title} メイキング映像 ${index + 1}`);
        insight.media.appendChild(video);
        hasMedia = true;
      } else {
        const img = document.createElement('img');
        img.src = value.src;
        img.alt = value.alt || `${state.track.title} 制作イメージ ${index + 1}`;
        insight.media.appendChild(img);
        hasMedia = true;
      }
    });
  }
  if (insight.media) {
    if (hasMedia) {
      insight.media.hidden = false;
      insight.media.setAttribute('aria-hidden', 'false');
    } else {
      insight.media.hidden = true;
      insight.media.setAttribute('aria-hidden', 'true');
    }
  }
};

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

const updatePlayButtons = (isPlaying) => {
  const state = isPlaying ? 'pause' : 'play';
  const label = isPlaying ? '一時停止' : '再生';
  if (hero.play) {
    hero.play.dataset.state = state;
    hero.play.setAttribute('aria-label', label);
  }
  if (nowPlaying.play) {
    nowPlaying.play.dataset.state = state;
    nowPlaying.play.setAttribute('aria-label', label);
  }
};

const updateHeroPlaybackState = () => {
  if (!hero.container || !hero.play) return;
  const isPlaying = Boolean(currentlyPlaying && !currentlyPlaying.audio.paused);
  hero.container.dataset.state = isPlaying ? 'playing' : 'idle';
  updatePlayButtons(isPlaying);
};

const setSliderValue = (slider, ratio) => {
  if (!slider) return;
  if (slider.dataset && slider.dataset.seeking === 'true') {
    return;
  }
  slider.value = Number.isFinite(ratio) ? ratio : 0;
};

const syncHeroTime = (state) => {
  if (!activeTrack || state !== activeTrack) return;
  const { audio } = state;
  const currentFormatted = formatTime(audio.currentTime);
  const durationFormatted = formatTime(audio.duration);
  const ratio = (audio.currentTime / audio.duration) || 0;

  if (hero.current) hero.current.textContent = currentFormatted;
  if (hero.duration) hero.duration.textContent = durationFormatted;
  setSliderValue(hero.seek, ratio);

  if (nowPlaying.current) nowPlaying.current.textContent = currentFormatted;
  if (nowPlaying.duration) nowPlaying.duration.textContent = durationFormatted;
  setSliderValue(nowPlaying.seek, ratio);
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
  populateInsight(state);
  if (nowPlaying.cover) {
    nowPlaying.cover.src = state.track.cover;
    nowPlaying.cover.alt = `${state.track.title} カバーアート`;
  }
  if (nowPlaying.title) {
    nowPlaying.title.textContent = state.track.title;
  }
  if (nowPlaying.description) {
    nowPlaying.description.textContent = state.track.year ? `${state.track.year} · ${state.track.description}` : state.track.description;
  }
  if (nowPlaying.current) nowPlaying.current.textContent = '0:00';
  if (nowPlaying.duration) nowPlaying.duration.textContent = '0:00';
  if (nowPlaying.container) {
    nowPlaying.container.dataset.state = 'ready';
  }
  applyVolume(masterVolume);
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

const togglePlayback = () => {
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
  audio.volume = masterVolume;

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

const bindSeekControl = (slider) => {
  if (!slider) return;
  slider.dataset.seeking = 'false';
  const setSeeking = (flag) => {
    slider.dataset.seeking = flag ? 'true' : 'false';
  };

  slider.addEventListener('input', () => {
    if (!activeTrack || !Number.isFinite(activeTrack.audio.duration)) {
      return;
    }
    const nextTime = parseFloat(slider.value) * activeTrack.audio.duration;
    if (Number.isFinite(nextTime)) {
      activeTrack.audio.currentTime = nextTime;
      syncHeroTime(activeTrack);
    }
  });

  slider.addEventListener('pointerdown', () => setSeeking(true));
  slider.addEventListener('pointerup', () => setSeeking(false));
  slider.addEventListener('pointercancel', () => setSeeking(false));
  slider.addEventListener('mousedown', () => setSeeking(true));
  slider.addEventListener('mouseup', () => setSeeking(false));
  slider.addEventListener('touchstart', () => setSeeking(true), { passive: true });
  slider.addEventListener('touchend', () => setSeeking(false));
  slider.addEventListener('blur', () => setSeeking(false));
};

const attachControls = () => {
  hero.play?.addEventListener('click', togglePlayback);
  nowPlaying.play?.addEventListener('click', togglePlayback);

  bindSeekControl(hero.seek);
  bindSeekControl(nowPlaying.seek);

  hero.volume?.addEventListener('input', (event) => {
    applyVolume(parseFloat(event.target.value), event.target);
  });

  nowPlaying.volume?.addEventListener('input', (event) => {
    applyVolume(parseFloat(event.target.value), event.target);
  });

  insight.toggle?.addEventListener('click', () => {
    const expanded = insight.toggle.getAttribute('aria-expanded') === 'true';
    setInsightExpanded(!expanded);
  });
};

resetPulse();

if (trackList) {
  attachControls();
  updateVolumeUI();
  applyVolume(masterVolume);
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
