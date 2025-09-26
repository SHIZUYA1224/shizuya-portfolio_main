const videoList = document.getElementById('video-list');

const createVideoCard = (video) => {
  const article = document.createElement('article');
  article.className = 'video-card';
  article.setAttribute('role', 'listitem');

  const placeholder = document.createElement('div');
  placeholder.className = 'lite-youtube';
  placeholder.dataset.videoId = video.id;
  placeholder.dataset.title = video.title;
  placeholder.dataset.thumbnail = video.thumbnail;
  placeholder.setAttribute('role', 'button');
  placeholder.setAttribute('tabindex', '0');
  placeholder.setAttribute('aria-label', `${video.title} を再生`);

  const img = document.createElement('img');
  img.alt = `${video.title} のプレビュー`;
  img.decoding = 'async';
  img.loading = 'lazy';
  placeholder.appendChild(img);

  const info = document.createElement('div');
  info.className = 'video-info';
  const title = document.createElement('h3');
  title.textContent = video.title;
  const description = document.createElement('p');
  description.textContent = video.description;
  const meta = document.createElement('p');
  meta.className = 'video-meta';
  meta.textContent = `${video.year} · ${video.duration}`;
  info.append(title, description, meta);

  article.append(placeholder, info);
  return { article, placeholder, img };
};

const hydrateThumbnail = (img, src) => {
  if (img.dataset.loaded === 'true') {
    return;
  }
  img.src = src;
  img.dataset.loaded = 'true';
};

const injectIframe = (placeholder) => {
  if (placeholder.dataset.embedded === 'true') {
    return;
  }
  const iframe = document.createElement('iframe');
  const params = new URLSearchParams({ autoplay: '1', rel: '0', modestbranding: '1' });
  iframe.src = `https://www.youtube-nocookie.com/embed/${placeholder.dataset.videoId}?${params.toString()}`;
  iframe.setAttribute('title', placeholder.dataset.title || 'YouTube video');
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
  iframe.setAttribute('allowfullscreen', '');
  iframe.loading = 'lazy';
  placeholder.innerHTML = '';
  placeholder.appendChild(iframe);
  placeholder.dataset.embedded = 'true';
};

const registerInteraction = (placeholder) => {
  placeholder.addEventListener('click', () => {
    injectIframe(placeholder);
  });
  placeholder.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      injectIframe(placeholder);
    }
  });
};

if (videoList) {
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const target = entry.target;
        const thumbnail = target.dataset.thumbnail;
        const img = target.querySelector('img');
        if (img && thumbnail) {
          hydrateThumbnail(img, thumbnail);
        }
        observer.unobserve(target);
      }
    });
  }, {
    rootMargin: '0px 0px 200px 0px',
  }) : null;

  fetch('data/videos.json')
    .then((response) => response.json())
    .then((videos) => {
      videos.forEach((video) => {
        const { article, placeholder, img } = createVideoCard(video);
        videoList.appendChild(article);
        registerInteraction(placeholder);
        if (observer) {
          observer.observe(placeholder);
        } else {
          hydrateThumbnail(img, video.thumbnail);
        }
      });
    })
    .catch((error) => {
      videoList.innerHTML = '<p>動画データを読み込めませんでした。</p>';
      console.error('Failed to load videos.json', error);
    });
}
