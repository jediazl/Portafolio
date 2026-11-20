/*
	Efectos futuristas del portafolio:
	partículas en el hero, texto tipeado, revelado al hacer scroll,
	tarjetas con spotlight/tilt, progreso de scroll y navegación activa.
*/

(function () {
	'use strict';

	var root = document.documentElement;
	var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

	root.classList.add('js-fx');

	function $(selector, scope) {
		return (scope || document).querySelector(selector);
	}

	function $$(selector, scope) {
		return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
	}

	function clamp(value, min, max) {
		return Math.min(Math.max(value, min), max);
	}


	// Capas decorativas.

	function initOverlays() {
		var scanlines = document.createElement('div');
		scanlines.className = 'fx-scanlines';
		scanlines.setAttribute('aria-hidden', 'true');
		document.body.appendChild(scanlines);

		if (!finePointer || reduceMotion) return;

		var glow = document.createElement('div');
		glow.className = 'fx-cursor';
		glow.setAttribute('aria-hidden', 'true');
		document.body.appendChild(glow);

		var target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
		var pos = { x: target.x, y: target.y };
		var rafId = null;

		function render() {
			pos.x += (target.x - pos.x) * 0.15;
			pos.y += (target.y - pos.y) * 0.15;
			glow.style.transform = 'translate3d(' + pos.x + 'px,' + pos.y + 'px,0)';

			if (Math.abs(target.x - pos.x) > 0.5 || Math.abs(target.y - pos.y) > 0.5)
				rafId = requestAnimationFrame(render);
			else
				rafId = null;
		}

		window.addEventListener('pointermove', function (e) {
			target.x = e.clientX;
			target.y = e.clientY;
			glow.classList.add('is-active');
			if (!rafId) rafId = requestAnimationFrame(render);
		}, { passive: true });

		document.addEventListener('pointerleave', function () {
			glow.classList.remove('is-active');
		});
	}


	// Red de partículas en el hero.

	function initParticles() {
		var canvas = $('#hero-canvas');
		if (!canvas || !canvas.getContext) return;

		var ctx = canvas.getContext('2d');
		var header = canvas.parentElement;
		var LINK_DISTANCE = 140;
		var MOUSE_DISTANCE = 180;
		var width = 0;
		var height = 0;
		var particles = [];
		var mouse = { x: -9999, y: -9999 };
		var visible = true;
		var rafId = null;

		function resize() {
			var dpr = Math.min(window.devicePixelRatio || 1, 2);
			width = header.clientWidth;
			height = header.clientHeight;
			canvas.width = width * dpr;
			canvas.height = height * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

			var count = clamp(Math.floor((width * height) / 14000), 25, 110);
			particles = [];

			for (var i = 0; i < count; i++) {
				particles.push({
					x: Math.random() * width,
					y: Math.random() * height,
					vx: (Math.random() - 0.5) * 0.45,
					vy: (Math.random() - 0.5) * 0.45,
					r: Math.random() * 1.6 + 0.6,
					violet: Math.random() < 0.25
				});
			}
		}

		function draw() {
			ctx.clearRect(0, 0, width, height);

			var i, j, p, q, dx, dy, dist;

			for (i = 0; i < particles.length; i++) {
				p = particles[i];

				if (!reduceMotion) {
					p.x += p.vx;
					p.y += p.vy;

					if (p.x < 0 || p.x > width) p.vx *= -1;
					if (p.y < 0 || p.y > height) p.vy *= -1;
				}

				for (j = i + 1; j < particles.length; j++) {
					q = particles[j];
					dx = p.x - q.x;
					dy = p.y - q.y;
					dist = dx * dx + dy * dy;

					if (dist < LINK_DISTANCE * LINK_DISTANCE) {
						ctx.strokeStyle = 'rgba(0, 229, 255,' + ((1 - Math.sqrt(dist) / LINK_DISTANCE) * 0.35) + ')';
						ctx.lineWidth = 1;
						ctx.beginPath();
						ctx.moveTo(p.x, p.y);
						ctx.lineTo(q.x, q.y);
						ctx.stroke();
					}
				}

				dx = p.x - mouse.x;
				dy = p.y - mouse.y;
				dist = Math.sqrt(dx * dx + dy * dy);

				if (dist < MOUSE_DISTANCE) {
					ctx.strokeStyle = 'rgba(124, 77, 255,' + ((1 - dist / MOUSE_DISTANCE) * 0.6) + ')';
					ctx.beginPath();
					ctx.moveTo(p.x, p.y);
					ctx.lineTo(mouse.x, mouse.y);
					ctx.stroke();
				}

				ctx.fillStyle = p.violet ? 'rgba(157, 125, 255, 0.9)' : 'rgba(0, 229, 255, 0.9)';
				ctx.beginPath();
				ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
				ctx.fill();
			}
		}

		function loop() {
			draw();
			rafId = visible && !document.hidden ? requestAnimationFrame(loop) : null;
		}

		function start() {
			if (reduceMotion) {
				draw();
				return;
			}
			if (!rafId) rafId = requestAnimationFrame(loop);
		}

		header.addEventListener('pointermove', function (e) {
			var rect = header.getBoundingClientRect();
			mouse.x = e.clientX - rect.left;
			mouse.y = e.clientY - rect.top;
		}, { passive: true });

		header.addEventListener('pointerleave', function () {
			mouse.x = -9999;
			mouse.y = -9999;
		});

		if ('IntersectionObserver' in window) {
			new IntersectionObserver(function (entries) {
				visible = entries[0].isIntersecting;
				if (visible) start();
			}).observe(header);
		}

		document.addEventListener('visibilitychange', function () {
			if (!document.hidden) start();
		});

		var resizeTimer;
		window.addEventListener('resize', function () {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(function () {
				resize();
				start();
			}, 150);
		});

		resize();
		start();
	}


	// Texto tipeado en el eyebrow.

	function initTyped() {
		var el = $('[data-typed]');
		if (!el || reduceMotion) return;

		var words;

		try {
			words = JSON.parse(el.getAttribute('data-typed'));
		} catch (err) {
			return;
		}

		if (!words || !words.length) return;

		var wordIndex = 0;
		var charIndex = words[0].length;
		var deleting = true;

		function tick() {
			var word = words[wordIndex];

			if (deleting) {
				charIndex--;
				el.textContent = word.slice(0, charIndex);

				if (charIndex <= 0) {
					deleting = false;
					wordIndex = (wordIndex + 1) % words.length;
					return setTimeout(tick, 350);
				}

				return setTimeout(tick, 28);
			}

			charIndex++;
			el.textContent = word.slice(0, charIndex);

			if (charIndex >= word.length) {
				deleting = true;
				return setTimeout(tick, 2200);
			}

			return setTimeout(tick, 60);
		}

		setTimeout(tick, 2800);
	}


	// Revelado al hacer scroll.

	function initReveal() {
		var selectors = [
			'.major',
			'.profile-grid > div',
			'.timeline-item',
			'.education-card',
			'.skill-card',
			'.project-card',
			'.competencies > div',
			'.contact-icons li',
			'#contact .actions'
		];

		var items = $$(selectors.join(','));

		$$('.hero-tags span').forEach(function (tag, index) {
			tag.style.setProperty('--i', index);
		});

		if (!('IntersectionObserver' in window) || reduceMotion) return;

		items.forEach(function (el) {
			var siblings = Array.prototype.indexOf.call(el.parentElement.children, el);
			el.style.setProperty('--reveal-delay', ((siblings % 4) * 90) + 'ms');
			el.classList.add('reveal');
		});

		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (!entry.isIntersecting) return;
				entry.target.classList.add('is-visible');
				observer.unobserve(entry.target);
			});
		}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

		items.forEach(function (el) {
			observer.observe(el);
		});
	}


	// Tarjetas con spotlight y tilt 3D.

	function initCards() {
		var cards = $$('.profile-card, .timeline-content, .education-card, .skill-card, .project-card, .competencies > div');
		var tiltable = '.education-card, .skill-card, .project-card';
		var MAX_TILT = 7;

		cards.forEach(function (card) {
			card.classList.add('fx-card');

			var canTilt = finePointer && !reduceMotion && card.matches(tiltable);
			if (canTilt) card.classList.add('fx-tilt');

			card.addEventListener('pointermove', function (e) {
				var rect = card.getBoundingClientRect();
				var x = e.clientX - rect.left;
				var y = e.clientY - rect.top;

				card.style.setProperty('--mx', x + 'px');
				card.style.setProperty('--my', y + 'px');

				if (!canTilt) return;

				var rotateX = (0.5 - y / rect.height) * MAX_TILT;
				var rotateY = (x / rect.width - 0.5) * MAX_TILT;

				card.classList.add('is-tilting');
				card.style.transform =
					'perspective(900px) rotateX(' + rotateX.toFixed(2) + 'deg) rotateY(' +
					rotateY.toFixed(2) + 'deg) translateY(-6px)';
			});

			card.addEventListener('pointerleave', function () {
				card.classList.remove('is-tilting');
				card.style.transform = '';
			});
		});
	}


	// Progreso de scroll, estado del nav y línea del timeline.

	function initScroll() {
		var progress = $('#scroll-progress');
		var nav = $('#nav');
		var timeline = $('.timeline');
		var ticking = false;

		function update() {
			var scrollTop = window.pageYOffset || root.scrollTop;
			var max = root.scrollHeight - window.innerHeight;

			if (progress) progress.style.setProperty('--scroll', max > 0 ? scrollTop / max : 0);
			if (nav) nav.classList.toggle('is-scrolled', scrollTop > 40);

			if (timeline) {
				var rect = timeline.getBoundingClientRect();
				var value = (window.innerHeight * 0.6 - rect.top) / rect.height;
				timeline.style.setProperty('--progress', clamp(value, 0, 1));
			}

			ticking = false;
		}

		window.addEventListener('scroll', function () {
			if (!ticking) {
				ticking = true;
				requestAnimationFrame(update);
			}
		}, { passive: true });

		window.addEventListener('resize', update);
		update();
	}


	// Enlace activo en la navegación.

	function initActiveNav() {
		var links = $$('.nav-links a[href^="#"]');
		if (!links.length || !('IntersectionObserver' in window)) return;

		var byId = {};

		links.forEach(function (link) {
			byId[link.getAttribute('href').slice(1)] = link;
		});

		var observer = new IntersectionObserver(function (entries) {
			entries.forEach(function (entry) {
				if (!entry.isIntersecting) return;

				links.forEach(function (link) {
					link.classList.remove('is-active');
				});

				var active = byId[entry.target.id];
				if (active) active.classList.add('is-active');
			});
		}, { rootMargin: '-45% 0px -50% 0px' });

		Object.keys(byId).concat('header').forEach(function (id) {
			var section = document.getElementById(id);
			if (section) observer.observe(section);
		});
	}


	initOverlays();
	initParticles();
	initTyped();
	initReveal();
	initCards();
	initScroll();
	initActiveNav();

})();
