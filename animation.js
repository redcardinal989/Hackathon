import { animate, stagger, splitText } from 'https://esm.sh/animejs';

const { chars } = splitText('h1', { words: false, chars: true });

animate(chars, {
  // Property keyframes
  y: [
    { to: '-7.75rem', ease: 'outExpo', duration: 2000 },
    { to: 0, ease: 'outBounce', duration: 800, delay: 100 }
  ],
  // Property specific parameters
  rotate: {
    from: '-1turn',
    delay: 0
  },
  delay: stagger(50),
  ease: 'inOutCirc',
});
