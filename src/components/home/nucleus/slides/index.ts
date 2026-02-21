import type { SlideModule } from '../types';
import { listeningSlide } from './listening';
import { watchingSlide } from './watching';
import { readingSlide } from './reading';
import { travelSlide } from './travel';
import { cyclingSlide } from './cycling';
import { writingSlide } from './writing';

export const slideModules: SlideModule[] = [
  listeningSlide,
  watchingSlide,
  readingSlide,
  travelSlide,
  cyclingSlide,
  writingSlide
];
