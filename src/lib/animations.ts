import gsap from 'gsap';

export function createFadeInTimeline(target: gsap.TweenTarget) {
  return gsap.timeline({ defaults: { duration: 0.4, ease: 'power2.out' } }).fromTo(
    target,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0 }
  );
}
