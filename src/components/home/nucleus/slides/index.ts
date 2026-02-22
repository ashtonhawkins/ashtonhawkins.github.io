import type { SlideModule } from '../types';
import { listeningSlide } from './listening';
import { watchingSlide } from './watching';
import { readingSlide } from './reading';
import { travelSlide } from './travel';
import { cyclingSlide } from './cycling';
import { writingSlide } from './writing';
import { biometricsSlide } from './biometrics';

export const slideModules: SlideModule[] = [
  listeningSlide,
  watchingSlide,
  readingSlide,
  travelSlide,
  cyclingSlide,
  writingSlide,
  biometricsSlide
];
