export type ModerationVerdict = { explicit: boolean; reason: string };

export type ModerationInput = {
  body?: string;
  imageDataUrl?: string;
  audioDataUrl?: string;
  audioFormat?: string;
};
