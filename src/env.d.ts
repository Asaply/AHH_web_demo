declare namespace App {
  interface Locals {
    user?: { email: string; name: string };
  }
}

// mp4box no publica tipos; videoScrub.ts lo usa de forma acotada.
declare module 'mp4box';
